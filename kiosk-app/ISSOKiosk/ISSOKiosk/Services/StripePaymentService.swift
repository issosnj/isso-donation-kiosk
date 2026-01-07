import Foundation
import UIKit

// Stripe Payment Service - Uses Stripe Terminal SDK
// This service uses Stripe Terminal to take payment directly with M2 reader
class StripePaymentService {
    static let shared = StripePaymentService()
    
    private init() {}
    
    // Use the same PaymentResult type as StripeTerminalService
    typealias PaymentResult = StripeTerminalService.PaymentResult
    
    // Start payment flow using Stripe Terminal SDK
    // This will use Terminal SDK to take payment directly with M2 reader
    func startPayment(
        donationId: String,
        amount: Double,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // First, ensure Stripe Terminal is initialized and connected
        Task {
            do {
                // Get Stripe credentials (connection token + location ID)
                let credentials = try await APIService.shared.getStripeCredentials()
                
                await MainActor.run {
                    // Initialize Stripe Terminal with connection token and location ID
                    StripeTerminalService.shared.initialize(
                        connectionToken: credentials.connectionToken,
                        locationId: credentials.locationId
                    ) { error in
                        if let error = error {
                            completion(.failure(error))
                            return
                        }
                        
                        // Connect to reader if not already connected
                        StripeTerminalService.shared.connectToReader(from: viewController) { error in
                            if let error = error {
                                completion(.failure(error))
                                return
                            }
                            
                            // Create PaymentIntent on backend
                            Task {
                                do {
                                    let paymentIntent = try await APIService.shared.createPaymentIntent(
                                        donationId: donationId,
                                        amount: amount
                                    )
                                    
                                    await MainActor.run {
                                        // Take payment using Stripe Terminal
                                        StripeTerminalService.shared.takePayment(
                                            amount: amount,
                                            paymentIntentId: paymentIntent.paymentIntentId,
                                            from: viewController
                                        ) { result in
                                            switch result {
                                            case .success(let paymentResult):
                                                // Confirm payment intent on backend
                                                Task {
                                                    do {
                                                        let confirmResult = try await APIService.shared.confirmPaymentIntent(
                                                            donationId: donationId,
                                                            paymentIntentId: paymentIntent.paymentIntentId
                                                        )
                                                        
                                                        if confirmResult.success {
                                                            completion(.success(paymentResult))
                                                        } else {
                                                            completion(.failure(NSError(domain: "StripePayment", code: -1, userInfo: [NSLocalizedDescriptionKey: "Payment confirmation failed"])))
                                                        }
                                                    } catch {
                                                        // If payment succeeded on device but confirmation failed, still return success
                                                        if paymentResult.success {
                                                            completion(.success(paymentResult))
                                                        } else {
                                                            completion(.failure(error))
                                                        }
                                                    }
                                                }
                                            case .failure(let error):
                                                completion(.failure(error))
                                            }
                                        }
                                    }
                                } catch {
                                    await MainActor.run {
                                        // Provide more specific error message
                                        let errorMessage: String
                                        if let apiError = error as? APIError {
                                            errorMessage = apiError.localizedDescription
                                        } else if error.localizedDescription.contains("Internal server error") || error.localizedDescription.contains("500") {
                                            errorMessage = "Payment setup failed. Please check Stripe configuration in the admin portal."
                                        } else {
                                            errorMessage = error.localizedDescription
                                        }
                                        completion(.failure(NSError(domain: "StripePayment", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMessage])))
                                    }
                                }
                            }
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    completion(.failure(error))
                }
            }
        }
    }
    
    // Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return StripeTerminalService.shared.isPaymentInProgress()
    }
    
    // Cancel current payment
    func cancelCurrentPayment() {
        StripeTerminalService.shared.cancelCurrentPayment()
    }
}

