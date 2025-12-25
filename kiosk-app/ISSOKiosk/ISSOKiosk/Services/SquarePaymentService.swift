import Foundation
import UIKit

// Square Payment Service - Uses Square Mobile Payments SDK
// This service uses PaymentManager to take payment directly with Square Reader 2nd Gen (Bluetooth)
class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    // Use the same PaymentResult type as SquareMobilePaymentsService
    typealias PaymentResult = SquareMobilePaymentsService.PaymentResult
    
    // Start payment flow using Square Mobile Payments SDK
    // This will use PaymentManager to take payment directly with Square Reader 2nd Gen (Bluetooth)
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
    
    // Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return SquareMobilePaymentsService.shared.isPaymentInProgress()
    }
    
    // Cancel current payment
    func cancelCurrentPayment() {
        SquareMobilePaymentsService.shared.cancelCurrentPayment()
    }
}

