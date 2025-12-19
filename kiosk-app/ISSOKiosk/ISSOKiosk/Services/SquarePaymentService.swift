import Foundation
import UIKit

// Square Payment Service - uses Mobile Payments SDK for in-person payments
// The SDK handles card detection from Square hardware (tap/chip)
// Payment is processed directly by Mobile Payments SDK

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    // Use the same PaymentResult type as SquareMobilePaymentsService
    typealias PaymentResult = SquareMobilePaymentsService.PaymentResult
    
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
    
}

