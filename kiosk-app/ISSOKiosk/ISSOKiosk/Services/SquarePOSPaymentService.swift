import Foundation
import UIKit
import SquarePointOfSaleSDK
import Combine

// Square Point of Sale SDK Service (Trial Implementation)
// This service uses SquarePointOfSaleSDK which opens Square POS app
// Based on DonationApp implementation
//
// NOTE: This is a trial implementation alongside Mobile Payments SDK
// The Mobile Payments SDK code is commented out but preserved

class SquarePOSPaymentService: ObservableObject {
    static let shared = SquarePOSPaymentService()
    
    let paymentOutcomeSubject = PassthroughSubject<POSPaymentResult, Never>()
    
    private var currentPaymentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private var isStarting = false
    
    private init() {
        // Set Square Application ID from Info.plist
        if let appId = Bundle.main.infoDictionary?["SQUARE_APPLICATION_ID"] as? String {
            SCCAPIRequest.setApplicationID(appId)
            appLog("✅ Square POS SDK initialized with App ID: \(appId.prefix(15))...", category: "SquarePOS")
        } else {
            appLog("❌ SQUARE_APPLICATION_ID not found in Info.plist", category: "SquarePOS")
        }
    }
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    enum POSPaymentResult {
        case success, canceled, failed
    }
    
    // Launch payment using Square POS SDK
    func takePayment(
        amount: Double,
        donationId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        // Single payment gate
        guard !isStarting else {
            appLog("⚠️ Payment start already in progress (app gate) - ignoring duplicate call", category: "SquarePOS")
            return
        }
        isStarting = true
        currentPaymentCompletion = completion
        
        appLog("💳 Starting POS payment: $\(amount) for donation \(donationId)", category: "SquarePOS")
        
        // Convert amount to cents
        let amountCents = Int(amount * 100)
        
        // Create callback URL
        guard let callbackURL = URL(string: "issokiosk://payment-callback") else {
            appLog("❌ Failed to create callback URL", category: "SquarePOS")
            isStarting = false
            completion(.failure(NSError(domain: "SquarePOS", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to create callback URL"
            ])))
            return
        }
        
        do {
            // Create money object
            let money = try SCCMoney(amountCents: amountCents, currencyCode: "USD")
            
            // Create payment request
            let request = try SCCAPIRequest(
                callbackURL: callbackURL,
                amount: money,
                userInfoString: donationId, // Pass donation ID as user info
                locationID: nil, // Let Square use default location
                notes: "Donation: \(donationId)",
                customerID: nil,
                supportedTenderTypes: .all,
                clearsDefaultFees: false,
                returnsAutomaticallyAfterPayment: true,
                disablesKeyedInCardEntry: false,
                skipsReceipt: false
            )
            
            // Perform payment request (opens Square POS app)
            try SCCAPIConnection.perform(request)
            
            appLog("✅ POS payment request sent - Square POS app should open", category: "SquarePOS")
            
        } catch {
            appLog("❌ POS request error: \(error.localizedDescription)", category: "SquarePOS")
            isStarting = false
            completion(.failure(error))
        }
    }
    
    // Handle callback URL from Square POS app
    func handle(url: URL) {
        appLog("📱 Received callback URL: \(url)", category: "SquarePOS")
        
        do {
            let response = try SCCAPIResponse(responseURL: url)
            
            // Check if there was an error
            if let error = response.error {
                appLog("❌ Payment failed from Square POS: \(error.localizedDescription)", category: "SquarePOS")
                paymentOutcomeSubject.send(.failed)
                
                isStarting = false
                currentPaymentCompletion?(.failure(NSError(domain: "SquarePOS", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: error.localizedDescription
                ])))
                currentPaymentCompletion = nil
                
            } else if let transactionID = response.transactionID {
                // Payment successful
                appLog("✅ Payment successful! Transaction ID: \(transactionID)", category: "SquarePOS")
                paymentOutcomeSubject.send(.success)
                
                isStarting = false
                currentPaymentCompletion?(.success(PaymentResult(
                    success: true,
                    paymentId: transactionID,
                    error: nil
                )))
                currentPaymentCompletion = nil
                
            } else {
                // User canceled (no error, no transaction ID)
                appLog("🚫 Payment canceled by user", category: "SquarePOS")
                paymentOutcomeSubject.send(.canceled)
                
                isStarting = false
                currentPaymentCompletion?(.failure(NSError(domain: "SquarePOS", code: -2, userInfo: [
                    NSLocalizedDescriptionKey: "Payment canceled by user"
                ])))
                currentPaymentCompletion = nil
            }
            
        } catch {
            appLog("❌ Error parsing Square POS response URL: \(error.localizedDescription)", category: "SquarePOS")
            paymentOutcomeSubject.send(.failed)
            
            isStarting = false
            currentPaymentCompletion?(.failure(error))
            currentPaymentCompletion = nil
        }
    }
    
    // Cancel current payment
    func cancelCurrentPayment() {
        appLog("🚫 Cancelling POS payment", category: "SquarePOS")
        isStarting = false
        if let completion = currentPaymentCompletion {
            completion(.failure(NSError(domain: "SquarePOS", code: -2, userInfo: [
                NSLocalizedDescriptionKey: "Payment canceled"
            ])))
            currentPaymentCompletion = nil
        }
    }
    
    // Check if payment is in progress
    func isPaymentInProgress() -> Bool {
        return isStarting
    }
}

