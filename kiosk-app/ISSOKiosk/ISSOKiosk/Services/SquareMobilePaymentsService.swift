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

// Temporarily removed PaymentManagerDelegate until LCRCore framework is fixed
class SquareMobilePaymentsService: NSObject {
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
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "SDK not authorized. Call authorize() first."
            ])))
            return
        }
        
        self.currentPaymentCompletion = completion
        
        // TODO: Re-enable when LCRCore framework issue is fixed
        // Create payment parameters
        // let amountMoney = Money(amount: UInt(amount * 100), currency: .USD)
        // let paymentParameters = PaymentParameters(
        //     paymentAttemptID: donationId,
        //     amountMoney: amountMoney,
        //     processingMode: .onlineOnly
        // )
        //
        // let promptParameters = PromptParameters(
        //     mode: .default,
        //     additionalMethods: .all
        // )
        //
        // let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
        //     paymentParameters,
        //     promptParameters: promptParameters,
        //     from: viewController,
        //     delegate: self
        // )
        
        // Temporary: Process through backend until SDK is fixed
        print("[SquareMobilePayments] Payment requested: $\(amount) for donation \(donationId)")
        print("[SquareMobilePayments] SDK temporarily disabled - processing through backend")
        
        Task {
            await processPaymentThroughBackend(
                amount: amount,
                donationId: donationId,
                completion: completion
            )
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
    
    // MARK: - PaymentManagerDelegate (Temporarily Disabled)
    
    // TODO: Re-enable when LCRCore framework issue is fixed
    // func paymentManager(_ paymentManager: PaymentManager, didFinish payment: Payment) {
    //     // Payment succeeded
    //     // Extract payment ID - try common property names
    //     var paymentId: String? = nil
    //     
    //     // Try different ways to access the payment ID based on SDK structure
    //     // The Payment protocol might have different implementations
    //     if let onlinePayment = payment as? OnlinePayment {
    //         paymentId = onlinePayment.id
    //     } else if let offlinePayment = payment as? OfflinePayment {
    //         // Offline payments may not have an ID until processed online
    //         paymentId = offlinePayment.id
    //     }
    //     
    //     // If still nil, we'll use the paymentAttemptID from when we started the payment
    //     // This is stored in the donationId parameter we passed
    //     print("[SquareMobilePayments] Payment succeeded")
    //     let result = PaymentResult(
    //         success: true,
    //         paymentId: paymentId, // May be nil for offline payments
    //         error: nil
    //     )
    //     currentPaymentCompletion?(.success(result))
    //     currentPaymentCompletion = nil
    // }
    //
    // func paymentManager(_ paymentManager: PaymentManager, didFail payment: Payment, withError error: Error) {
    //     print("[SquareMobilePayments] Payment failed: \(error.localizedDescription)")
    //     currentPaymentCompletion?(.failure(error))
    //     currentPaymentCompletion = nil
    // }
    //
    // func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
    //     print("[SquareMobilePayments] Payment cancelled by user")
    //     let error = NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
    //         NSLocalizedDescriptionKey: "Payment was cancelled by user"
    //     ])
    //     currentPaymentCompletion?(.failure(error))
    //     currentPaymentCompletion = nil
    // }
}

// Temporary response struct for backend payment processing
struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}



