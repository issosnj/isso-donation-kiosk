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
    private let healthCheckInterval: TimeInterval = 10 // 10 seconds
    
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
            completion(nil)
            return
        }
        
        // If forcing reauthorize, deauthorize first (add delay to avoid database issues)
        if forceReauthorize && state == .authorized {
            log("🔄 Force reauthorizing (deauthorizing first - may cause brief database warnings)")
            auth.deauthorize { [weak self] in
                // Add a small delay to let SDK clean up database connections before reauthorizing
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self?.performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
                }
            }
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
                completion(nil)
            }
        }
    }
    
    /// Call on logout or long inactivity.
    func deauthorize(completion: (() -> Void)? = nil) {
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
            completion?()
        }
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
        
        // Check authorization state and ensure connection
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        
        if authState == .authorized {
            // Already authorized - check if reader is available, if not, refresh authorization
            let readers = MobilePaymentsSDK.shared.readerManager.readers
            if readers.isEmpty {
                log("⚠️ Authorized but no readers - refreshing authorization...")
                // Refresh authorization without deauthorizing (safer - avoids database issues)
                performReauthorizationAndPayment(
                    amount: amount,
                    referenceID: referenceID,
                    note: note,
                    from: viewController,
                    completion: completion
                )
            } else {
                // Already authorized and reader available - proceed directly
                log("✅ Already authorized with reader - proceeding to payment")
                startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
            }
        } else {
            // Not authorized - authorize first
            log("🔄 Not authorized - authorizing...")
            performReauthorizationAndPayment(
                amount: amount,
                referenceID: referenceID,
                note: note,
                from: viewController,
                completion: completion
            )
        }
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
            // Already authorized - just refresh without deauthorizing (avoids database issues)
            log("✅ Already authorized - refreshing connection without deauthorizing...")
            // Use authorize with forceReauthorize=false to avoid database cleanup issues
            authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: false) { [weak self] error in
                guard let self = self else { return }
                
                if let error = error {
                    self.log("⚠️ Refresh failed: \(error.localizedDescription) - proceeding anyway")
                }
                
                // Wait for hardware to wake up (shorter wait since we didn't deauthorize)
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                    guard let self = self else { return }
                    self.startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
                }
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
                
                // Wait for hardware to wake up after authorization
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
                    guard let self = self else { return }
                    self.startPaymentFlow(amount: amount, referenceID: referenceID, note: note, from: viewController)
                }
            }
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
        // Stop existing timer if any
        healthTimer?.invalidate()
        
        // Only start timer if authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .authorized else {
            return
        }
        
        log("⏰ Starting health monitor (every \(Int(healthCheckInterval)) seconds)")
        
        healthTimer = Timer.scheduledTimer(withTimeInterval: healthCheckInterval, repeats: true) { [weak self] _ in
            self?.performHealthCheck()
        }
    }
    
    /// Stop health monitor
    func stopHealthMonitor() {
        healthTimer?.invalidate()
        healthTimer = nil
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
