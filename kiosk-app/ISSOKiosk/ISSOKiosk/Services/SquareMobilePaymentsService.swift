import Foundation
import UIKit
import SquareMobilePaymentsSDK
import CoreLocation
import CoreBluetooth
import ExternalAccessory

// Square Mobile Payments SDK Service
// This service handles in-person payments with Square Stand using Mobile Payments SDK
//
// Reference: https://developer.squareup.com/docs/mobile-payments-sdk/ios
//
// ⚠️ REQUIREMENT: Kiosk must be ATTENDED (in line of sight, during business hours, with trained staff)
// See: https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations

// SquareMobilePaymentsService handles in-person payments with Square Stand
class SquareMobilePaymentsService: NSObject, PaymentManagerDelegate {
    static let shared = SquareMobilePaymentsService()
    
    private var isAuthorized = false
    private var accessToken: String?
    private var locationId: String?
    private var currentPaymentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private var currentPaymentHandle: Any? // Store payment handle to track if payment is in progress
    
    private override init() {
        super.init()
        // Register for accessory notifications to detect when Square Stand connects/disconnects
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
        // Register with EAAccessoryManager to receive notifications
        EAAccessoryManager.shared().registerForLocalNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func accessoryConnected(_ notification: Notification) {
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                print("[SquareMobilePayments] 🔌 Square Stand connected: \(accessory.name)")
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
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
            let hasSquareProtocol = accessory.protocolStrings.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            if hasSquareProtocol {
                print("[SquareMobilePayments] ⚠️ Square Stand disconnected: \(accessory.name)")
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
    
    // Step 5: Test Square Stand Detection
    // The SDK automatically detects Square Stand hardware when authorized
    // This method checks various indicators to verify hardware detection
    // Can be called manually or automatically after authorization
    func checkReaderDetection() {
        print("\n[SquareMobilePayments] ===== Testing Square Stand Detection =====")
        
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
        
        // 2. Check iOS system for Square Stand recognition
        // Square Stand should appear in Settings > General > About if connected
        print("[SquareMobilePayments] 📱 To verify Square Stand connection:")
        print("[SquareMobilePayments]    1. Go to iPad Settings > General > About")
        print("[SquareMobilePayments]    2. Look for 'Square Stand' in the device list")
        print("[SquareMobilePayments]    3. If it appears, the Stand is recognized by iOS")
        
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
        print("[SquareMobilePayments] 💡 Note: Square Stand will be detected automatically when you start a payment")
        print("[SquareMobilePayments] 💡 The SDK will show an error if no hardware is found during payment")
        print("[SquareMobilePayments] ============================================\n")
    }
    
    // Check if Square Stand hardware is actually connected at iOS level
    // Made public so AppState can check hardware connection
    func checkHardwareConnection() -> Bool {
        // Check ExternalAccessory framework for connected Square devices
        let manager = EAAccessoryManager.shared()
        let connectedAccessories = manager.connectedAccessories
        
        // Look for Square Stand (it will have Square protocols)
        let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
        
        for accessory in connectedAccessories {
            let accessoryProtocols = accessory.protocolStrings
            let hasSquareProtocol = accessoryProtocols.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            
            if hasSquareProtocol {
                let modelNumber = accessory.modelNumber.isEmpty ? "unknown" : accessory.modelNumber
                print("[SquareMobilePayments] ✅ Found Square hardware: \(accessory.name) (Model: \(modelNumber))")
                print("[SquareMobilePayments] 📋 Accessory protocols: \(accessoryProtocols)")
                return true
            }
        }
        
        print("[SquareMobilePayments] ⚠️ No Square hardware detected in connected accessories")
        print("[SquareMobilePayments] 📋 Connected accessories: \(connectedAccessories.map { "\($0.name) (protocols: \($0.protocolStrings))" })")
        
        // Note: Square Stand might not appear in connectedAccessories until SDK tries to use it
        // This is a limitation - we can't reliably detect it before payment starts
        print("[SquareMobilePayments] 💡 Note: Square Stand may not appear in connectedAccessories until SDK actively uses it")
        print("[SquareMobilePayments] 💡 The SDK will detect hardware when starting payment")
        
        return false
    }
    
    // Take payment using Mobile Payments SDK PaymentManager
    // This will automatically detect Square Stand and process payment when user taps/chips card
    func takePayment(
        amount: Double,
        donationId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        guard isAuthorized else {
            print("[SquareMobilePayments] ❌ SDK not authorized")
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "SDK not authorized. Call authorize() first."
            ])))
            return
        }
        
