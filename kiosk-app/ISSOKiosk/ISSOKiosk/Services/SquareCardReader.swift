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
    
    // Start payment flow - shows card entry UI and listens for card interactions
    func startPayment(
        amount: Double,
        donationId: String,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        self.currentAmount = amount
        self.currentDonationId = donationId
        self.paymentCompletion = completion
        
        // Create card entry view controller
        let cardEntryViewController = SQIPCardEntryViewController()
        cardEntryViewController.delegate = self
        
        // Configure for in-person payments (tap/chip)
        // The SDK will automatically detect Square hardware and use it
        
        // Present the card entry view
        // Note: This needs to be presented from a UIViewController
        // We'll need to get the root view controller from the app
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(cardEntryViewController, animated: true)
            }
        }
    }
    
    // MARK: - SQIPCardEntryViewControllerDelegate
    
    func cardEntryViewController(_ cardEntryViewController: SQIPCardEntryViewController, didCompleteWith cardDetails: SQIPCardDetails) {
        // Card was entered - now process payment
        print("[SquareCardReader] Card entered, processing payment...")
        
        // Dismiss card entry view
        cardEntryViewController.dismiss(animated: true) {
            // Process payment through backend
            Task {
                await self.processPaymentWithCard(cardDetails: cardDetails)
            }
        }
    }
    
    func cardEntryViewController(_ cardEntryViewController: SQIPCardEntryViewController, didFailWith error: Error) {
        // Card entry failed
        print("[SquareCardReader] Card entry failed: \(error.localizedDescription)")
        
        cardEntryViewController.dismiss(animated: true) {
            self.paymentCompletion?(.failure(error))
        }
    }
    
    private func processPaymentWithCard(cardDetails: SQIPCardDetails) async {
        // Process payment through backend using the card nonce
        // The backend will use Square Payments API to charge the card
        
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
            "sourceId": cardDetails.nonce // Card nonce from Square SDK
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

