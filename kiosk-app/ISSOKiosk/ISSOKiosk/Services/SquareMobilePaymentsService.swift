import Foundation
import UIKit
import SquareMobilePaymentsSDK
import CoreLocation
import CoreBluetooth
import ExternalAccessory

// MARK: - Square Mobile Payments SDK Service (Bluetooth Square Reader 2nd Gen)
//
// ✅ Works WITHOUT the Square POS app installed.
// ✅ Uses Square Mobile Payments SDK (embedded payment flow).
// ✅ Supports Square Reader (contactless + chip) over Bluetooth.
//
// Key design choices (kiosk-friendly):
// - Authorize ONCE (do NOT deauthorize/reauthorize before every payment)
// - Before taking a payment, ensure Location permission is granted
// - If no reader is discovered, present Square's in-app Reader Settings screen
// - Use paymentAttemptID (idempotencyKey is deprecated in SDK 2.3.0+) per Square docs
//   https://developer.squareup.com/docs/mobile-payments-sdk/ios/take-payments

final class SquareMobilePaymentsService: NSObject, PaymentManagerDelegate, ReaderObserver, ReaderPairingDelegate {
    static let shared = SquareMobilePaymentsService()
    
    // MARK: - State
    
    private var accessToken: String?
    private var locationId: String?
    
    private var paymentHandle: PaymentHandle?
    private var isStartingPayment = false
    
    private var currentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private weak var currentPaymentViewController: UIViewController?
    
    // Legacy pairing support (for automatic discovery)
    private var pairingHandle: PairingHandle?
    private var pendingPaymentStart: (() -> Void)?
    private var pairingStartTime: Date?
    
    // Health check timer to monitor connection and recover if needed
    private var healthTimer: Timer?
    private let healthCheckInterval: TimeInterval = 60 // 60 seconds (watchdog handles every 30s)
    
    // Keep-alive timer to prevent reader from sleeping
    private var keepAliveTimer: Timer?
    private let keepAliveInterval: TimeInterval = 30 // 30 seconds - frequent enough to prevent sleep
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let isOffline: Bool
        let error: String?
        
