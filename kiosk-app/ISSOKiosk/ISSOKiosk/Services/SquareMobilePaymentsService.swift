import Foundation
import UIKit
import SquareMobilePaymentsSDK
import CoreLocation
import CoreBluetooth
import ExternalAccessory

// Square Mobile Payments SDK Service
// This service handles in-person payments with Square Reader 2nd Gen (Bluetooth) using Mobile Payments SDK
//
// Reference: https://developer.squareup.com/docs/mobile-payments-sdk/ios
//
// ⚠️ REQUIREMENT: Kiosk must be ATTENDED (in line of sight, during business hours, with trained staff)
// See: https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations

// SquareMobilePaymentsService handles in-person payments with Square Reader 2nd Gen (Bluetooth)
class SquareMobilePaymentsService: NSObject, PaymentManagerDelegate {
    static let shared = SquareMobilePaymentsService()
    
    private var isAuthorized = false
    private var accessToken: String?
    private var locationId: String?
    private var currentPaymentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private var isStarting = false // Gate to prevent multiple simultaneous payment attempts
    private var hasPaymentHandle = false // Track if we actually got a payment handle from SDK
    
    private override init() {
        super.init()
        // Note: Square Reader 2nd Gen connects via Bluetooth, not External Accessory framework
        // The SDK automatically detects and manages Bluetooth reader connections
        // We keep these notifications for backward compatibility (Square Stand uses External Accessory)
        // But they won't detect Bluetooth readers - SDK handles those automatically
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
        // Register with EAAccessoryManager (for Square Stand compatibility, not needed for Bluetooth readers)
        EAAccessoryManager.shared().registerForLocalNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func accessoryConnected(_ notification: Notification) {
        // Note: Square Reader 2nd Gen uses Bluetooth, not External Accessory framework
        // This notification handler is for Square Stand only (wired connection)
        // Bluetooth readers are detected automatically by the SDK
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                print("[SquareMobilePayments] 🔌 Square Stand connected (wired): \(accessory.name)")
                print("[SquareMobilePayments] 🔄 Hardware detected - re-authorizing to establish connection...")
                
                // Automatically re-authorize when hardware connects to establish the connection
                // This helps when iPad powers on and hardware is already connected
                if let accessToken = self.accessToken, let locationId = self.locationId {
                    // Wait a moment for hardware to fully initialize (longer wait after reboot)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { error in
                            if let error = error {
                                print("[SquareMobilePayments] ⚠️ Auto-reauthorization after hardware connect failed: \(error.localizedDescription)")
                                // Retry once more after a delay
                                DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                                    self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { retryError in
                                        if let retryError = retryError {
                                            print("[SquareMobilePayments] ⚠️ Retry reauthorization also failed: \(retryError.localizedDescription)")
                                        } else {
                                            print("[SquareMobilePayments] ✅ Auto-reauthorized successfully after retry")
                                        }
                                    }
                                }
                            } else {
                                print("[SquareMobilePayments] ✅ Auto-reauthorized successfully after hardware connection")
                            }
                        }
                    }
                }
            }
        }
    }
    
    @objc private func accessoryDisconnected(_ notification: Notification) {
        // Note: Square Reader 2nd Gen uses Bluetooth, not External Accessory framework
        // This notification handler is for Square Stand only (wired connection)
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                print("[SquareMobilePayments] ⚠️ Square Stand disconnected (wired): \(accessory.name)")
            }
        }
    }
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    // Step 4: Authorize Mobile Payments SDK with OAuth access token and location ID
    // According to Square docs: authorizationManager.authorize() uses a completion handler
    func authorize(accessToken: String, locationId: String, forceReauthorize: Bool = false, completion: @escaping (Error?) -> Void) {
        self.accessToken = accessToken
        self.locationId = locationId
        
        // If forceReauthorize is true, always re-authorize (useful for refreshing stale connections)
        if forceReauthorize {
            print("[SquareMobilePayments] 🔄 Force re-authorizing to refresh hardware connection...")
            // Deauthorize first if needed
            if MobilePaymentsSDK.shared.authorizationManager.state == .authorized {
                MobilePaymentsSDK.shared.authorizationManager.deauthorize {
                    // Continue with authorization after deauthorization
                    self.performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
                }
            } else {
                self.performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
            }
            return
        }
        
        // Check if already authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .notAuthorized else {
            print("[SquareMobilePayments] Already authorized (state: \(MobilePaymentsSDK.shared.authorizationManager.state))")
            self.isAuthorized = true
            // Check reader detection after authorization
            checkReaderDetection()
            completion(nil)
            return
        }
        
        performAuthorization(accessToken: accessToken, locationId: locationId, completion: completion)
    }
    
    // Helper method to perform actual authorization
    private func performAuthorization(accessToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
        // Authorize with OAuth access token
        MobilePaymentsSDK.shared.authorizationManager.authorize(
            withAccessToken: accessToken,
            locationID: locationId
        ) { error in
            if let authError = error {
                print("[SquareMobilePayments] Authorization failed: \(authError.localizedDescription)")
                self.isAuthorized = false
                completion(authError)
            } else {
                print("[SquareMobilePayments] ✅ Successfully authorized with location: \(locationId)")
                self.isAuthorized = true
                // Check reader detection after successful authorization
                self.checkReaderDetection()
                completion(nil)
            }
        }
    }
    
    // Step 5: Test Square Reader Detection
    // The SDK automatically detects Square Reader 2nd Gen (Bluetooth) hardware when authorized
    // This method checks various indicators to verify hardware detection
    // Can be called manually or automatically after authorization
    func checkReaderDetection() {
        print("\n[SquareMobilePayments] ===== Testing Square Reader Detection (Bluetooth) =====")
        
        // 1. Check authorization state
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        print("[SquareMobilePayments] Authorization State: \(authState)")
        
        if authState == .authorized {
            print("[SquareMobilePayments] ✅ SDK is authorized")
        } else {
            print("[SquareMobilePayments] ⚠️ SDK is not authorized (state: \(authState))")
            print("[SquareMobilePayments] Reader detection requires authorization first")
            return
        }
        
        // 2. Note: Square Reader 2nd Gen connects via Bluetooth
        // The SDK automatically discovers and connects to Bluetooth readers
        // IMPORTANT: Reader must be paired via iOS Settings > Bluetooth first!
        print("[SquareMobilePayments] 📱 Square Reader 2nd Gen connects via Bluetooth")
        print("[SquareMobilePayments]    The SDK automatically discovers and connects to readers")
        print("[SquareMobilePayments]    ⚠️ IMPORTANT: Reader must be paired in iOS Settings > Bluetooth first!")
        print("[SquareMobilePayments]    Make sure Bluetooth is enabled on the iPad")
        print("[SquareMobilePayments]    Go to iPad Settings > Bluetooth and pair the Square Reader")
        
        // 3. Check Info.plist configuration
        print("[SquareMobilePayments] 📋 Checking Info.plist configuration...")
        if let protocols = Bundle.main.object(forInfoDictionaryKey: "UISupportedExternalAccessoryProtocols") as? [String] {
            let squareProtocols = protocols.filter { $0.contains("squareup") }
            if !squareProtocols.isEmpty {
                print("[SquareMobilePayments] ✅ Square protocols configured: \(squareProtocols)")
            } else {
                print("[SquareMobilePayments] ⚠️ No Square protocols found in Info.plist")
            }
        } else {
            print("[SquareMobilePayments] ⚠️ UISupportedExternalAccessoryProtocols not found in Info.plist")
        }
        
        // 4. Check permissions
        let locationStatus = CLLocationManager().authorizationStatus
        let bluetoothStatus = CBManager.authorization
        print("[SquareMobilePayments] 📍 Location permission: \(locationStatus == .authorizedWhenInUse || locationStatus == .authorizedAlways ? "✅ Granted" : "⚠️ Not granted")")
        print("[SquareMobilePayments] 📡 Bluetooth permission: \(bluetoothStatus == .allowedAlways ? "✅ Granted" : "⚠️ Not granted")")
        
        // 5. Note: Actual hardware detection happens when starting a payment
        print("[SquareMobilePayments] 💡 Note: Square Reader will be detected automatically when you start a payment")
        print("[SquareMobilePayments] 💡 The SDK will show an error if no reader is found during payment")
        print("[SquareMobilePayments] ============================================\n")
    }
    
    // Check if Square Reader is actually connected using ReaderManager
    // Made public so AppState can check hardware connection
    func checkHardwareConnection() -> Bool {
        // First check if SDK is authorized
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        guard authState == .authorized else {
            appLog("⚠️ SDK not authorized - cannot check reader connection", category: "SquareMobilePayments")
            return false
        }
        
        // Use ReaderManager to check if a reader is actually connected
        // ReaderManager provides the actual connection status
        let readerManager = MobilePaymentsSDK.shared.readerManager
        let connectedReaders = readerManager.connectedReaders
        
        if !connectedReaders.isEmpty {
            appLog("✅ Reader connected: \(connectedReaders.count) reader(s) available", category: "SquareMobilePayments")
            for reader in connectedReaders {
                appLog("   - Reader: \(reader.name ?? "Unknown")", category: "SquareMobilePayments")
            }
            return true
        } else {
            appLog("⚠️ No readers connected - reader must be paired in iOS Settings > Bluetooth", category: "SquareMobilePayments")
            appLog("💡 Use presentReaderSettings() to pair a reader", category: "SquareMobilePayments")
            return false
        }
    }
    
    // Present Square's built-in Reader Settings screen for pairing/managing readers
    // This is the recommended way to pair Square Reader 2nd Gen
    func presentReaderSettings(from viewController: UIViewController, completion: (() -> Void)? = nil) {
        appLog("📱 Presenting Square Reader Settings screen...", category: "SquareMobilePayments")
        
        // Check if SDK is authorized first
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        guard authState == .authorized else {
            appLog("⚠️ SDK not authorized - cannot show settings", category: "SquareMobilePayments")
            completion?()
            return
        }
        
        // Present Square's built-in Reader Settings screen
        // This allows users to pair/manage Square Reader 2nd Gen
        MobilePaymentsSDK.shared.settingsManager.presentSettings(viewController: viewController) { [weak self] in
            appLog("📱 Reader Settings screen dismissed", category: "SquareMobilePayments")
            // Check connection status after settings are dismissed
            let connected = self?.checkHardwareConnection() ?? false
            appLog("📱 Reader connection status after settings: \(connected ? "✅ Connected" : "❌ Not connected")", category: "SquareMobilePayments")
            completion?()
        }
    }
    
    // Attempt to wake up Square Reader (Bluetooth)
    // Note: Square Reader 2nd Gen uses Bluetooth, so we can't use EASession
    // The SDK automatically manages Bluetooth connections - no manual wake-up needed
    // This method is kept for API compatibility but does nothing for Bluetooth readers
    func attemptHardwareWakeUp() {
        // Square Reader 2nd Gen connects via Bluetooth
        // The SDK automatically discovers and connects to Bluetooth readers when payment starts
        // No manual wake-up needed - SDK handles Bluetooth connection management
        appLog("💡 Square Reader 2nd Gen uses Bluetooth - SDK will connect automatically when payment starts", category: "SquareMobilePayments")
    }
    
    // Take payment using Mobile Payments SDK PaymentManager
    // Following Square's recommended pattern: use SDK state + single-payment gate
    // This will automatically detect Square Reader 2nd Gen (Bluetooth) and process payment when user taps/chips card
    func takePayment(
        amount: Double,
        donationId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // 1) App truth: Prevent SwiftUI double-trigger with isStarting gate
        // This is the primary gate to prevent multiple simultaneous payment attempts
        guard !isStarting else {
            appLog("⚠️ Payment start already in progress (app gate) - ignoring duplicate call", category: "SquareMobilePayments")
            return
        }
        
        // 2) Check if reader is actually connected BEFORE starting payment
        // This prevents the "connect hardware" error
        guard checkHardwareConnection() else {
            appLog("❌ No reader connected - cannot start payment", category: "SquareMobilePayments")
            appLog("💡 Reader must be paired in iOS Settings > Bluetooth or via Reader Settings screen", category: "SquareMobilePayments")
            let error = NSError(domain: "SquareMobilePayments", code: -4, userInfo: [
                NSLocalizedDescriptionKey: "No Square Reader connected. Please pair a reader in Settings or use the Reader Settings screen.",
                NSLocalizedFailureReasonErrorKey: "reader_not_connected"
            ])
            completion(.failure(error))
            return
        }
        
        isStarting = true
        self.currentPaymentCompletion = completion
        
        appLog("💳 Starting payment: $\(amount) for donation \(donationId)", category: "SquareMobilePayments")
        
        // Check SDK's actual authorization state (source of truth, not local flag)
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        appLog("🔐 SDK Authorization state: \(authState)", category: "SquareMobilePayments")
        
        // Check if we have credentials
        guard let accessToken = self.accessToken, let locationId = self.locationId else {
            appLog("❌ Missing credentials", category: "SquareMobilePayments")
            isStarting = false
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Square credentials not available"
            ])))
            return
        }
        
        appLog("📍 Location ID: \(locationId)", category: "SquareMobilePayments")
        
        // If SDK is not authorized, authorize it first (this can happen if authorization is still in progress)
        if authState != .authorized {
            appLog("⚠️ SDK not authorized (state: \(authState)) - authorizing now...", category: "SquareMobilePayments")
            self.authorize(accessToken: accessToken, locationId: locationId) { error in
                if let error = error {
                    appLog("❌ Authorization failed: \(error.localizedDescription)", category: "SquareMobilePayments")
                    self.isStarting = false
                    completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                        NSLocalizedDescriptionKey: "Square SDK authorization failed. Please check Square connection."
                    ])))
                } else {
                    appLog("✅ Authorization successful - proceeding with payment", category: "SquareMobilePayments")
                    // Retry payment after authorization (with a small delay for hardware to wake up)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        self.takePayment(amount: amount, donationId: donationId, from: viewController, completion: completion)
                    }
                }
            }
            return
        }
        
        // Proceed with payment flow - SDK will detect hardware when starting payment
        proceedWithPaymentFlow(
            amount: amount,
            donationId: donationId,
            accessToken: accessToken,
            locationId: locationId,
            viewController: viewController
        )
    }
    
    // Proceed with payment flow after hardware check
    private func proceedWithPaymentFlow(
        amount: Double,
        donationId: String,
        accessToken: String,
        locationId: String,
        viewController: UIViewController
    ) {
        
        // Update local flag to match SDK state
        self.isAuthorized = true
        
        // Create payment parameters
        let amountMoney = Money(amount: UInt(amount * 100), currency: .USD)
        let idempotencyKey = String(donationId.prefix(45))
        
        let paymentParameters = PaymentParameters(
            idempotencyKey: idempotencyKey,
            amountMoney: amountMoney
        )
        
        // Enable all payment methods including Cash App Pay
        let promptParameters = PromptParameters(
            mode: .default,
            additionalMethods: .all
        )
        
        // Always force re-authorize before payment to wake hardware
        // This ensures the SDK has a fresh connection and can wake the Stand
        appLog("🔄 Force re-authorizing SDK before payment to wake hardware...", category: "SquareMobilePayments")
        self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { error in
            if let error = error {
                appLog("⚠️ Re-authorization warning (may still work): \(error.localizedDescription)", category: "SquareMobilePayments")
            } else {
                appLog("✅ Re-authorization completed - hardware should be ready", category: "SquareMobilePayments")
            }
            
            // Small delay after re-authorization to let hardware wake up
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self else { return }
                self.startPaymentFlow(
                    paymentParameters: paymentParameters,
                    promptParameters: promptParameters,
                    viewController: viewController
                )
            }
        }
    }
    
    // Start payment flow - SDK will detect hardware automatically
    private func startPaymentFlow(
        paymentParameters: PaymentParameters,
        promptParameters: PromptParameters,
        viewController: UIViewController
    ) {
        appLog("🚀 Starting Square SDK payment flow...", category: "SquareMobilePayments")
        
        // Ensure view is still loaded
        _ = viewController.view
        
        // Verify SDK authorization state before starting
        let finalAuthState = MobilePaymentsSDK.shared.authorizationManager.state
        appLog("🔐 Authorization check before payment: \(finalAuthState)", category: "SquareMobilePayments")
        
        guard finalAuthState == .authorized else {
            appLog("❌ SDK not authorized at payment start (state: \(finalAuthState))", category: "SquareMobilePayments")
            isStarting = false
            hasPaymentHandle = false
            self.currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -6, userInfo: [
                NSLocalizedDescriptionKey: "Square SDK not ready. Please try again.",
                NSLocalizedFailureReasonErrorKey: "sdk_not_authorized"
            ])))
            self.currentPaymentCompletion = nil
            return
        }
        
        // Square Reader 2nd Gen uses Bluetooth - SDK automatically discovers and connects
        // IMPORTANT: Reader must be paired via iOS Settings > Bluetooth first!
        // The SDK can only discover already-paired readers, it cannot pair them automatically
        appLog("💡 Square Reader 2nd Gen - SDK will discover and connect via Bluetooth", category: "SquareMobilePayments")
        appLog("⚠️ IMPORTANT: Reader must be paired in iOS Settings > Bluetooth before payment", category: "SquareMobilePayments")
        appLog("💡 Check iPad Settings > Bluetooth to ensure reader is paired", category: "SquareMobilePayments")
        
        // Add a delay to allow Bluetooth discovery to complete
        // Bluetooth discovery can take 1-2 seconds, especially if reader was just powered on
        // This gives the SDK time to discover the paired reader
        appLog("⏳ Waiting 1.5 seconds for Bluetooth discovery before starting payment...", category: "SquareMobilePayments")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            // Double-check authorization state (may have changed during delay)
            let currentAuthState = MobilePaymentsSDK.shared.authorizationManager.state
            guard currentAuthState == .authorized else {
                appLog("❌ SDK authorization lost during hardware wake-up (state: \(currentAuthState))", category: "SquareMobilePayments")
                self.isStarting = false
                self.hasPaymentHandle = false
                self.currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -6, userInfo: [
                    NSLocalizedDescriptionKey: "Square SDK not ready. Please try again.",
                    NSLocalizedFailureReasonErrorKey: "sdk_not_authorized"
                ])))
                self.currentPaymentCompletion = nil
                return
            }
            
            // Start payment - delegate is passed as parameter to startPayment
            let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
                paymentParameters,
                promptParameters: promptParameters,
                from: viewController,
                delegate: self
            )
            
            self.processPaymentHandle(paymentHandle)
        }
    }
    
    // Process payment handle result
    private func processPaymentHandle(_ paymentHandle: PaymentHandle?) {
        
        if let handle = paymentHandle {
            hasPaymentHandle = true // Mark that payment has actually started
            appLog("✅ Payment started successfully! Handle: \(handle)", category: "SquareMobilePayments")
            appLog("💡 Square SDK should now show card entry UI", category: "SquareMobilePayments")
            appLog("💡 User can tap or insert card on Square Reader 2nd Gen", category: "SquareMobilePayments")
            appLog("💡 SDK will automatically discover and connect to Bluetooth reader", category: "SquareMobilePayments")
        } else {
            appLog("❌ Payment handle is nil - payment already in progress", category: "SquareMobilePayments")
            // Reset gate so user can try again
            isStarting = false
            hasPaymentHandle = false
            
            // Call completion with specific error about payment in progress
            self.currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -5, userInfo: [
                NSLocalizedDescriptionKey: "Payment already in progress. Please wait for the current payment to complete or cancel it first.",
                NSLocalizedFailureReasonErrorKey: "payment_already_in_progress"
            ])))
            self.currentPaymentCompletion = nil
        }
    }
    
    // Temporary: Process payment through backend until SDK is fixed
    private func processPaymentThroughBackend(
        amount: Double,
        donationId: String,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) async {
        guard let url = URL(string: "\(Config.apiBaseURL)/donations/process-payment") else {
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid API URL"
            ])))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let keychain = KeychainHelper()
        if let token = keychain.load(forKey: "deviceToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "donationId": donationId,
            "amount": amount,
            "idempotencyKey": "\(donationId)-\(Date().timeIntervalSince1970)"
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid response"
                ])
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                let errorMessage = errorData?["message"] as? String ?? "Payment processing failed"
                throw NSError(domain: "SquareMobilePayments", code: httpResponse.statusCode, userInfo: [
                    NSLocalizedDescriptionKey: errorMessage
                ])
            }
            
            let result = try JSONDecoder().decode(ProcessPaymentResponse.self, from: data)
            
            await MainActor.run {
                completion(.success(PaymentResult(
                    success: result.success,
                    paymentId: result.paymentId,
                    error: result.success ? nil : "Payment failed"
                )))
            }
        } catch {
            await MainActor.run {
                completion(.failure(error))
            }
        }
    }
    
    // MARK: - PaymentManagerDelegate
    
    func paymentManager(_ paymentManager: PaymentManager, didFinish payment: Payment) {
        appLog("✅ Payment succeeded!", category: "SquareMobilePayments")
        
        // Extract payment ID - try different payment types
        var paymentId: String? = nil
        
        if let onlinePayment = payment as? OnlinePayment {
            paymentId = onlinePayment.id
            appLog("Online payment ID: \(paymentId ?? "nil")", category: "SquareMobilePayments")
        } else if let offlinePayment = payment as? OfflinePayment {
            paymentId = offlinePayment.id
            appLog("Offline payment ID: \(paymentId ?? "nil")", category: "SquareMobilePayments")
        } else {
            appLog("⚠️ Unknown payment type", category: "SquareMobilePayments")
        }
        
        let result = PaymentResult(
            success: true,
            paymentId: paymentId,
            error: nil
        )
        
        // Reset gate in ALL delegate exits
        isStarting = false
        hasPaymentHandle = false // Reset handle flag
        currentPaymentCompletion?(.success(result))
        currentPaymentCompletion = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didFail payment: Payment, withError error: Error) {
        // Log full error details for debugging
        appLog("❌ Payment failed: \(error.localizedDescription)", category: "SquareMobilePayments")
        if let nsError = error as NSError? {
            appLog("❌ Error domain: \(nsError.domain)", category: "SquareMobilePayments")
            appLog("❌ Error code: \(nsError.code)", category: "SquareMobilePayments")
            appLog("❌ Error userInfo: \(nsError.userInfo)", category: "SquareMobilePayments")
        }
        
        // Check if it's a hardware detection error
        let errorDescription = error.localizedDescription.lowercased()
        let errorDomain = (error as NSError).domain.lowercased()
        let isHardwareError = errorDescription.contains("reader") || 
                             errorDescription.contains("hardware") || 
                             errorDescription.contains("connect hardware") ||
                             errorDescription.contains("no reader") ||
                             errorDescription.contains("reader not found") ||
                             errorDescription.contains("bluetooth") ||
                             errorDescription.contains("device") ||
                             errorDescription.contains("peripheral") ||
                             errorDomain.contains("bluetooth")
        
        if isHardwareError {
            appLog("⚠️ Square Reader connection issue detected", category: "SquareMobilePayments")
            appLog("💡 Full error: \(error)", category: "SquareMobilePayments")
            appLog("💡 Error description: \(error.localizedDescription)", category: "SquareMobilePayments")
            appLog("💡 Make sure Square Reader 2nd Gen is powered on and Bluetooth is enabled on iPad", category: "SquareMobilePayments")
            appLog("💡 The reader MUST be paired in iOS Settings > Bluetooth before starting payment", category: "SquareMobilePayments")
            appLog("💡 Go to iPad Settings > Bluetooth and verify 'Square Reader' shows as 'Connected'", category: "SquareMobilePayments")
            appLog("💡 If reader is not listed, pair it first, then try payment again", category: "SquareMobilePayments")
            let userFriendlyError = NSError(domain: "SquareMobilePayments", code: -3, userInfo: [
                NSLocalizedDescriptionKey: "Connect hardware to take card payments. Please ensure the Square Reader 2nd Gen is powered on, Bluetooth is enabled on the iPad, and the reader is paired in iOS Settings > Bluetooth."
            ])
            currentPaymentCompletion?(.failure(userFriendlyError))
        } else {
            appLog("💡 Non-hardware error - passing through: \(error.localizedDescription)", category: "SquareMobilePayments")
            currentPaymentCompletion?(.failure(error))
        }
        
        // Reset gate in ALL delegate exits
        isStarting = false
        hasPaymentHandle = false // Reset handle flag
        currentPaymentCompletion = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        appLog("🚫 Payment cancelled by user", category: "SquareMobilePayments")
        
        let error = NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
            NSLocalizedDescriptionKey: "Payment was cancelled"
        ])
        
        // Reset gate in ALL delegate exits
        isStarting = false
        hasPaymentHandle = false // Reset handle flag
        currentPaymentCompletion?(.failure(error))
        currentPaymentCompletion = nil
    }
    
    // Public method to check if payment handle was received (payment actually started in SDK)
    func hasActivePaymentHandle() -> Bool {
        return hasPaymentHandle
    }
    
    // Public method to check if payment is in progress
    // Uses app-level gate (isStarting) as primary indicator
    // SDK's startPayment will return nil if payment already in progress
    func isPaymentInProgress() -> Bool {
        return isStarting || currentPaymentCompletion != nil
    }
    
    // Public method to cancel any in-progress payment
    // This resets app-level state and optionally force re-authorizes SDK to clear stuck payment state
    func cancelCurrentPayment(forceReauthorize: Bool = false) {
        appLog("🚫 Cancelling current payment (forceReauthorize: \(forceReauthorize))", category: "SquareMobilePayments")
        
        // Reset app-level gate
        isStarting = false
        hasPaymentHandle = false // Reset handle flag
        
        // Call completion with cancellation error if we have one
        // Note: SDK will handle its own payment cancellation when view is dismissed
        if currentPaymentCompletion != nil {
            currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
                NSLocalizedDescriptionKey: "Payment was cancelled"
            ])))
            currentPaymentCompletion = nil
        }
        
        // If force re-authorize is requested, re-authorize SDK to clear any stuck payment state
        // This is needed when SDK reports payment_already_in_progress even after cancellation
        if forceReauthorize, let accessToken = self.accessToken, let locationId = self.locationId {
            appLog("🔄 Force re-authorizing SDK to clear stuck payment state...", category: "SquareMobilePayments")
            self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { error in
                if let error = error {
                    appLog("⚠️ Force re-authorization warning: \(error.localizedDescription)", category: "SquareMobilePayments")
                } else {
                    appLog("✅ Force re-authorization completed - SDK state should be cleared", category: "SquareMobilePayments")
                }
            }
        }
    }
}

// Temporary response struct for backend payment processing
struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}



