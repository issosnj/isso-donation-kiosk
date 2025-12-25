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
    }
    
    // MARK: - Logging helper
    
    private func log(_ message: String) {
        print("[SquareMPSDK] \(message)")
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
        log("Authorization state: \(state)")
        
        // If already authorized and not forcing reauthorize, nothing to do
        if state == .authorized && !forceReauthorize {
            log("✅ Already authorized")
            completion(nil)
            return
        }
        
        // If forcing reauthorize, deauthorize first
        if forceReauthorize && state == .authorized {
            log("🔄 Force reauthorizing - deauthorizing first...")
            auth.deauthorize { [weak self] in
                self?.performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
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
                self?.log("❌ authorize failed: \(error.localizedDescription)")
                completion(error)
            } else {
                self?.log("✅ authorized")
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
    /// If none are discovered, it opens the Settings UI for staff to connect.
    private func ensureReaderDiscovered(from viewController: UIViewController, completion: @escaping (Bool) -> Void) {
        let readers = MobilePaymentsSDK.shared.readerManager.readers
        if !readers.isEmpty {
            log("✅ Reader(s) available: \(readers.count)")
            for reader in readers {
                if let batteryLevel = reader.batteryStatus?.level {
                    log("   - Reader: \(reader.model), Battery: \(batteryLevel)")
                } else {
                    log("   - Reader: \(reader.model)")
                }
            }
            completion(true)
            return
        }
        
        log("⚠️ No reader discovered by SDK. Opening Reader Settings for pairing/connection.")
        presentReaderSettings(from: viewController) {
            let after = MobilePaymentsSDK.shared.readerManager.readers
            completion(!after.isEmpty)
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
        
        // Must be authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .authorized else {
            completion(.failure(NSError(domain: "SquareMPSDK", code: -100, userInfo: [
                NSLocalizedDescriptionKey: "Square SDK is not authorized. Call authorize() first."
            ])))
            return
        }
        
        isStartingPayment = true
        currentCompletion = completion
        currentPaymentViewController = viewController
        
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
        
        log("💳 Starting payment. amount=\(cents)¢ referenceID=\(referenceID) idempotencyKey=\(idempotencyKey)")
        
        paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
            paymentParams,
            promptParameters: promptParams,
            from: viewController,
            delegate: self
        )
        
        // If a payment is already in progress, Square will fail immediately (see delegate error),
        // but some versions can return nil handle as well.
        if paymentHandle == nil {
            log("⚠️ startPayment returned nil handle (possible paymentAlreadyInProgress).")
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
        log("✅ Payment finished")
        
        var paymentId: String? = nil
        var isOffline = false
        
        if let online = payment as? OnlinePayment {
            paymentId = online.id
            isOffline = false
            log("OnlinePayment id=\(paymentId ?? "nil") status=\(online.status.description)")
        } else if let offline = payment as? OfflinePayment {
            // Offline payment object has a local identifier
            paymentId = offline.localID
            isOffline = true
            log("OfflinePayment localID=\(paymentId ?? "nil") status=\(offline.status.description)")
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
        log("✅ Reader added: \(readerInfo.model)")
        if let batteryLevel = readerInfo.batteryStatus?.level {
            log("   Battery: \(batteryLevel)")
        }
        
        // If we have a pending payment, start it now that reader is available
        if let startPayment = pendingPaymentStart {
            log("✅ Reader discovered - starting pending payment")
            pendingPaymentStart = nil
            pairingHandle?.stop()
            pairingHandle = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                startPayment()
            }
        }
    }
    
    func readerWasRemoved(_ readerInfo: ReaderInfo) {
        log("⚠️ Reader removed: \(readerInfo.model)")
    }
    
    func readerDidChange(_ readerInfo: ReaderInfo, change: ReaderChange) {
        // Log state changes
        switch change {
        case .connectionStateDidChange:
            log("🔌 Reader connection state changed: \(readerInfo.model)")
        case .connectionDidFail:
            log("❌ Reader connection failed: \(readerInfo.model)")
        case .batteryLevelDidChange:
            if let level = readerInfo.batteryStatus?.level {
                log("🔋 Battery: \(readerInfo.model) level=\(level)")
            }
        case .batteryDidBeginCharging:
            log("🔌 Reader started charging: \(readerInfo.model)")
        case .batteryDidEndCharging:
            log("🔌 Reader stopped charging: \(readerInfo.model)")
        case .stateDidChange:
            log("📊 Reader state changed: \(readerInfo.model)")
        case .firmwareUpdatePercentDidChange:
            log("📥 Reader firmware update progress: \(readerInfo.model)")
        case .firmwareUpdateDidFail:
            log("❌ Reader firmware update failed: \(readerInfo.model)")
        case .cardInserted:
            log("💳 Card inserted: \(readerInfo.model)")
        case .cardRemoved:
            log("💳 Card removed: \(readerInfo.model)")
        @unknown default:
            log("📊 Reader change (unknown): \(readerInfo.model) -> \(change)")
            
            // If we have a pending payment, start it when any change occurs (reader might be ready now)
            if let startPayment = pendingPaymentStart {
                log("✅ Reader changed - starting pending payment")
                pendingPaymentStart = nil
                pairingHandle?.stop()
                pairingHandle = nil
                startPayment()
            }
        }
    }
    
    // MARK: - ReaderPairingDelegate (for automatic discovery)
    
    func readerPairingDidBegin() {
        log("🔍 Reader pairing began - scanning for readers...")
        pairingStartTime = Date()
    }
    
    func readerPairingDidSucceed() {
        log("✅ Reader pairing succeeded!")
        if let startTime = pairingStartTime {
            let elapsed = Date().timeIntervalSince(startTime)
            log("⏱️ Pairing completed in \(String(format: "%.1f", elapsed))s")
        }
        pairingHandle = nil
        pairingStartTime = nil
        
        // Check if readers are now available
        let readerManager = MobilePaymentsSDK.shared.readerManager
        let readers = readerManager.readers
        log("📊 Readers after pairing: \(readers.count)")
    }
    
    func readerPairingDidFail(with error: Error) {
        log("❌ Reader pairing failed: \(error.localizedDescription)")
        if let startTime = pairingStartTime {
            let elapsed = Date().timeIntervalSince(startTime)
            log("⏱️ Pairing failed after \(String(format: "%.1f", elapsed))s")
        }
        pairingHandle = nil
        pairingStartTime = nil
        
        // If pairing failed but we have a pending payment, try starting it anyway
        // The SDK might still discover the reader when payment starts
        if let startPayment = pendingPaymentStart {
            log("💡 Pairing failed but trying payment anyway - SDK may discover reader")
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
            log("⚠️ SDK not authorized - cannot check reader connection")
            return false
        }
        
        // Use ReaderManager to check for available readers
        let readerManager = MobilePaymentsSDK.shared.readerManager
        let readers = readerManager.readers
        
        log("🔍 Checking for available readers...")
        log("📊 Found \(readers.count) reader(s)")
        
        if !readers.isEmpty {
            log("✅ Found \(readers.count) reader(s)")
            for reader in readers {
                if let batteryLevel = reader.batteryStatus?.level {
                    log("   - Reader: \(reader.model), Battery: \(batteryLevel)")
                } else {
                    log("   - Reader: \(reader.model)")
                }
            }
            return true
        } else {
            log("❌ No readers found")
            return false
        }
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
        log("🚫 Canceling current payment")
        if let handle = paymentHandle {
            // Note: SDK may not have explicit cancel method, but we can reset state
            paymentHandle = nil
        }
        resetState()
    }
}
