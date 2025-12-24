import Foundation
import UIKit

// Square Payment Service - TRIAL: Using SquarePointOfSaleSDK
// This is a trial implementation to test if POS SDK works better than Mobile Payments SDK
//
// NOTE: Mobile Payments SDK code is preserved but commented out below

// MARK: - TRIAL: Using SquarePointOfSaleSDK (POS SDK)
// This opens Square POS app for payment processing
class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    // Use PaymentResult type from POS SDK service
    typealias PaymentResult = SquarePOSPaymentService.PaymentResult
    
    // Start payment flow using Square POS SDK (TRIAL)
    // This will open Square POS app for payment
    func startPayment(
        donationId: String,
        amount: Double,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // Use POS SDK service (TRIAL)
        SquarePOSPaymentService.shared.takePayment(
            amount: amount,
            donationId: donationId,
            from: viewController,
            completion: completion
        )
    }
    
    // Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return SquarePOSPaymentService.shared.isPaymentInProgress()
    }
    
    // Cancel current payment
    func cancelCurrentPayment() {
        SquarePOSPaymentService.shared.cancelCurrentPayment()
    }
}

// MARK: - COMMENTED OUT: Mobile Payments SDK Implementation
/*
// Original implementation using Mobile Payments SDK
// This is preserved for easy switching back if needed

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
*/

