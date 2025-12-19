import Foundation
// TODO: Import Mobile Payments SDK when package is added
// The correct package URL needs to be found from Square's iOS documentation
// import SquareMobilePaymentsSDK

// Square Mobile Payments SDK Service
// This service handles in-person payments with Square Stand using Mobile Payments SDK
//
// Reference: https://developer.squareup.com/docs/mobile-payments-sdk/ios
//
// ⚠️ REQUIREMENT: Kiosk must be ATTENDED (in line of sight, during business hours, with trained staff)
// See: https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations

class SquareMobilePaymentsService {
    static let shared = SquareMobilePaymentsService()
    
    private var isAuthorized = false
    private var accessToken: String?
    private var locationId: String?
    
    private init() {}
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    // Authorize Mobile Payments SDK with OAuth access token and location ID
    func authorize(accessToken: String, locationId: String) async throws {
        self.accessToken = accessToken
        self.locationId = locationId
        
        // TODO: Implement with Mobile Payments SDK
        // 1. Import SquareMobilePaymentsSDK
        // 2. Use AuthorizationManager to authorize:
        //    let authorizationManager = AuthorizationManager()
        //    try await authorizationManager.authorize(
        //        accessToken: accessToken,
        //        locationId: locationId
        //    )
        // 3. Set isAuthorized = true
        
        print("[SquareMobilePayments] Authorization requested (SDK integration pending)")
        print("[SquareMobilePayments] Access Token: \(accessToken.prefix(8))...")
        print("[SquareMobilePayments] Location ID: \(locationId)")
        
        // Temporary: Mark as authorized for now
        isAuthorized = true
    }
    
    // Take payment using Mobile Payments SDK PaymentManager
    // This will automatically detect Square Stand and process payment when user taps/chips card
    func takePayment(
        amount: Double,
        donationId: String,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        guard isAuthorized, let accessToken = accessToken, let locationId = locationId else {
            completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "SDK not authorized. Call authorize() first."
            ])))
            return
        }
        
        // TODO: Implement with Mobile Payments SDK
        // 1. Use PaymentManager to take payment:
        //    let paymentManager = PaymentManager()
        //    let paymentRequest = PaymentRequest(
        //        amount: Money(amount: Int64(amount * 100), currency: .usd),
        //        referenceId: donationId
        //    )
        //    
        //    paymentManager.takePayment(paymentRequest) { result in
        //        switch result {
        //        case .success(let payment):
        //            completion(.success(PaymentResult(
        //                success: true,
        //                paymentId: payment.id,
        //                error: nil
        //            )))
        //        case .failure(let error):
        //            completion(.failure(error))
        //        }
        //    }
        //
        // The SDK will:
        // - Automatically detect Square Stand
        // - Show payment UI
        // - Wait for user to tap/chip card
        // - Process payment
        // - Return result
        
        print("[SquareMobilePayments] Payment requested: $\(amount) for donation \(donationId)")
        print("[SquareMobilePayments] Mobile Payments SDK integration pending")
        
        // TEMPORARY: For now, process through backend
        // This will be replaced with Mobile Payments SDK PaymentManager
        Task {
            await processPaymentThroughBackend(
                amount: amount,
                donationId: donationId,
                completion: completion
            )
        }
    }
    
    // Temporary: Process payment through backend until Mobile Payments SDK is integrated
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
        
        // Get device token for authentication
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
}

struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}