        guard let _ = self.accessToken, let locationId = self.locationId else {
            print("[SquareMobilePayments] ❌ Missing credentials")
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Square credentials not available"
            ])))
            return
        }
        
        // Check if there's already a payment in progress
        if currentPaymentHandle != nil || currentPaymentCompletion != nil {
            let formatter = DateFormatter()
            formatter.dateFormat = "MM/dd HH:mm:ss.SSS"
            let timestamp = formatter.string(from: Date())
            print("[\(timestamp)] [SquareMobilePayments] ⚠️ Payment already in progress - clearing previous payment state")
            // Clear previous payment state
            currentPaymentHandle = nil
            // Call previous completion with cancellation error
            currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -4, userInfo: [
                NSLocalizedDescriptionKey: "Previous payment was cancelled to start a new one"
            ])))
            currentPaymentCompletion = nil
        }
        
        self.currentPaymentCompletion = completion
        
        print("[SquareMobilePayments] 💳 Starting payment: $\(amount) for donation \(donationId)")
        print("[SquareMobilePayments] 📍 Location ID: \(locationId)")
        
        // Create payment parameters
        // PaymentParameters requires idempotencyKey and amountMoney
        // Idempotency key must be <= 45 characters
        let amountMoney = Money(amount: UInt(amount * 100), currency: .USD)
        // Use donationId (UUID, 36 chars) as idempotency key - it's already unique
        let idempotencyKey = String(donationId.prefix(45))
        
        let paymentParameters = PaymentParameters(
            idempotencyKey: idempotencyKey,
            amountMoney: amountMoney
        )
        
        // Enable all payment methods including Cash App Pay
        // Cash App Pay will be available if enabled in Square Dashboard > Online > Settings > Checkout
        let promptParameters = PromptParameters(
            mode: .default,
            additionalMethods: .all  // This includes Cash App Pay, Apple Pay, Google Pay, etc.
        )
        
        // Start payment - this will automatically detect Square Stand
        print("[SquareMobilePayments] 🔍 Detecting Square Stand hardware...")
        print("[SquareMobilePayments] 📱 Presenting from viewController: \(type(of: viewController))")
        print("[SquareMobilePayments] 📱 ViewController isViewLoaded: \(viewController.isViewLoaded)")
        print("[SquareMobilePayments] 📱 ViewController viewIfLoaded: \(viewController.viewIfLoaded != nil ? "loaded" : "not loaded")")
        
        // Check authorization state before starting payment
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        print("[SquareMobilePayments] 🔐 Authorization state: \(authState)")
        
        guard authState == .authorized else {
            print("[SquareMobilePayments] ❌ SDK not authorized! State: \(authState)")
            print("[SquareMobilePayments] 💡 Attempting to reconnect...")
            
            // Try to reconnect if we have credentials
            if let accessToken = self.accessToken, let locationId = self.locationId {
                self.authorize(accessToken: accessToken, locationId: locationId) { error in
                    if let error = error {
                        print("[SquareMobilePayments] ❌ Reconnection failed: \(error.localizedDescription)")
                        completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                            NSLocalizedDescriptionKey: "Square SDK connection lost. Please restart the app."
                        ])))
                    } else {
                        print("[SquareMobilePayments] ✅ Reconnected successfully - retrying payment")
                        // Retry payment after reconnection with delay to allow hardware to wake up
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                            self.takePayment(amount: amount, donationId: donationId, from: viewController, completion: completion)
                        }
                    }
                }
            } else {
                completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Square SDK not authorized. Please check Square connection in settings."
                ])))
            }
            return
        }
        
        // Check if Square Stand hardware is actually connected at iOS level
        let isHardwareConnected = self.checkHardwareConnection()
        print("[SquareMobilePayments] 🔌 Hardware connection check: \(isHardwareConnected ? "✅ Connected" : "❌ Not detected")")
        
        // Re-authorize to force fresh hardware connection (helps wake up Square Stand after idle)
        print("[SquareMobilePayments] 🔄 Re-authorizing to ensure hardware connection is active...")
        if let accessToken = self.accessToken, let locationId = self.locationId {
            // Force re-authorization to refresh hardware connection
            self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { error in
                if let error = error {
                    print("[SquareMobilePayments] ⚠️ Re-authorization warning: \(error.localizedDescription)")
                    // Continue anyway - authorization might still be valid
                } else {
                    print("[SquareMobilePayments] ✅ Re-authorized - hardware connection refreshed")
                }
                
                // Re-check hardware after re-authorization
                let hardwareStillConnected = self.checkHardwareConnection()
                print("[SquareMobilePayments] 🔌 Hardware connection after re-auth: \(hardwareStillConnected ? "✅ Connected" : "❌ Not detected")")
                
                // If hardware not detected, wait longer and try again
                if !hardwareStillConnected {
                    print("[SquareMobilePayments] ⚠️ Hardware not detected - waiting longer for connection...")
                }
                
                // Ensure we're on the main thread and view is loaded
                DispatchQueue.main.async {
                    // Ensure view is loaded and view controller is ready
                    _ = viewController.view
                    
                    // Give hardware more time to wake up after re-authorization (Square Stand may be in low-power mode)
                    // Use longer delay if hardware wasn't detected
                    let waitTime = hardwareStillConnected ? 2.0 : 4.0
                    print("[SquareMobilePayments] ⏳ Waiting \(waitTime) seconds for hardware to wake up...")
                    DispatchQueue.main.asyncAfter(deadline: .now() + waitTime) {
                        self.startPaymentFlow(
                            paymentParameters: paymentParameters,
                            promptParameters: promptParameters,
                            viewController: viewController
                        )
                    }
                }
            }
        } else {
            // No credentials available, proceed without re-authorization
            DispatchQueue.main.async {
                _ = viewController.view
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.startPaymentFlow(
                        paymentParameters: paymentParameters,
                        promptParameters: promptParameters,
                        viewController: viewController
                    )
                }
            }
        }
    }
    
    private func startPaymentFlow(
        paymentParameters: PaymentParameters,
        promptParameters: PromptParameters,
        viewController: UIViewController
    ) {
        print("[SquareMobilePayments] 🚀 Starting Square SDK payment flow...")
        
        // Start payment - delegate is passed as parameter to startPayment
        let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
            paymentParameters,
            promptParameters: promptParameters,
            from: viewController,
            delegate: self
        )
        
        if let handle = paymentHandle {
            print("[SquareMobilePayments] ✅ Payment started successfully!")
            print("[SquareMobilePayments] ✅ Payment handle: \(handle)")
            // Store payment handle to track that payment is in progress
            self.currentPaymentHandle = handle
            print("[SquareMobilePayments] 💡 Square SDK should now show card entry UI")
            print("[SquareMobilePayments] 💡 User can tap or insert card on Square Stand")
            print("[SquareMobilePayments] 💡 Cash App Pay will be available if enabled in Square Dashboard")
            print("[SquareMobilePayments] 💡 SDK will automatically detect card interactions")
        } else {
            print("[SquareMobilePayments] ❌ Payment handle is nil!")
            print("[SquareMobilePayments] ❌ This usually means a payment is already in progress")
            print("[SquareMobilePayments] ⚠️ Possible issues:")
            print("[SquareMobilePayments]    1. Payment already in progress (most common)")
            print("[SquareMobilePayments]    2. Square Stand not connected")
            print("[SquareMobilePayments]    3. SDK not properly authorized")
            print("[SquareMobilePayments]    4. ViewController not ready")
            print("[SquareMobilePayments]    5. iPad not properly inserted into Square Stand")
            
            // Try to clear any stale payment state
            self.currentPaymentHandle = nil
            
            // Call completion with specific error about payment in progress
            // The caller should handle this by canceling and retrying
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
        print("[SquareMobilePayments] ✅ Payment succeeded!")
        
        // Extract payment ID - try different payment types
        var paymentId: String? = nil
        
        if let onlinePayment = payment as? OnlinePayment {
            paymentId = onlinePayment.id
            print("[SquareMobilePayments] Online payment ID: \(paymentId ?? "nil")")
        } else if let offlinePayment = payment as? OfflinePayment {
            paymentId = offlinePayment.id
            print("[SquareMobilePayments] Offline payment ID: \(paymentId ?? "nil")")
        } else {
            print("[SquareMobilePayments] ⚠️ Unknown payment type")
        }
        
        let result = PaymentResult(
            success: true,
            paymentId: paymentId,
            error: nil
        )
        
        currentPaymentCompletion?(.success(result))
        currentPaymentCompletion = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didFail payment: Payment, withError error: Error) {
        print("[SquareMobilePayments] ❌ Payment failed: \(error.localizedDescription)")
        print("[SquareMobilePayments] Error details: \(error)")
        
        // Check if it's a hardware detection error
        let errorDescription = error.localizedDescription.lowercased()
        let isHardwareError = errorDescription.contains("reader") || 
                             errorDescription.contains("hardware") || 
                             errorDescription.contains("stand") ||
                             errorDescription.contains("connect hardware") ||
                             errorDescription.contains("no reader") ||
                             errorDescription.contains("reader not found")
        
        if isHardwareError {
            print("[SquareMobilePayments] ⚠️ This appears to be a Square Stand connection issue")
            print("[SquareMobilePayments] 💡 Please check:")
            print("[SquareMobilePayments]    1. iPad is securely inserted into Square Stand")
            print("[SquareMobilePayments]    2. Stand is powered on")
            print("[SquareMobilePayments]    3. Settings > General > About shows 'Square Stand'")
            
            // Create a more user-friendly error message
            let userFriendlyError = NSError(domain: "SquareMobilePayments", code: -3, userInfo: [
                NSLocalizedDescriptionKey: "Connect hardware to take card payments. Please ensure the Square Stand is connected and powered on."
            ])
            currentPaymentCompletion?(.failure(userFriendlyError))
        } else {
            currentPaymentCompletion?(.failure(error))
        }
        // Clear payment state
        currentPaymentCompletion = nil
        currentPaymentHandle = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        print("[SquareMobilePayments] 🚫 Payment cancelled by user")
        
        // Check if cancellation was due to hardware not being detected
        // If hardware wasn't detected before payment, this cancellation is likely due to hardware error
        let hardwareWasDetected = self.checkHardwareConnection()
        if !hardwareWasDetected {
            print("[SquareMobilePayments] ⚠️ Payment cancelled - hardware not detected")
            print("[SquareMobilePayments] 💡 This cancellation is likely due to hardware connection issue")
            let error = NSError(domain: "SquareMobilePayments", code: -3, userInfo: [
                NSLocalizedDescriptionKey: "Connect hardware to take card payments. Please ensure the Square Stand is connected and powered on."
            ])
            currentPaymentCompletion?(.failure(error))
        } else {
            let error = NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
                NSLocalizedDescriptionKey: "Payment was cancelled by user"
            ])
            currentPaymentCompletion?(.failure(error))
        }
        // Clear payment state
        currentPaymentCompletion = nil
        currentPaymentHandle = nil
    }
    
    // Public method to check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return currentPaymentHandle != nil || currentPaymentCompletion != nil
    }
    
    // Public method to cancel any in-progress payment
    func cancelCurrentPayment() {
        if let handle = currentPaymentHandle {
            print("[SquareMobilePayments] 🚫 Cancelling current payment handle")
            // Try to cancel the payment handle in the SDK
            // Note: PaymentHandle doesn't have a direct cancel method, but clearing it should help
            // The SDK will handle the cancellation when the view is dismissed
            currentPaymentHandle = nil
        }
        
        if currentPaymentCompletion != nil {
            print("[SquareMobilePayments] 🚫 Calling completion with cancellation")
            // Call completion with cancellation error
            currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
                NSLocalizedDescriptionKey: "Payment was cancelled"
            ])))
            currentPaymentCompletion = nil
        }
    }
}

// Temporary response struct for backend payment processing
struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}



