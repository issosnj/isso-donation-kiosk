import SwiftUI

// Payment status enum shared across payment views
enum PaymentStatus: Equatable {
    case success
    case failure(String)
}

struct ModernPaymentView: View {
    let amount: Double
    let category: DonationCategory?
    let donorName: String?
    let donorPhone: String?
    let donorEmail: String?
    let onComplete: () -> Void
    
    @EnvironmentObject var appState: AppState
    @State private var isProcessing = false
    @State private var paymentStatus: PaymentStatus?
    @State private var appearAnimation = false
    @State private var cardPulse = false
    @State private var isReady = false
    @State private var donationId: String? = nil
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Group {
            if let status = paymentStatus {
                // Only show result view for failures - successful payments go directly back
                if case .failure = status {
                    ModernPaymentResultView(
                        status: status,
                        amount: amount,
                        onDismiss: {
                            paymentStatus = nil
                            onComplete()
                        }
                    )
                } else {
                    // Success - go directly back to home
                    Color.clear
                        .onAppear {
                            // Small delay to ensure payment is complete, then return to home
                            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                                paymentStatus = nil
                                onComplete()
                            }
                        }
                }
            } else if isProcessing {
                // While processing, show nothing - Square SDK will show its own UI
                // The SDK UI will overlay on top of this view
                Color.black.opacity(0.01)
                    .ignoresSafeArea()
            } else {
                // Initial state - start payment immediately
                Color.black.opacity(0.01)
                    .ignoresSafeArea()
            }
        }
        .onAppear {
            print("[PaymentView] 👁️ View appeared")
            print("[PaymentView] 📊 State - isReady: \(isReady), isProcessing: \(isProcessing)")
            
            // Start payment immediately - Square SDK will show its own UI
            // No need for intermediate "Ready" screen
            if !isReady && !isProcessing {
                print("[PaymentView] ✅ Starting payment immediately...")
                isReady = true
                isProcessing = true // Set processing immediately so SDK UI shows
                // Start payment immediately - Square SDK will present its own UI
                processPayment()
            } else {
                print("[PaymentView] ⚠️ Skipping payment start - isReady: \(isReady), isProcessing: \(isProcessing)")
            }
        }
        .onDisappear {
            // If user dismisses without completing payment, cancel the donation
            if let donationId = donationId, paymentStatus == nil {
                print("[PaymentView] ⚠️ View dismissed without completing payment, canceling donation: \(donationId)")
                Task {
                    do {
                        _ = try await APIService.shared.cancelDonation(donationId: donationId)
                        print("[PaymentView] ✅ Donation canceled successfully")
                    } catch {
                        print("[PaymentView] ❌ Failed to cancel donation: \(error.localizedDescription)")
                    }
                }
            }
        }
    }
    
    private func processPayment() {
        print("[PaymentView] 💳 processPayment() called")
        print("[PaymentView] 📋 Checking prerequisites...")
        
        guard let templeId = appState.temple?.id else {
            print("[PaymentView] ❌ Missing temple ID")
            paymentStatus = .failure("Device not properly activated - missing temple")
            return
        }
        
        guard let deviceId = appState.deviceId else {
            print("[PaymentView] ❌ Missing device ID")
            paymentStatus = .failure("Device not properly activated - missing device")
            return
        }
        
        print("[PaymentView] ✅ Prerequisites OK - templeId: \(templeId), deviceId: \(deviceId)")
        print("[PaymentView] 💰 Amount: $\(amount)")
        print("[PaymentView] 📦 Category: \(category?.name ?? "none")")
        
        isProcessing = true
        print("[PaymentView] 🔄 Starting payment flow...")
        
        Task {
            do {
                print("[PaymentView] 📡 Step 1: Initiating donation with backend...")
                // 1. Initiate donation
                let donation = try await APIService.shared.initiateDonation(
                    templeId: templeId,
                    deviceId: deviceId,
                    amount: amount,
                    categoryId: category?.id
                )
                print("[PaymentView] ✅ Donation initiated: \(donation.id)")
                
                // Store donation ID for potential cancellation
                await MainActor.run {
                    self.donationId = donation.id
                }
                
                // 2. Start payment using Square Mobile Payments SDK
                // This will show card entry UI and detect card interactions from Square hardware
                await MainActor.run {
                    print("[PaymentView] 📱 Step 2: Getting UIViewController for SDK...")
                    guard let viewController = UIViewController.topViewController() else {
                        print("[PaymentView] ❌ Failed to get top view controller")
                        self.isProcessing = false
                        self.paymentStatus = .failure("Unable to present payment interface")
                        return
                    }
                    
                    print("[PaymentView] ✅ Got viewController: \(type(of: viewController))")
                    print("[PaymentView] 🚀 Step 3: Starting Square SDK payment...")
                    
                    SquarePaymentService.shared.startPayment(
                        donationId: donation.id,
                        amount: amount,
                        from: viewController
                    ) { result in
                        print("[PaymentView] 📬 Payment result received")
                        Task {
                            do {
                                let paymentResult: SquarePaymentService.PaymentResult
                                
                                switch result {
                                case .success(let result):
                                    paymentResult = result
                                case .failure(let error):
                                    await MainActor.run {
                                        self.isProcessing = false
                                        self.paymentStatus = .failure(error.localizedDescription)
                                    }
                                    return
                                }
                                
                                // 3. Complete donation
                                _ = try await APIService.shared.completeDonation(
                                    donationId: donation.id,
                                    squarePaymentId: paymentResult.paymentId ?? "",
                                    status: paymentResult.success ? "SUCCEEDED" : "FAILED",
                                    donorName: donorName,
                                    donorPhone: donorPhone,
                                    donorEmail: donorEmail
                                )
                                
                                await MainActor.run {
                                    self.isProcessing = false
                                    if paymentResult.success {
                                        // Payment succeeded - set success status (will auto-dismiss)
                                        print("[PaymentView] ✅ Payment succeeded, returning to home")
                                        self.paymentStatus = .success
                                    } else {
                                        // Payment failed - show error
                                        print("[PaymentView] ❌ Payment failed: \(paymentResult.error ?? "Unknown error")")
                                        self.paymentStatus = .failure(paymentResult.error ?? "Payment failed")
                                    }
                                }
                            } catch {
                                await MainActor.run {
                                    self.isProcessing = false
                                    self.paymentStatus = .failure(error.localizedDescription)
                                }
                            }
                        }
                    }
                }
            } catch {
                print("[PaymentView] ❌ Error in payment flow: \(error)")
                print("[PaymentView] ❌ Error details: \(error.localizedDescription)")
                await MainActor.run {
                    isProcessing = false
                    paymentStatus = .failure(error.localizedDescription)
                }
            }
        }
    }
}

