import SwiftUI

struct PaymentView: View {
    let amount: Double
    let category: DonationCategory?
    let donorName: String?
    let donorEmail: String?
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
        guard let templeId = appState.temple?.id,
              let deviceId = appState.deviceId else {
            paymentStatus = .failure("Device not properly activated")
            return
        }
        
        isProcessing = true
        
        Task {
            do {
                // 1. Initiate donation
                let donation = try await APIService.shared.initiateDonation(
                    templeId: templeId,
                    deviceId: deviceId,
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
                    squarePaymentId: paymentResult.paymentId ?? "",
                    status: paymentResult.success ? "SUCCEEDED" : "FAILED",
                    donorName: donorName,
                    donorEmail: donorEmail
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
        VStack(spacing: 40) {
            Image(systemName: "creditcard")
                .font(.system(size: 100))
                .foregroundColor(.blue)
            
            Text("Ready to Process Payment")
                .font(.system(size: 32, weight: .bold))
            
            Text("$\(String(format: "%.2f", amount))")
                .font(.system(size: 64, weight: .bold))
                .foregroundColor(.blue)
            
            Text("Tap or insert your card")
                .font(.system(size: 20))
                .foregroundColor(.secondary)
            
            Button(action: onStart) {
                Text("Start Payment")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(Color.blue)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 40)
        }
        .padding()
    }
}

struct ProcessingView: View {
    let amount: Double
    
    var body: some View {
        VStack(spacing: 40) {
            ProgressView()
                .scaleEffect(2.5)
                .tint(.blue)
            
            Text("Processing Payment...")
                .font(.system(size: 28, weight: .semibold))
            
            Text("$\(String(format: "%.2f", amount))")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.blue)
            
            Text("Please wait")
                .font(.system(size: 18))
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct PaymentResultView: View {
    let status: PaymentView.PaymentStatus
    let amount: Double
    let onDismiss: () -> Void
    @State private var autoDismissTimer: Timer?
    
    var body: some View {
        VStack(spacing: 40) {
            switch status {
            case .success:
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.green)
                
                Text("Thank You!")
                    .font(.system(size: 36, weight: .bold))
                
                Text("Your donation of $\(String(format: "%.2f", amount)) has been processed successfully.")
                    .font(.system(size: 20))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .foregroundColor(.secondary)
            case .failure(let error):
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.red)
                
                Text("Payment Failed")
                    .font(.system(size: 36, weight: .bold))
                
                Text(error)
                    .font(.system(size: 18))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            Button(action: onDismiss) {
                Text(status == PaymentView.PaymentStatus.success ? "Done" : "Try Again")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(status == PaymentView.PaymentStatus.success ? Color.green : Color.blue)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 40)
        }
        .padding()
        .onAppear {
            // Auto-dismiss after 5 seconds on success
            if case .success = status {
                autoDismissTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { _ in
                    onDismiss()
                }
            }
        }
        .onDisappear {
            autoDismissTimer?.invalidate()
        }
    }
}

