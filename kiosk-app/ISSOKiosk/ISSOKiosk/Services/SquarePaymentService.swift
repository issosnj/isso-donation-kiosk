import Foundation

// Square Payment Service - processes payments through backend
// The backend handles Square API integration with stored OAuth tokens
// For Square Kiosk hardware, payments are processed server-side

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    func processPayment(
        donationId: String,
        amount: Double,
        locationId: String
    ) async throws -> PaymentResult {
        // Process payment through backend
        // Backend uses Square API with stored OAuth tokens
        // This works with Square Kiosk hardware connected to the iPad
        
        guard let url = URL(string: "\(Config.apiBaseURL)/donations/process-payment") else {
            throw NSError(domain: "SquarePaymentService", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid API URL"
            ])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Get device token for authentication
        let keychain = KeychainHelper()
        if let token = keychain.load(forKey: "deviceToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Create request body
        let body: [String: Any] = [
            "donationId": donationId,
            "amount": amount,
            "idempotencyKey": "\(donationId)-\(Date().timeIntervalSince1970)"
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "SquarePaymentService", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid response"
            ])
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let errorMessage = errorData?["message"] as? String ?? "Payment processing failed"
            throw NSError(domain: "SquarePaymentService", code: httpResponse.statusCode, userInfo: [
                NSLocalizedDescriptionKey: errorMessage
            ])
        }
        
        let result = try JSONDecoder().decode(ProcessPaymentResponse.self, from: data)
        
        return PaymentResult(
            success: result.success,
            paymentId: result.paymentId,
            error: result.success ? nil : "Payment failed"
        )
    }
}

struct ProcessPaymentResponse: Codable {
    let success: Bool
    let paymentId: String
    let status: String
}