// Modern payment ready view - shows waiting for card
// Note: Payment is started automatically when this view appears
// Square SDK will show its own UI and detect card interactions
struct ModernPaymentReadyView: View {
    let amount: Double
    @State private var appearAnimation = false
    @State private var pulseAnimation = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            // Dark background matching Square terminal
            Color.black
                .ignoresSafeArea()
            
            VStack(spacing: 50) {
                Spacer()
                
                // Contactless payment icon with pulse
                ZStack {
                    // Pulsing glow effect
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4),
                                    Color.clear
                                ]),
                                center: .center,
                                startRadius: 20,
                                endRadius: 120
                            )
                        )
                        .frame(width: 240, height: 240)
                        .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                        .opacity(pulseAnimation ? 0.3 : 0.6)
                    
                    // Contactless icon
                    Image(systemName: "wave.3.right")
                        .font(.system(size: 80))
                        .foregroundColor(.white)
                }
                .scaleEffect(appearAnimation ? 1.0 : 0.5)
                .opacity(appearAnimation ? 1.0 : 0.0)
                
                VStack(spacing: 20) {
                    Text("Ready for Payment")
                        .font(.custom("Inter-SemiBold", size: 42))
                        .foregroundColor(.white)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                    
                    Text("$\(String(format: "%.2f", amount))")
                        .font(.custom("Inter-SemiBold", size: 72))
                        .foregroundColor(.white)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                    
                    Text("Tap or insert your card")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(.gray)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                        .padding(.top, 10)
                }
                
                Spacer()
            }
            .padding(40)
            
            // Cancel button (top left)
            VStack {
                HStack {
                    Button(action: {
                        withAnimation {
                            dismiss()
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "xmark")
                            Text("Cancel")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                        .cornerRadius(10)
                    }
                    .padding()
                    Spacer()
                }
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
            
            // Continuous pulse animation
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulseAnimation = true
            }
            
            // Note: Payment is started automatically when this view appears
            // Square Mobile Payments SDK will show its own card entry UI
            // and detect card interactions from Square hardware automatically
            // User can tap or insert card, and SDK will process it
        }
    }
}

