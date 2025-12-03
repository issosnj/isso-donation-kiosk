import SwiftUI

struct PaymentView: View {
    let amount: Double
    let category: DonationCategory?
    let onComplete: () -> Void
    
    @EnvironmentObject var appState: AppState
    @State private var isProcessing = false
    @State private var paymentStatus: PaymentStatus?
    @Environment(\.dismiss) var dismiss
    
    enum PaymentStatus {
        case success
        case failure(String)
    }
    
    var body: some View {
        Group {
            if let status = paymentStatus {
                PaymentResultView(status: status, amount: amount, onDismiss: {
                    paymentStatus = nil
                    onComplete()
                })
            } else if isProcessing {
                ProcessingView(amount: amount)
            } else {
                PaymentProcessingView(
                    amount: amount,
                    onStart: {
                        processPayment()
                    }
                )
            }
        }
    }
    
    private func processPayment() {
        isProcessing = true
        
        Task {
            do {
                // 1. Initiate donation
                let donation = try await APIService.shared.initiateDonation(
                    templeId: appState.temple?.id ?? "",
                    deviceId: "", // Would get from device token
                    amount: amount,
                    categoryId: category?.id
                )
                
                // 2. Process payment with Square Mobile Payments SDK
                // This would integrate with Square Mobile Payments SDK
                // For now, we'll simulate it
                let paymentResult = try await SquarePaymentService.shared.processPayment(
                    amount: amount,
                    locationId: appState.temple?.squareLocationId ?? ""
                )
                
                // 3. Complete donation
                try await APIService.shared.completeDonation(
                    donationId: donation.id,
                    squarePaymentId: paymentResult.paymentId,
                    status: paymentResult.success ? "SUCCEEDED" : "FAILED"
                )
                
                await MainActor.run {
                    isProcessing = false
                    paymentStatus = paymentResult.success ? .success : .failure(paymentResult.error ?? "Payment failed")
                }
            } catch {
                await MainActor.run {
                    isProcessing = false
                    paymentStatus = .failure(error.localizedDescription)
                }
            }
        }
    }
}

struct PaymentProcessingView: View {
    let amount: Double
    let onStart: () -> Void
    
    var body: some View {
        VStack(spacing: 30) {
            Image(systemName: "creditcard")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            Text("Ready to Process Payment")
                .font(.title)
                .fontWeight(.bold)
            
            Text("$\(String(format: "%.2f", amount))")
                .font(.system(size: 48))
                .fontWeight(.bold)
            
            Text("Tap or insert your card")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Button(action: onStart) {
                Text("Start Payment")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
        }
        .padding()
    }
}

struct ProcessingView: View {
    let amount: Double
    
    var body: some View {
        VStack(spacing: 30) {
            ProgressView()
                .scaleEffect(2)
            
            Text("Processing Payment...")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("$\(String(format: "%.2f", amount))")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Please wait")
                .font(.body)
                .foregroundColor(.secondary)
        }
    }
}

struct PaymentResultView: View {
    let status: PaymentView.PaymentStatus
    let amount: Double
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 30) {
            switch status {
            case .success:
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)
                
                Text("Thank You!")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Your donation of $\(String(format: "%.2f", amount)) has been processed successfully.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            case .failure(let error):
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.red)
                
                Text("Payment Failed")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text(error)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            Button(action: onDismiss) {
                Text(status == .success ? "Done" : "Try Again")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
        }
        .padding()
    }
}

