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
    private var isStarting = false // Gate to prevent multiple simultaneous payment attempts
    private var hasPaymentHandle = false // Track if we actually got a payment handle from SDK
    
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
    // Following Square's recommended pattern: use SDK state + single-payment gate
    // This will automatically detect Square Stand and process payment when user taps/chips card
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
        
        // Wake up hardware before starting payment
        // Square Stand can fall asleep after inactivity and needs to be woken up
        // Force re-authorization helps wake up the hardware connection
        appLog("🔔 Attempting to wake up Square Stand hardware...", category: "SquareMobilePayments")
        
        // Check if hardware is currently detected
        let hardwareDetected = checkHardwareConnection()
        
        if !hardwareDetected {
            appLog("⚠️ Hardware not detected - force re-authorizing to wake it up...", category: "SquareMobilePayments")
            // Force re-authorize to wake up hardware
            if let accessToken = self.accessToken, let locationId = self.locationId {
                self.authorize(accessToken: accessToken, locationId: locationId, forceReauthorize: true) { error in
                    if let error = error {
                        appLog("⚠️ Re-authorization warning (may still work): \(error.localizedDescription)", category: "SquareMobilePayments")
                    } else {
                        appLog("✅ Re-authorization completed - hardware should be awake", category: "SquareMobilePayments")
                    }
                    
                    // Wait a bit longer for hardware to fully wake up (3 seconds)
                    // This gives the Square Stand time to power on and establish connection
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                        self.startPaymentFlowWithWakeup(
                            paymentParameters: paymentParameters,
                            promptParameters: promptParameters,
                            viewController: viewController
                        )
                    }
                }
            } else {
                // No credentials - proceed anyway, SDK will handle it
                DispatchQueue.main.async {
                    _ = viewController.view
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        self.startPaymentFlowWithWakeup(
                            paymentParameters: paymentParameters,
                            promptParameters: promptParameters,
                            viewController: viewController
                        )
                    }
                }
            }
        } else {
            appLog("✅ Hardware detected - proceeding with payment", category: "SquareMobilePayments")
            // Hardware is detected, but still add a small delay to ensure it's fully ready
            DispatchQueue.main.async {
                _ = viewController.view
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self.startPaymentFlowWithWakeup(
                        paymentParameters: paymentParameters,
                        promptParameters: promptParameters,
                        viewController: viewController
                    )
                }
            }
        }
    }
    
    // Start payment flow with hardware wake-up delay
    private func startPaymentFlowWithWakeup(
        paymentParameters: PaymentParameters,
        promptParameters: PromptParameters,
        viewController: UIViewController
    ) {
        appLog("🚀 Starting Square SDK payment flow (after hardware wake-up)...", category: "SquareMobilePayments")
        
        // Ensure view is still loaded
        _ = viewController.view
        
        // Start payment - delegate is passed as parameter to startPayment
        let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
            paymentParameters,
            promptParameters: promptParameters,
            from: viewController,
            delegate: self
        )
        
        if let handle = paymentHandle {
            hasPaymentHandle = true // Mark that payment has actually started
            appLog("✅ Payment started successfully! Handle: \(handle)", category: "SquareMobilePayments")
            appLog("💡 Square SDK should now show card entry UI", category: "SquareMobilePayments")
            appLog("💡 User can tap or insert card on Square Stand", category: "SquareMobilePayments")
            appLog("💡 SDK will automatically detect Square Stand hardware", category: "SquareMobilePayments")
            
            // Log hardware status after starting payment
            let hardwareStillDetected = checkHardwareConnection()
            if hardwareStillDetected {
                appLog("✅ Hardware confirmed active after payment start", category: "SquareMobilePayments")
            } else {
                appLog("⚠️ Hardware not visible in connectedAccessories (may still work via SDK)", category: "SquareMobilePayments")
            }
        } else {
            appLog("❌ Payment handle is nil - payment already in progress", category: "SquareMobilePayments")
            // Reset gate so user can try again
            isStarting = false
            
            // Call completion with specific error about payment in progress
            self.currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -5, userInfo: [
                NSLocalizedDescriptionKey: "Payment already in progress. Please wait for the current payment to complete or cancel it first.",
                NSLocalizedFailureReasonErrorKey: "payment_already_in_progress"
            ])))
            self.currentPaymentCompletion = nil
        }
    }
    
    // Legacy method name for compatibility
    private func startPaymentFlow(
        paymentParameters: PaymentParameters,
        promptParameters: PromptParameters,
        viewController: UIViewController
    ) {
        startPaymentFlowWithWakeup(
            paymentParameters: paymentParameters,
            promptParameters: promptParameters,
            viewController: viewController
        )
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
        appLog("❌ Payment failed: \(error.localizedDescription)", category: "SquareMobilePayments")
        
        // Check if it's a hardware detection error
        let errorDescription = error.localizedDescription.lowercased()
        let isHardwareError = errorDescription.contains("reader") || 
                             errorDescription.contains("hardware") || 
                             errorDescription.contains("stand") ||
                             errorDescription.contains("connect hardware") ||
                             errorDescription.contains("no reader") ||
                             errorDescription.contains("reader not found")
        
        if isHardwareError {
            appLog("⚠️ Square Stand connection issue detected", category: "SquareMobilePayments")
            let userFriendlyError = NSError(domain: "SquareMobilePayments", code: -3, userInfo: [
                NSLocalizedDescriptionKey: "Connect hardware to take card payments. Please ensure the Square Stand is connected and powered on."
            ])
            currentPaymentCompletion?(.failure(userFriendlyError))
        } else {
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
    func cancelCurrentPayment() {
        appLog("🚫 Cancelling current payment", category: "SquareMobilePayments")
        
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
    }
}

// Temporary response struct for backend payment processing
struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}