// Modern payment processing view
struct ModernPaymentProcessingView: View {
    let amount: Double
    let onStart: () -> Void
    @State private var appearAnimation = false
    @State private var cardRotation = 0.0
    
    var body: some View {
        ZStack {
            // Modern gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.92, green: 0.96, blue: 1.0),
                    Color(red: 0.88, green: 0.94, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 50) {
                // Animated card icon
                ZStack {
                    // Glow effect
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.3),
                                    Color.clear
                                ]),
                                center: .center,
                                startRadius: 20,
                                endRadius: 100
                            )
                        )
                        .frame(width: 200, height: 200)
                        .scaleEffect(appearAnimation ? 1.2 : 0.8)
                        .opacity(appearAnimation ? 0.6 : 0.0)
                    
                    // Card icon
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 120))
                        .foregroundStyle(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .rotation3DEffect(
                            .degrees(cardRotation),
                            axis: (x: 0, y: 1, z: 0)
                        )
                        .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4), radius: 20, x: 0, y: 10)
                }
                .scaleEffect(appearAnimation ? 1.0 : 0.5)
                .opacity(appearAnimation ? 1.0 : 0.0)
                
                VStack(spacing: 15) {
            Text("Ready to Process Payment")
                        .font(.custom("Inter-SemiBold", size: 38))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
            
            Text("$\(String(format: "%.2f", amount))")
                        .font(.custom("Inter-SemiBold", size: 72))
                        .foregroundStyle(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
            
            Text("Tap or insert your card")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundColor(.gray)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                }
                
                // Start payment button
            Button(action: onStart) {
                    HStack(spacing: 15) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 28))
                Text("Start Payment")
                            .font(.custom("Inter-SemiBold", size: 24))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color(red: 0.2, green: 0.4, blue: 0.8),
                                Color(red: 0.3, green: 0.5, blue: 0.9)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(20)
                    .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4), radius: 15, x: 0, y: 8)
                }
                .padding(.horizontal, 40)
                .scaleEffect(appearAnimation ? 1.0 : 0.9)
                .opacity(appearAnimation ? 1.0 : 0.0)
                .offset(y: appearAnimation ? 0 : 30)
            }
            .padding(40)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
            
            // Continuous card rotation animation
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                cardRotation = 360
            }
        }
    }
}

// Modern processing view
struct ModernProcessingView: View {
    let amount: Double
    @State private var rotationAngle: Double = 0
    
    var body: some View {
        ZStack {
            // Modern gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.92, green: 0.96, blue: 1.0),
                    Color(red: 0.88, green: 0.94, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 50) {
                // Animated progress indicator
                ZStack {
                    // Outer ring
                    Circle()
                        .stroke(
                            Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.2),
                            lineWidth: 12
                        )
                        .frame(width: 150, height: 150)
                    
                    // Animated progress ring
                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            style: StrokeStyle(lineWidth: 12, lineCap: .round)
                        )
                        .frame(width: 150, height: 150)
                        .rotationEffect(.degrees(rotationAngle))
                    
                    // Center icon
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 50))
                        .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                }
                
                VStack(spacing: 15) {
            Text("Processing Payment...")
                        .font(.custom("Inter-SemiBold", size: 32))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
            
            Text("$\(String(format: "%.2f", amount))")
                        .font(.custom("Inter-SemiBold", size: 56))
                        .foregroundStyle(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
            
            Text("Please wait")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.gray)
                }
            }
            .padding(40)
        }
        .onAppear {
            withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                rotationAngle = 360
            }
        }
    }
}

