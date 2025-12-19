import Foundation
import SquareInAppPaymentsSDK

// Square Card Reader Service - handles in-person payments via Square hardware
class SquareCardReader: NSObject, SQIPCardEntryViewControllerDelegate {
    static let shared = SquareCardReader()
    
    private var paymentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private var currentAmount: Double = 0.0
    private var currentDonationId: String = ""
    
    private override init() {
        super.init()
    }
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    // Start payment flow using Mobile Payments SDK
    // This will use PaymentManager to take payment directly with Square Stand
    func startPayment(
        amount: Double,
        donationId: String,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        self.currentAmount = amount
        self.currentDonationId = donationId
        self.paymentCompletion = completion
        
        // TODO: Implement with Mobile Payments SDK
        // 1. Get OAuth access token from backend (temple's Square access token)
        // 2. Authorize SDK with AuthorizationManager
        // 3. Use PaymentManager to take payment
        // 4. PaymentManager will handle Square Stand interaction automatically
        // 5. Return payment result in completion handler
        
        // TEMPORARY: For now, process through backend with manual flow
        // This will be replaced with Mobile Payments SDK PaymentManager
        Task {
            await processPaymentThroughBackend()
        }
    }
    
    // Temporary implementation - will be replaced with Mobile Payments SDK
    private func processPaymentThroughBackend() async {
        // Temporary: Process payment through backend
        // In final implementation, Mobile Payments SDK PaymentManager will handle this
        
        guard let url = URL(string: "\(Config.apiBaseURL)/donations/process-payment") else {
            paymentCompletion?(.failure(NSError(domain: "SquareCardReader", code: -1, userInfo: [
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
        
        // Create request body with card nonce
        let body: [String: Any] = [
            "donationId": currentDonationId,
            "amount": currentAmount,
            "idempotencyKey": "\(currentDonationId)-\(Date().timeIntervalSince1970)",
            // Note: Mobile Payments SDK doesn't use nonces - it processes payment directly
            // This is temporary until we implement Mobile Payments SDK
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NSError(domain: "SquareCardReader", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid response"
                ])
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                let errorMessage = errorData?["message"] as? String ?? "Payment processing failed"
                throw NSError(domain: "SquareCardReader", code: httpResponse.statusCode, userInfo: [
                    NSLocalizedDescriptionKey: errorMessage
                ])
            }
            
            let result = try JSONDecoder().decode(ProcessPaymentResponse.self, from: data)
            
            await MainActor.run {
                paymentCompletion?(.success(PaymentResult(
                    success: result.success,
                    paymentId: result.paymentId,
                    error: result.success ? nil : "Payment failed"
                )))
            }
        } catch {
            await MainActor.run {
                paymentCompletion?(.failure(error))
            }
        }
    }
}

struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}

