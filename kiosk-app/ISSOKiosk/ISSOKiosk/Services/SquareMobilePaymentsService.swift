import Foundation
import UIKit
import SquareMobilePaymentsSDK

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
                completion(nil)
            }
        }
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