// Modern payment result view
struct ModernPaymentResultView: View {
    let status: PaymentStatus
    let amount: Double
    let onDismiss: () -> Void
    @State private var appearAnimation = false
    @State private var autoDismissTimer: Timer?
    
    var body: some View {
        ZStack {
            // Modern gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.92, green: 0.96, blue: 1.0),
                    Color(red: 0.88, green: 0.94, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
        VStack(spacing: 40) {
                // Result icon with animation
                ZStack {
                    // Glow effect
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    (status == .success ? Color.green : Color.red).opacity(0.3),
                                    Color.clear
                                ]),
                                center: .center,
                                startRadius: 20,
                                endRadius: 120
                            )
                        )
                        .frame(width: 240, height: 240)
                        .scaleEffect(appearAnimation ? 1.2 : 0.8)
                        .opacity(appearAnimation ? 0.6 : 0.0)
                    
                    Image(systemName: status == .success ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 120))
                        .foregroundColor(status == .success ? .green : .red)
                        .shadow(color: (status == .success ? Color.green : Color.red).opacity(0.4), radius: 20, x: 0, y: 10)
                }
                .scaleEffect(appearAnimation ? 1.0 : 0.3)
                .opacity(appearAnimation ? 1.0 : 0.0)
                
                VStack(spacing: 20) {
                    Text(status == .success ? "Thank You!" : "Payment Failed")
                        .font(.custom("Inter-SemiBold", size: 48))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                    
                    if case .success = status {
                Text("Your donation of $\(String(format: "%.2f", amount)) has been processed successfully.")
                            .font(.system(size: 22, weight: .regular))
                            .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                            .opacity(appearAnimation ? 1.0 : 0.0)
                            .offset(y: appearAnimation ? 0 : 20)
                    } else if case .failure(let error) = status {
                        Text(error)
                            .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                            .opacity(appearAnimation ? 1.0 : 0.0)
                            .offset(y: appearAnimation ? 0 : 20)
                    }
            }
            
                // Action button
            Button(action: onDismiss) {
                    HStack(spacing: 12) {
                        Image(systemName: status == .success ? "checkmark.circle.fill" : "arrow.clockwise")
                            .font(.system(size: 24))
                Text(status == .success ? "Done" : "Try Again")
                            .font(.custom("Inter-SemiBold", size: 24))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(
                        Group {
                            if status == .success {
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.green,
                                        Color.green.opacity(0.8)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            } else {
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.2, green: 0.4, blue: 0.8),
                                        Color(red: 0.3, green: 0.5, blue: 0.9)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            }
                        }
                    )
                    .cornerRadius(20)
                    .shadow(
                        color: (status == .success ? Color.green : Color(red: 0.2, green: 0.4, blue: 0.8)).opacity(0.4),
                        radius: 15,
                        x: 0,
                        y: 8
                    )
                }
                .padding(.horizontal, 40)
                .scaleEffect(appearAnimation ? 1.0 : 0.9)
                .opacity(appearAnimation ? 1.0 : 0.0)
                .offset(y: appearAnimation ? 0 : 30)
            }
            .padding(40)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
            
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

// Keep old views for compatibility
struct PaymentView: View {
    let amount: Double
    let category: DonationCategory?
    let donorName: String?
    let donorPhone: String?
    let donorEmail: String?
    let onComplete: () -> Void
    
    var body: some View {
        ModernPaymentView(
            amount: amount,
            category: category,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            onComplete: onComplete
        )
    }
}

struct PaymentProcessingView: View {
    let amount: Double
    let onStart: () -> Void
    
    var body: some View {
        ModernPaymentProcessingView(amount: amount, onStart: onStart)
    }
}

struct ProcessingView: View {
    let amount: Double
    
    var body: some View {
        ModernProcessingView(amount: amount)
    }
}

struct PaymentResultView: View {
    let status: PaymentStatus
    let amount: Double
    let onDismiss: () -> Void
    
    var body: some View {
        ModernPaymentResultView(status: status, amount: amount, onDismiss: onDismiss)
    }
}