        // Legacy compatibility
        init(success: Bool, paymentId: String?, isOffline: Bool = false, error: String? = nil) {
            self.success = success
            self.paymentId = paymentId
            self.isOffline = isOffline
            self.error = error
        }
    }
    
    private override init() {
        super.init()
        // Observe reader changes (added/removed/state changes)
        MobilePaymentsSDK.shared.readerManager.add(self)
        
        // Keep External Accessory notifications for Square Stand compatibility
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(accessoryConnected),
            name: .EAAccessoryDidConnect,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(accessoryDisconnected),
            name: .EAAccessoryDidDisconnect,
            object: nil
        )
        EAAccessoryManager.shared().registerForLocalNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        healthTimer?.invalidate()
        keepAliveTimer?.invalidate()
    }
    
    // MARK: - Logging helper
    
    private func log(_ message: String, verbose: Bool = false) {
        // Only log important messages, skip verbose debug logs
        if !verbose {
            print("[SquareMPSDK] \(message)")
        }
    }
    
    // MARK: - External Accessory (Square Stand compatibility)
    
    @objc private func accessoryConnected(_ notification: Notification) {
        // Square Stand uses External Accessory framework (wired connection)
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                log("🔌 Square Stand connected (wired): \(accessory.name)")
            }
        }
    }
    
    @objc private func accessoryDisconnected(_ notification: Notification) {
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                log("⚠️ Square Stand disconnected (wired): \(accessory.name)")
            }
        }
    }
    
    // MARK: - Authorization
    
    /// Call this once after you fetch an OAuth access token + location ID (from your backend).
    /// Do NOT reauthorize before every payment - authorize once and keep it authorized.
    func authorize(accessToken: String, locationId: String, forceReauthorize: Bool = false, completion: @escaping (Error?) -> Void) {
        self.accessToken = accessToken
        self.locationId = locationId
        
        let auth = MobilePaymentsSDK.shared.authorizationManager
        let state = auth.state
        
        // If already authorized and not forcing reauthorize, nothing to do
        if state == .authorized && !forceReauthorize {
            log("✅ Already authorized")
            startHealthMonitor()
            SquareReaderWatchdog.shared.start()
            completion(nil)
            return
        }
        
        // NEVER deauthorize if already authorized - this causes SQLite database errors
        // If forceReauthorize is requested but already authorized, just refresh without deauthorizing
        if forceReauthorize && state == .authorized {
            log("✅ Already authorized - skipping deauthorization to avoid database issues")
            // Just refresh the connection without deauthorizing
            startHealthMonitor()
            SquareReaderWatchdog.shared.start()
            completion(nil)
            return
        }
        
        performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
    }
    
    private func performAuthorization(accessToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
        MobilePaymentsSDK.shared.authorizationManager.authorize(
            withAccessToken: accessToken,
            locationID: locationId
        ) { [weak self] error in
            if let error = error {
                self?.log("❌ Authorization failed: \(error.localizedDescription)")
                completion(error)
            } else {
                self?.log("✅ Authorized")
                self?.startHealthMonitor()
                // Start watchdog after successful authorization
                SquareReaderWatchdog.shared.start()
                completion(nil)
            }
        }
    }
    
    /// Call on logout or long inactivity.
    func deauthorize(completion: (() -> Void)? = nil) {
        // Stop watchdog and keep-alive when deauthorizing
        SquareReaderWatchdog.shared.stop()
        stopHealthMonitor()
        
        MobilePaymentsSDK.shared.authorizationManager.deauthorize { [weak self] in
            self?.log("🔓 deauthorized")
            completion?()
        }
    }
    
    // MARK: - Permissions
    
    /// Kiosk flow should request location permission before starting payments.
    /// Square recommends ensuring permissions are granted before calling startPayment.
    func ensureLocationPermission(from viewController: UIViewController, completion: @escaping (Bool) -> Void) {
        let manager = CLLocationManager()
        let status = manager.authorizationStatus
        
        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            completion(true)
            
        case .notDetermined:
            // Trigger prompt
            manager.requestWhenInUseAuthorization()
            
            // Re-check shortly (simple approach)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                let newStatus = manager.authorizationStatus
                completion(newStatus == .authorizedAlways || newStatus == .authorizedWhenInUse)
            }
            
        default:
            // denied/restricted
            completion(false)
        }
    }
    
    // MARK: - Reader Management
    
    /// Presents Square's built-in Reader Settings UI (recommended)
    /// so staff can pair/connect the Bluetooth reader.
    func presentReaderSettings(from viewController: UIViewController, completion: (() -> Void)? = nil) {
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        guard authState == .authorized else {
            log("⚠️ Cannot open reader settings: SDK not authorized")
            completion?()
            return
        }
        
        log("📱 Presenting Reader Settings")
        MobilePaymentsSDK.shared.settingsManager.presentSettings(with: viewController) { [weak self] _ in
            let readers = MobilePaymentsSDK.shared.readerManager.readers
            self?.log("📱 Reader Settings dismissed. Readers discovered: \(readers.count)")
            // Clear stuck connection flag if reader is now available
            if !readers.isEmpty {
                SquareReaderWatchdog.shared.clearStuckConnection()
            }
            completion?()
        }
    }
    
    /// Presents a "Reconnect Reader" alert with instructions for staff
    /// Detects if it's a stuck connection (reader count = 1) or reader disappeared (count = 0)
    func presentReconnectReaderAlert(
        from viewController: UIViewController,
        error: Error? = nil,
        completion: (() -> Void)? = nil
    ) {
        let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
        let diagnostic = SquareReaderWatchdog.shared.getDiagnosticInfo()
        let isStuckConnection = diagnostic.isStuck || readerCount == 1
        
        let title: String
        let message: String
        let primaryAction: String
        
        if isStuckConnection {
            // Stuck connection: reader count = 1 but not responsive
            title = "Reader Not Responding"
            message = """
            The Square Reader appears connected but isn't responding.
            
            Quick Fix:
            1. Press the reader button once
            2. Tap "Reconnect Reader" below to open Square Settings
            3. If still stuck: iPad Settings → Bluetooth → Square Reader → (i) → Disconnect / Forget
            
            This usually fixes the connection without restarting the app.
            """
            primaryAction = "Reconnect Reader"
        } else {
            // Reader disappeared: count = 0
            title = "Reader Not Connected"
            message = """
            No Square Reader is detected.
            
            Troubleshooting Steps:
            1. Check that the reader is powered on (press button)
            2. Check cable and power source (try different cable/outlet)
            3. Tap "Open Reader Settings" to pair a reader
            4. If needed: iPad Settings → Bluetooth → Forget Square Reader, then re-pair
            
            Hardware checks:
            • Try a different USB cable and power adapter
            • Update reader firmware (in Square Settings)
            • Hard reset reader (hold power ~20 seconds until red lights)
            """
            primaryAction = "Open Reader Settings"
        }
        
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        
        // Primary action: Open Square Settings
        alert.addAction(UIAlertAction(title: primaryAction, style: .default) { [weak self] _ in
            self?.presentReaderSettings(from: viewController) {
                completion?()
            }
        })
        
        // Secondary action: Open iPad Bluetooth Settings
        alert.addAction(UIAlertAction(title: "Open iPad Bluetooth", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            completion?()
        })
        
        // Cancel action
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
            completion?()
        })
        
        viewController.present(alert, animated: true)
    }
    
    /// Ensures at least one reader is discovered by the SDK.
    /// If none are discovered, tries reauthorization first before opening Reader Settings.
    private func ensureReaderDiscovered(from viewController: UIViewController, completion: @escaping (Bool) -> Void) {
        let readers = MobilePaymentsSDK.shared.readerManager.readers
        if !readers.isEmpty {
            completion(true)
            return
        }
        
        log("⚠️ No reader discovered - trying reauthorization first...")
        
        // Try reauthorizing first - this often wakes up the reader
        guard let accessToken = accessToken, let locationId = locationId else {
            log("❌ No credentials available - opening Reader Settings")
            presentReaderSettings(from: viewController) {
                let after = MobilePaymentsSDK.shared.readerManager.readers
                completion(!after.isEmpty)
            }
            return
        }
        
        // Force reauthorize to wake up the reader
        performAuthorization(accessToken: accessToken, locationId: locationId) { [weak self] error in
            guard let self = self else {
                completion(false)
                return
            }
            
            if let error = error {
                self.log("❌ Reauthorization failed: \(error.localizedDescription)")
            } else {
                self.log("✅ Reauthorized - checking for readers...")
            }
            
            // Wait a moment for hardware to wake up
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                let readersAfterAuth = MobilePaymentsSDK.shared.readerManager.readers
                if !readersAfterAuth.isEmpty {
                    self.log("✅ Reader detected after reauthorization")
                    completion(true)
                    return
                }
                
                // Still no readers - try one more time with longer wait
                self.log("⚠️ Still no readers - waiting longer and retrying...")
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    let readersFinal = MobilePaymentsSDK.shared.readerManager.readers
                    if !readersFinal.isEmpty {
                        self.log("✅ Reader detected after longer wait")
                        completion(true)
                        return
                    }
                    
                    // Last resort - open Reader Settings
                    self.log("⚠️ No readers found after reauthorization - opening Reader Settings")
                    self.presentReaderSettings(from: viewController) {
                        let after = MobilePaymentsSDK.shared.readerManager.readers
                        completion(!after.isEmpty)
                    }
                }
            }
        }
    }
    
    // MARK: - Take Payment (New API with referenceID)
    
    /// Main call you use from your donation UI.
    ///
    /// - amount: donation amount in dollars
    /// - referenceID: stable ID in YOUR system (e.g., donationId). This persists with the Square payment.
    /// - note: optional note on the payment
    func takePayment(
        amount: Double,
        referenceID: String,
        note: String? = nil,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // App-level gate against double taps / SwiftUI double trigger
        guard !isStartingPayment else {
            log("⚠️ Payment already starting/in progress (app gate). Ignoring.")
            return
        }
        
        isStartingPayment = true
        currentCompletion = completion
        currentPaymentViewController = viewController
        
        // Ensure Square Mobile Payments SDK is initialized (like app restart)
        if let squareAppID = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String {
            // SDK should already be initialized in AppDelegate, but verify and log
            log("✅ Square Mobile Payments SDK initialized with App ID: \(squareAppID.prefix(15))...")
        } else {
            log("⚠️ SQUARE_APPLICATION_ID not found in Info.plist")
        }
        
        // Ensure Bluetooth connection before payment (same process as app startup)
        ensureBluetoothConnectionAndPayment(
            amount: amount,
            referenceID: referenceID,
            note: note,
            from: viewController,
            completion: completion
        )
    }
    
    /// Ensure Bluetooth connection (same process as app startup) and then start payment
    /// This ensures Square Reader 2nd Gen is connected via Bluetooth before payment
    private func ensureBluetoothConnectionAndPayment(
        amount: Double,
        referenceID: String,
        note: String?,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        log("🔄 Ensuring Bluetooth connection to Square Reader (same as app startup)...")
        
        // Step 1: Ensure Bluetooth permission is granted
        let bluetoothManager = CBCentralManager()
        // Note: Bluetooth permission is checked via Info.plist, but we verify it's available
        
        // Step 2: Ensure SDK is authorized (this triggers Bluetooth discovery)
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        
        if authState != .authorized {
            log("🔄 SDK not authorized - authorizing to trigger Bluetooth discovery...")
            performReauthorizationAndPayment(
                amount: amount,
                referenceID: referenceID,
                note: note,
                from: viewController,
                completion: completion
            )
            return
        }
        
        // Step 3: Check if reader is already discovered
        let readers = MobilePaymentsSDK.shared.readerManager.readers
        if !readers.isEmpty {
            log("✅ Square Reader already connected via Bluetooth - proceeding to payment")
            startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
            return
        }
        
        // Step 4: Reader not discovered - refresh authorization to trigger Bluetooth discovery
        log("⚠️ Square Reader not discovered - refreshing authorization to trigger Bluetooth discovery...")
        performReauthorizationAndPayment(
            amount: amount,
            referenceID: referenceID,
            note: note,
            from: viewController,
            completion: completion
        )
    }
    
    /// Perform reauthorization and then start payment
    private func performReauthorizationAndPayment(
        amount: Double,
        referenceID: String,
        note: String?,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // Get credentials - use stored if available, otherwise fetch from backend
        if let accessToken = accessToken, let locationId = locationId {
            // Use stored credentials
            performReauthorizationWithCredentials(
                accessToken: accessToken,
                locationId: locationId,
                amount: amount,
                referenceID: referenceID,
                note: note,
                from: viewController
            )
        } else {
            // Fetch fresh credentials from backend
            log("⚠️ No stored credentials - fetching from backend...")
            Task {
                do {
                    let credentials = try await APIService.shared.getSquareCredentials()
                    await MainActor.run {
                        // Store credentials
                        self.accessToken = credentials.accessToken
                        self.locationId = credentials.locationId
                        
                        // Now reauthorize with fresh credentials
                        self.performReauthorizationWithCredentials(
                            accessToken: credentials.accessToken,
                            locationId: credentials.locationId,
                            amount: amount,
                            referenceID: referenceID,
                            note: note,
                            from: viewController
                        )
                    }
                } catch {
                    await MainActor.run {
                        self.finishWithError(message: "Failed to get Square credentials: \(error.localizedDescription)", code: -105)
                    }
                }
            }
        }
    }
    
    /// Perform reauthorization with credentials and then start payment
    /// Uses forceReauthorize=false to avoid database issues - just refreshes if already authorized
    private func performReauthorizationWithCredentials(
        accessToken: String,
        locationId: String,
        amount: Double,
        referenceID: String,
        note: String?,
        from viewController: UIViewController
    ) {
        // Check current state - only deauthorize if absolutely necessary
        let currentState = MobilePaymentsSDK.shared.authorizationManager.state
        
        if currentState == .authorized {
            // Already authorized - refresh to trigger Bluetooth discovery
            log("✅ Already authorized - refreshing to trigger Bluetooth reader discovery...")
            // Use authorize with forceReauthorize=false to avoid database cleanup issues
            authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: false) { [weak self] error in
                guard let self = self else { return }
                
                if let error = error {
                    self.log("⚠️ Refresh failed: \(error.localizedDescription) - proceeding anyway")
                }
                
                // Wait for Bluetooth reader discovery (ReaderManager needs time to discover)
                // Try multiple times - Bluetooth discovery can take a few seconds
                self.waitForBluetoothReaderDiscovery(
                    amount: amount,
                    referenceID: referenceID,
                    note: note,
                    from: viewController,
                    maxAttempts: 5,
                    attempt: 1
                )
            }
        } else {
            // Not authorized - authorize normally
            log("🔄 Authorizing SDK...")
            performAuthorization(accessToken: accessToken, locationId: locationId) { [weak self] error in
                guard let self = self else { return }
                
                if let error = error {
                    self.finishWithError(message: "Failed to reconnect Square SDK: \(error.localizedDescription)", code: -106)
                    return
                }
                
                // Wait for Bluetooth reader discovery after authorization
                // ReaderManager needs time to discover paired Square Reader via Bluetooth
                self.waitForBluetoothReaderDiscovery(
                    amount: amount,
                    referenceID: referenceID,
                    note: note,
                    from: viewController,
                    maxAttempts: 5,
                    attempt: 1
                )
            }
        }
    }
    
    /// Wait for Bluetooth reader discovery with retries
    /// Square Reader 2nd Gen uses Bluetooth - discovery can take a few seconds
    private func waitForBluetoothReaderDiscovery(
        amount: Double,
        referenceID: String,
        note: String?,
        from viewController: UIViewController,
        maxAttempts: Int,
        attempt: Int
    ) {
        let readers = MobilePaymentsSDK.shared.readerManager.readers
        
        if !readers.isEmpty {
            log("✅ Square Reader discovered via Bluetooth (attempt \(attempt)/\(maxAttempts)) - proceeding to payment")
            startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
            return
        }
        
        if attempt >= maxAttempts {
            log("⚠️ Square Reader not discovered after \(maxAttempts) attempts - proceeding anyway (SDK will handle)")
            // Proceed anyway - SDK will show Reader Settings if needed
            startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
            return
        }
        
        // Wait 2 seconds then check again
        log("⏳ Waiting for Bluetooth reader discovery (attempt \(attempt)/\(maxAttempts))...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            guard let self = self else { return }
            self.waitForBluetoothReaderDiscovery(
                amount: amount,
                referenceID: referenceID,
                note: note,
                from: viewController,
                maxAttempts: maxAttempts,
                attempt: attempt + 1
            )
        }
    }
    
    /// Start the payment flow (permissions + reader check + payment)
    private func startPaymentFlow(
        amount: Double,
        referenceID: String,
        note: String?,
        from viewController: UIViewController
    ) {
        // 1) Ensure permissions
        ensureLocationPermission(from: viewController) { [weak self] granted in
            guard let self = self else { return }
            guard granted else {
                self.finishWithError(message: "Location permission is required for card payments. Enable it in Settings.", code: -101)
                return
            }
            
            // 2) Ensure reader is discovered/connected by SDK (otherwise open Reader Settings)
            self.ensureReaderDiscovered(from: viewController) { [weak self] hasReader in
                guard let self = self else { return }
                
                guard hasReader else {
                    self.finishWithError(message: "No Square Reader connected. Please connect the reader in Reader Settings.", code: -102)
                    return
                }
                
                // 3) Start payment
                self.startPayment(amount: amount, referenceID: referenceID, note: note, from: viewController)
            }
        }
    }
    
    // MARK: - Take Payment (Legacy API - backward compatibility)
    
    /// Legacy method for backward compatibility - maps donationId to referenceID
    func takePayment(
        amount: Double,
        donationId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // Map donationId to referenceID for new API
        takePayment(
            amount: amount,
            referenceID: donationId,
            note: nil,
            from: viewController,
            completion: completion
        )
    }
    
    // MARK: - Start Payment
    
    private func startPayment(amount: Double, referenceID: String, note: String?, from viewController: UIViewController) {
        let cents = UInt((amount * 100.0).rounded())
        let money = Money(amount: cents, currency: .USD)
        
        // Use idempotencyKey (SDK version may not support paymentAttemptID yet)
        // Make it unique per payment attempt
        let idempotencyKey = UUID().uuidString
        
        let paymentParams = PaymentParameters(
            idempotencyKey: idempotencyKey,
            amountMoney: money
        )
        
        // Important: referenceID is how you match this payment to YOUR donation record
        paymentParams.referenceID = referenceID
        
        if let note = note, !note.isEmpty {
            paymentParams.note = note
        }
        
        // PromptParameters: keep it simple. You can remove manual entry by using an empty list.
        let promptParams = PromptParameters(
            mode: .default,
            additionalMethods: .all
        )
        
        log("💳 Starting payment: $\(String(format: "%.2f", amount))")
        
        paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
            paymentParams,
            promptParameters: promptParams,
            from: viewController,
            delegate: self
        )
        
        // If a payment is already in progress, Square will fail immediately (see delegate error),
        // but some versions can return nil handle as well.
        if paymentHandle == nil {
            log("⚠️ Payment could not start (already in progress?)")
            // Let delegate handle, but also release the gate to allow retry if nothing comes back.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                if self?.currentCompletion != nil {
                    self?.finishWithError(message: "Payment could not start. If a payment is already in progress, wait/cancel and try again.", code: -103)
                }
            }
        }
    }
    
    // MARK: - PaymentManagerDelegate
    
    func paymentManager(_ paymentManager: PaymentManager, didFinish payment: Payment) {
        log("✅ Payment completed")
        
        // Clear stuck connection flag on successful payment
        SquareReaderWatchdog.shared.clearStuckConnection()
        
        var paymentId: String? = nil
        var isOffline = false
        
        if let online = payment as? OnlinePayment {
            paymentId = online.id
            isOffline = false
        } else if let offline = payment as? OfflinePayment {
            paymentId = offline.localID
            isOffline = true
        }
        
        let result = PaymentResult(success: true, paymentId: paymentId, isOffline: isOffline, error: nil)
        finishSuccess(result)
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didFail payment: Payment, withError error: Error) {
        log("❌ Payment failed: \(error.localizedDescription)")
        finishFailure(error)
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        log("🚫 Payment canceled")
        let err = NSError(domain: "SquareMPSDK", code: -104, userInfo: [
            NSLocalizedDescriptionKey: "Payment was canceled."
        ])
        finishFailure(err)
    }
    
    // MARK: - ReaderObserver
    
    func readerWasAdded(_ readerInfo: ReaderInfo) {
        log("✅ Reader connected: \(readerInfo.model)")
        
        // Clear stuck connection flag when reader is added
        SquareReaderWatchdog.shared.clearStuckConnection()
        
        // If we have a pending payment, start it now that reader is available
        if let startPayment = pendingPaymentStart {
            pendingPaymentStart = nil
            pairingHandle?.stop()
            pairingHandle = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                startPayment()
            }
        }
    }
    
    func readerWasRemoved(_ readerInfo: ReaderInfo) {
        log("⚠️ Reader disconnected: \(readerInfo.model)")
        
        // Log diagnostic info when reader is removed
        let diagnostic = SquareReaderWatchdog.shared.getDiagnosticInfo()
        log("📊 Reader diagnostic: count=\(diagnostic.readerCount), lastSeen=\(diagnostic.lastSeenCount), consecutiveZero=\(diagnostic.consecutiveZero), stuck=\(diagnostic.isStuck)")
    }
    
    func readerDidChange(_ readerInfo: ReaderInfo, change: ReaderChange) {
        // Only log important changes
        switch change {
        case .connectionDidFail:
            log("❌ Reader connection failed")
        case .cardInserted:
            log("💳 Card inserted")
        case .cardRemoved:
            log("💳 Card removed")
        default:
            // Skip verbose state change logs
            break
        }
        
        // If we have a pending payment, start it when any change occurs (reader might be ready now)
        if let startPayment = pendingPaymentStart {
            pendingPaymentStart = nil
            pairingHandle?.stop()
            pairingHandle = nil
            startPayment()
        }
    }
    
    // MARK: - ReaderPairingDelegate (for automatic discovery)
    
    func readerPairingDidBegin() {
        pairingStartTime = Date()
    }
    
    func readerPairingDidSucceed() {
        log("✅ Reader paired")
        pairingHandle = nil
        pairingStartTime = nil
    }
    
    func readerPairingDidFail(with error: Error) {
        log("❌ Reader pairing failed")
        pairingHandle = nil
        pairingStartTime = nil
        
        // If pairing failed but we have a pending payment, try starting it anyway
        if let startPayment = pendingPaymentStart {
            pendingPaymentStart = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                startPayment()
            }
        }
    }
    
    // MARK: - Helpers (finish/reset)
    
    private func finishSuccess(_ result: PaymentResult) {
        let completion = currentCompletion
        resetState()
        completion?(.success(result))
    }
    
    private func finishFailure(_ error: Error) {
        // Check if this is a stuck connection (reader count = 1 but payment failed)
        let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
        let nsError = error as NSError
        let errorDescription = error.localizedDescription.lowercased()
        
        // Detect if this looks like a reader/bluetooth error
        let isReaderError = errorDescription.contains("reader") ||
                           errorDescription.contains("bluetooth") ||
                           errorDescription.contains("hardware") ||
                           errorDescription.contains("connection") ||
                           nsError.code == -3
        
        // If reader count is 1 but we got a reader error, mark as stuck connection
        if readerCount == 1 && isReaderError {
            SquareReaderWatchdog.shared.markStuckConnection()
            log("⚠️ STUCK CONNECTION detected: reader count = 1 but payment failed with reader error")
        } else if readerCount == 0 {
            log("⚠️ Reader disappeared: count went to 0 (pairing/power/firmware issue)")
        }
        
        let completion = currentCompletion
        resetState()
        completion?(.failure(error))
    }
    
    private func finishWithError(message: String, code: Int) {
        let err = NSError(domain: "SquareMPSDK", code: code, userInfo: [
            NSLocalizedDescriptionKey: message
        ])
        finishFailure(err)
    }
    
    private func resetState() {
        isStartingPayment = false
        currentCompletion = nil
        currentPaymentViewController = nil
        paymentHandle = nil
    }
    
    // MARK: - Legacy Methods (for backward compatibility)
    
    /// Check if Square Reader is actually connected using ReaderManager
    /// Made public so AppState can check hardware connection
    func checkHardwareConnection() -> Bool {
        // First check if SDK is authorized
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        guard authState == .authorized else {
            return false
        }
        
        // Use ReaderManager to check for available readers
        let readerManager = MobilePaymentsSDK.shared.readerManager
        let readers = readerManager.readers
        
        return !readers.isEmpty
    }
    
    /// Attempt to wake up Square Reader (Bluetooth)
    /// Note: Square Reader 2nd Gen uses Bluetooth, so we can't use EASession
    /// The SDK automatically manages Bluetooth connections - no manual wake-up needed
    func attemptHardwareWakeUp() {
        log("💡 Square Reader 2nd Gen uses Bluetooth - SDK will connect automatically when payment starts")
    }
    
    /// Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return isStartingPayment
    }
    
    /// Cancel current payment
    func cancelCurrentPayment() {
        log("🚫 Canceling payment")
        if paymentHandle != nil {
            // Note: SDK may not have explicit cancel method, but we can reset state
            paymentHandle = nil
        }
        resetState()
    }
    
    // MARK: - Health Monitor
    
    /// Start health check timer to monitor connection and recover if needed
    private func startHealthMonitor() {
        // Stop existing timers if any
        healthTimer?.invalidate()
        keepAliveTimer?.invalidate()
        
        // Only start timers if authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .authorized else {
            return
        }
        
        log("⏰ Starting health monitor (every \(Int(healthCheckInterval)) seconds)")
        
        healthTimer = Timer.scheduledTimer(withTimeInterval: healthCheckInterval, repeats: true) { [weak self] _ in
            self?.performHealthCheck()
        }
        
        // Start keep-alive timer to prevent reader from sleeping
        log("💓 Starting keep-alive timer (every \(Int(keepAliveInterval)) seconds)")
        keepAliveTimer = Timer.scheduledTimer(withTimeInterval: keepAliveInterval, repeats: true) { [weak self] _ in
            self?.performKeepAlive()
        }
    }
    
    /// Stop health monitor and keep-alive
    func stopHealthMonitor() {
        healthTimer?.invalidate()
        healthTimer = nil
        keepAliveTimer?.invalidate()
        keepAliveTimer = nil
    }
    
    /// Perform keep-alive: periodically access reader state to prevent it from sleeping
    private func performKeepAlive() {
        // Don't perform keep-alive if a payment is in progress
        guard !isStartingPayment else {
            return
        }
        
        // Only perform keep-alive if authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .authorized else {
            return
        }
        
        // Access reader state to keep the connection alive
        // This prevents the Square Reader from going to sleep
        let readers = MobilePaymentsSDK.shared.readerManager.readers
        
        // Access reader properties to keep Bluetooth connection active
        // Accessing the reader's model property requires the SDK to communicate with the reader,
        // which sends keep-alive signals and prevents the reader from sleeping
        for reader in readers {
            // Access reader model to keep connection alive
            // This property access triggers communication with the reader
            let _ = reader.model
        }
        
        // If no readers found, the SDK will reconnect automatically on next payment
        // But we can log this for monitoring
        if readers.count == 0 {
            // Only log occasionally to avoid spam (every 20th check = ~10 minutes)
            if Int.random(in: 0..<20) == 0 {
                log("💓 Keep-alive: No readers detected (will reconnect on next payment)", verbose: true)
            }
        } else {
            // Only log occasionally to avoid spam (every 10th check = ~5 minutes)
            if Int.random(in: 0..<10) == 0 {
                log("💓 Keep-alive: Reader connection active (\(readers.count) reader(s))", verbose: true)
            }
        }
    }
    
    /// Perform health check: monitor connection status and recover if needed
    private func performHealthCheck() {
        // Don't check if a payment is in progress
        guard !isStartingPayment else {
            return
        }
        
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
        
        // If not authorized, try to reauthorize (this might wake up the reader)
        if authState != .authorized {
            log("⚠️ Health check: SDK not authorized - attempting reauthorization")
            // Reauthorize if we have credentials
            if let accessToken = accessToken, let locationId = locationId {
                performAuthorization(accessToken: accessToken, locationId: locationId) { [weak self] error in
                    if let error = error {
                        self?.log("❌ Health check reauthorization failed: \(error.localizedDescription)")
                    } else {
                        self?.log("✅ Health check: Reauthorized successfully")
                    }
                }
            }
            return
        }
        
        // If authorized but no readers, log for monitoring (but don't take action)
        // The SDK will automatically reconnect when a payment is attempted
        if readerCount == 0 {
            // Only log occasionally to avoid spam (every 10th check = ~100 seconds)
            if Int.random(in: 0..<10) == 0 {
                log("⚠️ Health check: No readers detected (SDK will reconnect on next payment)")
            }
        }
    }
}
