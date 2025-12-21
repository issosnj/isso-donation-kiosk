import Foundation
import UIKit
import SquareMobilePaymentsSDK
import CoreLocation
import CoreBluetooth

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
    
    private override init() {
        super.init()
    }
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    // Step 4: Authorize Mobile Payments SDK with OAuth access token and location ID
    // According to Square docs: authorizationManager.authorize() uses a completion handler
    func authorize(accessToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
        self.accessToken = accessToken
        self.locationId = locationId
        
        // Check if already authorized
        guard MobilePaymentsSDK.shared.authorizationManager.state == .notAuthorized else {
            print("[SquareMobilePayments] Already authorized (state: \(MobilePaymentsSDK.shared.authorizationManager.state))")
            self.isAuthorized = true
            // Check reader detection after authorization
            checkReaderDetection()
            completion(nil)
            return
        }
        
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
        
        guard let accessToken = self.accessToken, let locationId = self.locationId else {
            print("[SquareMobilePayments] ❌ Missing credentials")
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Square credentials not available"
            ])))
            return
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
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Square SDK not authorized. Please check Square connection in settings."
            ])))
            return
        }
        
        // Ensure we're on the main thread and view is loaded
        DispatchQueue.main.async {
            // Ensure view is loaded and view controller is ready
            _ = viewController.view
            
            // Small delay to ensure view controller is fully ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                print("[SquareMobilePayments] 🚀 Starting Square SDK payment flow...")
                print("[SquareMobilePayments] 💰 Amount: $\(amount)")
                print("[SquareMobilePayments] 🔑 Idempotency Key: \(idempotencyKey)")
                
                // Set delegate before starting payment
                MobilePaymentsSDK.shared.paymentManager.delegate = self
                
                let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
                    paymentParameters,
                    promptParameters: promptParameters,
                    from: viewController,
                    delegate: self
                )
                
                if let handle = paymentHandle {
                    print("[SquareMobilePayments] ✅ Payment started successfully!")
                    print("[SquareMobilePayments] ✅ Payment handle: \(handle)")
                    print("[SquareMobilePayments] 💡 Square SDK should now show card entry UI")
                    print("[SquareMobilePayments] 💡 User can tap or insert card on Square Stand")
                    print("[SquareMobilePayments] 💡 Cash App Pay will be available if enabled in Square Dashboard")
                    print("[SquareMobilePayments] 💡 SDK will automatically detect card interactions")
                } else {
                    print("[SquareMobilePayments] ❌ Payment handle is nil!")
                    print("[SquareMobilePayments] ❌ SDK may not have started payment")
                    print("[SquareMobilePayments] ⚠️ Possible issues:")
                    print("[SquareMobilePayments]    1. Square Stand not connected")
                    print("[SquareMobilePayments]    2. SDK not properly authorized")
                    print("[SquareMobilePayments]    3. ViewController not ready")
                    print("[SquareMobilePayments]    4. iPad not properly inserted into Square Stand")
                    
                    // Call completion with error
                    self.currentPaymentCompletion?(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                        NSLocalizedDescriptionKey: "Failed to start payment. Please ensure:\n1. iPad is securely inserted into Square Stand\n2. Stand is powered on\n3. Square connection is active in settings"
                    ])))
                    self.currentPaymentCompletion = nil
                }
            }
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
        if errorDescription.contains("reader") || errorDescription.contains("hardware") || errorDescription.contains("stand") {
            print("[SquareMobilePayments] ⚠️ This appears to be a Square Stand connection issue")
            print("[SquareMobilePayments] 💡 Please check:")
            print("[SquareMobilePayments]    1. iPad is securely inserted into Square Stand")
            print("[SquareMobilePayments]    2. Stand is powered on")
            print("[SquareMobilePayments]    3. Settings > General > About shows 'Square Stand'")
        }
        
        currentPaymentCompletion?(.failure(error))
        currentPaymentCompletion = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        print("[SquareMobilePayments] 🚫 Payment cancelled by user")
        let error = NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
            NSLocalizedDescriptionKey: "Payment was cancelled by user"
        ])
        currentPaymentCompletion?(.failure(error))
        currentPaymentCompletion = nil
    }
}

// Temporary response struct for backend payment processing
struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}



