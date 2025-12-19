import Foundation

// Square Payment Service - processes payments through backend
// The backend handles Square API integration with stored OAuth tokens
// For Square Kiosk hardware, payments are processed server-side
// 
// SIMULATION MODE: Until Square Mobile SDK is set up, this simulates
// Square Kiosk hardware interactions for testing

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    // Set to true to use simulation mode (dummy transactions)
    // Set to false to use real backend Square API integration
    private let useSimulation = true
    
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
        
        if useSimulation {
            // SIMULATION MODE: Simulate Square Kiosk hardware
            return try await simulateSquareKioskPayment(donationId: donationId, amount: amount)
        } else {
            // REAL MODE: Process payment through backend
            return try await processRealPayment(donationId: donationId, amount: amount)
        }
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
    
    // Real payment processing through backend
    private func processRealPayment(
        donationId: String,
        amount: Double
    ) async throws -> PaymentResult {
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

