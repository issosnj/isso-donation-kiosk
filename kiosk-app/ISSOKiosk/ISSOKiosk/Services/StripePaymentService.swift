import Foundation
import UIKit

// Stripe Payment Service - Uses Stripe Terminal SDK
// This service uses Stripe Terminal to take payment directly with M2 reader
class StripePaymentService {
    static let shared = StripePaymentService()
    
    private init() {}
    
    // Use the same PaymentResult type as StripeTerminalService
    typealias PaymentResult = StripeTerminalService.PaymentResult
    
    /// True while a rejected reader attempt is being collected again, before
    /// the donation screen is told the payment failed.
    private var recoveringFromReaderRejection = false
    private var donationCanceled = false
    
    // Start payment flow using Stripe Terminal SDK
    // This will use Terminal SDK to take payment directly with M2 reader
    func startPayment(
        donationId: String,
        amount: Double,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        donationCanceled = false
        recoveringFromReaderRejection = false
        
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
                        
                        self.collectDonation(
                            donationId: donationId,
                            amount: amount,
                            from: viewController,
                            allowFreshIntent: true,
                            completion: completion
                        )
                    }
                }
            } catch {
                await MainActor.run {
                    completion(.failure(error))
                }
            }
        }
    }
    
    /// Connect if needed, create a PaymentIntent, and collect on the reader.
    /// A reader that rejects the wake-up is retried once inside the terminal
    /// service. If that PaymentIntent can no longer be collected, one new
    /// intent is created here — the same thing a second Proceed tap used to do —
    /// without leaving the payment screen.
    private func collectDonation(
        donationId: String,
        amount: Double,
        from viewController: UIViewController,
        allowFreshIntent: Bool,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        let finish: (Result<PaymentResult, Error>) -> Void = { result in
            self.recoveringFromReaderRejection = false
            completion(result)
        }
        
        StripeTerminalService.shared.connectToReader(from: viewController) { error in
            if self.donationCanceled {
                self.recoveringFromReaderRejection = false
                return
            }
            if let error = error, !StripeTerminalService.shared.isReaderConnected() {
                finish(.failure(error))
                return
            }
            
            Task {
                do {
                    let paymentIntent = try await APIService.shared.createPaymentIntent(
                        donationId: donationId,
                        amount: amount
                    )
                    
                    await MainActor.run {
                        if self.donationCanceled {
                            self.recoveringFromReaderRejection = false
                            return
                        }
                        StripeTerminalService.shared.takePayment(
                            amount: amount,
                            clientSecret: paymentIntent.clientSecret,
                            paymentIntentId: paymentIntent.paymentIntentId,
                            from: viewController
                        ) { result in
                            switch result {
                            case .success(let paymentResult):
                                Task {
                                    do {
                                        let confirmResult = try await APIService.shared.confirmPaymentIntent(
                                            donationId: donationId,
                                            paymentIntentId: paymentIntent.paymentIntentId
                                        )
                                        
                                        if confirmResult.success {
                                            finish(.success(paymentResult))
                                        } else {
                                            finish(.failure(NSError(domain: "StripePayment", code: -1, userInfo: [NSLocalizedDescriptionKey: "Payment confirmation failed"])))
                                        }
                                    } catch {
                                        // Card was approved on the reader. Keep the success
                                        // even if the backend confirm call fails.
                                        if paymentResult.success {
                                            finish(.success(paymentResult))
                                        } else {
                                            finish(.failure(error))
                                        }
                                    }
                                }
                            case .failure(let error):
                                if self.donationCanceled {
                                    self.recoveringFromReaderRejection = false
                                    return
                                }
                                if allowFreshIntent && StripeTerminalService.shared.isSilentRetryableReaderError(error) {
                                    self.recoveringFromReaderRejection = true
                                    appLog("↻ Reader rejected the first attempt. Starting a fresh payment on the same screen.", category: "StripePayment")
                                    self.collectDonation(
                                        donationId: donationId,
                                        amount: amount,
                                        from: viewController,
                                        allowFreshIntent: false,
                                        completion: completion
                                    )
                                    return
                                }
                                finish(.failure(error))
                            }
                        }
                    }
                } catch {
                    await MainActor.run {
                        let errorMessage: String
                        if let apiError = error as? APIError {
                            errorMessage = apiError.localizedDescription
                        } else if error.localizedDescription.contains("Internal server error") || error.localizedDescription.contains("500") {
                            errorMessage = "Payment setup failed. Please check Stripe configuration in the admin portal."
                        } else {
                            errorMessage = error.localizedDescription
                        }
                        finish(.failure(NSError(domain: "StripePayment", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMessage])))
                    }
                }
            }
        }
    }
    
    // Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return recoveringFromReaderRejection || StripeTerminalService.shared.isPaymentInProgress()
    }
    
    // Cancel current payment
    func cancelCurrentPayment() {
        donationCanceled = true
        recoveringFromReaderRejection = false
        StripeTerminalService.shared.cancelCurrentPayment()
    }
}

