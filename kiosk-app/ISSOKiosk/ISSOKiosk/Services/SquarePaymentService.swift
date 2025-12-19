import Foundation
import SquareInAppPaymentsSDK

// Square Payment Service - uses Mobile Payments SDK for in-person payments
// The SDK handles card detection from Square hardware (tap/chip)
// Payment is processed through backend with card nonce

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    // Start payment flow using Square Mobile Payments SDK
    // This will use PaymentManager to take payment directly with Square Stand
    // Note: UIViewController is required by Mobile Payments SDK
    func startPayment(
        donationId: String,
        amount: Double,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // Use Mobile Payments SDK service
        SquareMobilePaymentsService.shared.takePayment(
            amount: amount,
            donationId: donationId,
            from: viewController,
            completion: completion
        )
    }
    
    // Simulate Square Kiosk hardware interaction
    private func simulateSquareKioskPayment(
        donationId: String,
        amount: Double
    ) async throws -> PaymentResult {
        print("[SquarePaymentService] SIMULATION MODE: Simulating Square Kiosk payment")
        
        // Step 1: Wait for card detection (simulate Square Kiosk detecting card)
        print("[SquarePaymentService] Waiting for card detection...")
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Step 2: Simulate card being read
        print("[SquarePaymentService] Card detected, processing payment...")
        try await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds for processing
        
        // Step 3: Simulate payment result (90% success rate for testing)
        let success = Double.random(in: 0...1) < 0.9
        
        if success {
            print("[SquarePaymentService] Payment successful (simulated)")
            return PaymentResult(
                success: true,
                paymentId: "sq_payment_sim_\(UUID().uuidString)",
                error: nil
            )
        } else {
            print("[SquarePaymentService] Payment failed (simulated)")
            return PaymentResult(
                success: false,
                paymentId: nil,
                error: "Card declined. Please try another card."
            )
        }
    }
    
    // Create Terminal checkout - hardware will automatically pick it up
    private func createTerminalCheckout(
        donationId: String,
        amount: Double
    ) async throws -> CheckoutResult {
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
            let errorMessage = errorData?["message"] as? String ?? "Checkout creation failed"
            throw NSError(domain: "SquarePaymentService", code: httpResponse.statusCode, userInfo: [
                NSLocalizedDescriptionKey: errorMessage
            ])
        }
        
        let result = try JSONDecoder().decode(CreateCheckoutResponse.self, from: data)
        
        return CheckoutResult(
            checkoutId: result.checkoutId,
            status: result.status
        )
    }
    
    // Poll Terminal checkout status until completed
    private func pollTerminalCheckout(checkoutId: String, donationId: String) async throws -> PaymentResult {
        let maxAttempts = 60 // Poll for up to 60 seconds (1 second intervals)
        var attempts = 0
        
        while attempts < maxAttempts {
            // Wait 1 second between polls
            if attempts > 0 {
                try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
            }
            
            guard let url = URL(string: "\(Config.apiBaseURL)/donations/checkout-status/\(checkoutId)?donationId=\(donationId)") else {
                throw NSError(domain: "SquarePaymentService", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid API URL"
                ])
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            // Get device token for authentication
            let keychain = KeychainHelper()
            if let token = keychain.load(forKey: "deviceToken") {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NSError(domain: "SquarePaymentService", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid response"
                ])
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                let errorMessage = errorData?["message"] as? String ?? "Failed to check checkout status"
                throw NSError(domain: "SquarePaymentService", code: httpResponse.statusCode, userInfo: [
                    NSLocalizedDescriptionKey: errorMessage
                ])
            }
            
            let statusResult = try JSONDecoder().decode(CheckoutStatusResponse.self, from: data)
            
            // If checkout is completed, return result
            if statusResult.completed {
                let success = statusResult.status == "COMPLETED"
                return PaymentResult(
                    success: success,
                    paymentId: statusResult.paymentId,
                    error: success ? nil : "Payment failed"
                )
            }
            
            // If checkout was canceled, return failure
            if statusResult.status == "CANCELED" {
                return PaymentResult(
                    success: false,
                    paymentId: nil,
                    error: "Payment was canceled"
                )
            }
            
            attempts += 1
        }
        
        // Timeout - checkout took too long
        return PaymentResult(
            success: false,
            paymentId: nil,
            error: "Payment timeout. Please try again."
        )
    }
}

struct CreateCheckoutResponse: Codable {
    let checkoutId: String
    let status: String
    let message: String?
}

struct CheckoutStatusResponse: Codable {
    let completed: Bool
    let paymentId: String?
    let status: String
}

