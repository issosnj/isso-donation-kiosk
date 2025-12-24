import SwiftUI
import SquareMobilePaymentsSDK

// Typealias to avoid conflict with Square SDK's Environment enum
typealias SwiftUIEnvironment = SwiftUI.Environment

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
    let donorAddress: String?
    let onComplete: () -> Void
    @ObservedObject private var languageManager = LanguageManager.shared
    
    @EnvironmentObject var appState: AppState
    @State private var isProcessing = false
    @State private var paymentStatus: PaymentStatus?
    @State private var appearAnimation = false
    @State private var cardPulse = false
    @State private var isReady = false
    @State private var donationId: String? = nil
    @State private var hasStartedPayment = false // Guard against multiple payment attempts
    @SwiftUIEnvironment(\.dismiss) var dismiss: DismissAction
    
    var body: some View {
        ZStack {
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
            
            // Time and Network Status in top right
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, 20)
                        .padding(.top, 7)
                }
                Spacer()
            }
        }
        .onAppear {
            print("[PaymentView] 👁️ View appeared")
            print("[PaymentView] 📊 State - isReady: \(isReady), isProcessing: \(isProcessing)")
            
            appLog("👁️ View appeared", category: "PaymentView")
            appLog("📊 State - isReady: \(isReady), isProcessing: \(isProcessing), hasStartedPayment: \(hasStartedPayment)", category: "PaymentView")
            
            // Guard against multiple payment attempts from rapid onAppear/onDisappear cycles
            guard !hasStartedPayment else {
                appLog("⚠️ Payment already started - ignoring duplicate onAppear", category: "PaymentView")
                return
            }
            
            // Check if there's already a payment in progress in Square SDK
            if SquareMobilePaymentsService.shared.isPaymentInProgress() {
                appLog("⚠️ Payment already in progress in SDK - canceling existing payment", category: "PaymentView")
                SquareMobilePaymentsService.shared.cancelCurrentPayment()
                // Reset state
                isReady = false
                isProcessing = false
                paymentStatus = nil
                hasStartedPayment = false
            }
            
            // Start payment immediately - Square SDK will show its own UI
            // No need for intermediate "Ready" screen
            if !isReady && !isProcessing {
                appLog("✅ Starting payment immediately...", category: "PaymentView")
                hasStartedPayment = true
                isReady = true
                isProcessing = true // Set processing immediately so SDK UI shows
                // Start payment immediately - Square SDK will present its own UI
                processPayment()
            } else {
                print("[PaymentView] ⚠️ Skipping payment start - isReady: \(isReady), isProcessing: \(isProcessing)")
            }
        }
        .onDisappear {
            // Check if payment has actually started in SDK (we got a handle)
            // If payment handle was received, the SDK UI is showing and we should NOT cancel
            let hasActiveHandle = SquareMobilePaymentsService.shared.hasActivePaymentHandle()
            
            appLog("👋 View disappeared - hasActiveHandle: \(hasActiveHandle), isProcessing: \(isProcessing), paymentStatus: \(paymentStatus != nil ? "set" : "nil")", category: "PaymentView")
            
            // Only cancel if payment hasn't actually started (no handle received)
            // If handle was received, the SDK UI is showing and onDisappear is just from the overlay
            if !hasActiveHandle {
                appLog("💡 Payment handle not received - view disappeared before payment started", category: "PaymentView")
                
                // Cancel any in-progress payment attempt in Square SDK
                if SquareMobilePaymentsService.shared.isPaymentInProgress() {
                    appLog("🚫 Cancelling in-progress payment attempt in Square SDK", category: "PaymentView")
                    SquareMobilePaymentsService.shared.cancelCurrentPayment()
                }
                
                // Reset local state
                isReady = false
                isProcessing = false
                hasStartedPayment = false
                
                // Cancel donation if payment hasn't started
                if let donationId = donationId {
                    appLog("⚠️ View dismissed before payment started, canceling donation: \(donationId)", category: "PaymentView")
                    Task {
                        do {
                            _ = try await APIService.shared.cancelDonation(donationId: donationId)
                            appLog("✅ Donation canceled successfully", category: "PaymentView")
                        } catch {
                            appLog("❌ Failed to cancel donation: \(error.localizedDescription)", category: "PaymentView")
                        }
                    }
                }
            } else {
                // Payment handle was received - SDK UI is showing, don't cancel
                appLog("💡 View disappeared but payment has started (SDK UI showing) - not canceling", category: "PaymentView")
                // Don't reset state - let the payment complete or fail naturally
            }
            
            // Handle payment status cleanup (only if payment failed)
            if case .failure = paymentStatus, let donationId = donationId {
                // Payment failed - ensure donation is marked as FAILED (should already be done, but double-check)
                appLog("⚠️ View dismissed after payment failure, ensuring donation is marked as FAILED: \(donationId)", category: "PaymentView")
                Task {
                    do {
                        _ = try await APIService.shared.completeDonation(
                            donationId: donationId,
                            squarePaymentId: "",
                            status: "FAILED",
                            donorName: donorName,
                            donorPhone: donorPhone,
                            donorEmail: donorEmail,
                            donorAddress: donorAddress
                        )
                        appLog("✅ Donation confirmed as FAILED", category: "PaymentView")
                    } catch {
                        appLog("⚠️ Donation may already be updated: \(error.localizedDescription)", category: "PaymentView")
                    }
                }
            }
        }
        .detectTouches() // Detect all user interactions to reset idle timer
    }
    
    private func processPayment() {
        appLog("💳 processPayment() called", category: "PaymentView")
        appLog("📋 Checking prerequisites...", category: "PaymentView")
        
        guard let templeId = appState.temple?.id else {
            appLog("❌ Missing temple ID", category: "PaymentView")
            paymentStatus = .failure("Device not properly activated - missing temple")
            return
        }
        
        guard let deviceId = appState.deviceId else {
            appLog("❌ Missing device ID", category: "PaymentView")
            paymentStatus = .failure("Device not properly activated - missing device")
            return
        }
        
        appLog("✅ Prerequisites OK - templeId: \(templeId), deviceId: \(deviceId)", category: "PaymentView")
        appLog("💰 Amount: $\(amount)", category: "PaymentView")
        appLog("📦 Category: \(category?.name ?? "none")", category: "PaymentView")
        
        isProcessing = true
        appLog("🔄 Starting payment flow...", category: "PaymentView")
        
        Task {
            var currentDonationId: String? = nil
            do {
                print("[PaymentView] 📡 Step 1: Initiating donation with backend...")
                // 1. Initiate donation
                let donation = try await APIService.shared.initiateDonation(
                    templeId: templeId,
                    deviceId: deviceId,
                    amount: amount,
                    categoryId: category?.id
                )
                appLog("✅ Donation initiated: \(donation.id)", category: "PaymentView")
                
                // Store donation ID for potential cancellation
                currentDonationId = donation.id
                await MainActor.run {
                    self.donationId = donation.id
                }
                
                // 2. Start payment using Square Mobile Payments SDK
                // This will show card entry UI and detect card interactions from Square hardware
                // Add small delay to ensure view is fully ready
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
                
                await MainActor.run {
                    print("[PaymentView] 📱 Step 2: Getting UIViewController for SDK...")
                    guard let viewController = UIViewController.topViewController() else {
                        print("[PaymentView] ❌ Failed to get top view controller")
                        self.isProcessing = false
                        self.paymentStatus = .failure("Unable to present payment interface")
                        return
                    }
                    
                    appLog("✅ Got viewController: \(type(of: viewController))", category: "PaymentView")
                    print("[PaymentView] 📱 ViewController isViewLoaded: \(viewController.isViewLoaded)")
                    print("[PaymentView] 📱 ViewController viewIfLoaded: \(viewController.viewIfLoaded != nil ? "loaded" : "not loaded")")
                    
                    // Ensure view is loaded
                    _ = viewController.view
                    
                    print("[PaymentView] 🚀 Step 3: Starting Square SDK payment...")
                    print("[PaymentView] 💡 Cash App Pay will be available if enabled in Square Dashboard")
                    
                    SquarePaymentService.shared.startPayment(
                        donationId: donation.id,
                        amount: amount,
                        from: viewController
                    ) { result in
                        print("[PaymentView] 📬 Payment result received")
                        Task {
                            // Declare paymentResult outside do-catch so it's accessible in catch block
                            var paymentResult: SquarePaymentService.PaymentResult?
                            
                            do {
                                switch result {
                                case .success(let result):
                                    paymentResult = result
                                case .failure(let error):
                                    // Check if this is a payment_already_in_progress error
                                    let errorDescription = error.localizedDescription
                                    let isPaymentInProgressError = errorDescription.contains("payment_already_in_progress") || 
                                                                   (error as NSError).userInfo["NSLocalizedFailureReasonErrorKey"] as? String == "payment_already_in_progress"
                                    
                                    if isPaymentInProgressError {
                                        print("[PaymentView] ⚠️ Payment already in progress error - canceling and retrying...")
                                        // Cancel any existing payment
                                        SquareMobilePaymentsService.shared.cancelCurrentPayment()
                                        // Wait a moment for SDK to clear state
                                        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                                        // Reset state and retry
                                        await MainActor.run {
                                            self.hasStartedPayment = false
                                            self.isProcessing = false
                                            self.isReady = false
                                        }
                                        // Retry payment
                                        await MainActor.run {
                                            self.hasStartedPayment = true
                                            self.processPayment()
                                        }
                                        return
                                    }
                                    
                                    // Payment failed - mark donation as FAILED
                                    print("[PaymentView] ❌ Payment failed: \(errorDescription)")
                                    do {
                                        _ = try await APIService.shared.completeDonation(
                                            donationId: donation.id,
                                            squarePaymentId: "",
                                            status: "FAILED",
                                            donorName: donorName,
                                            donorPhone: donorPhone,
                                            donorEmail: donorEmail,
                                            donorAddress: donorAddress
                                        )
                                        print("[PaymentView] ✅ Donation marked as FAILED")
                                    } catch {
                                        print("[PaymentView] ⚠️ Failed to update donation status: \(error.localizedDescription)")
                                    }
                                    await MainActor.run {
                                        self.isProcessing = false
                                        self.hasStartedPayment = false
                                        self.paymentStatus = .failure(errorDescription)
                                    }
                                    return
                                }
                                
                                guard let result = paymentResult else {
                                    print("[PaymentView] ❌ Payment result is nil")
                                    await MainActor.run {
                                        self.isProcessing = false
                                        self.paymentStatus = .failure("Payment result is missing")
                                    }
                                    return
                                }
                                
                                // 3. Complete donation
                                print("[PaymentView] 📡 Completing donation with status: \(result.success ? "SUCCEEDED" : "FAILED")")
                                print("[PaymentView] 📡 Payment ID: \(result.paymentId ?? "nil")")
                                _ = try await APIService.shared.completeDonation(
                                    donationId: donation.id,
                                    squarePaymentId: result.paymentId ?? "",
                                    status: result.success ? "SUCCEEDED" : "FAILED",
                                    donorName: donorName,
                                    donorPhone: donorPhone,
                                    donorEmail: donorEmail,
                                    donorAddress: donorAddress
                                )
                                
                                await MainActor.run {
                                    self.isProcessing = false
                                    if result.success {
                                        // Payment succeeded - set success status (will auto-dismiss)
                                        print("[PaymentView] ✅ Payment succeeded, returning to home")
                                        self.paymentStatus = .success
                                    } else {
                                        // Payment failed - show error
                                        print("[PaymentView] ❌ Payment failed: \(result.error ?? "Unknown error")")
                                        self.paymentStatus = .failure(result.error ?? "Payment failed")
                                    }
                                }
                            } catch {
                                // Error during payment completion
                                // If paymentResult.success was true, the payment actually succeeded on Square
                                // So we should still mark it as SUCCEEDED even if the completion API call failed
                                print("[PaymentView] ❌ Error completing donation: \(error.localizedDescription)")
                                if let result = paymentResult {
                                    print("[PaymentView] 🔍 Payment result success: \(result.success)")
                                    print("[PaymentView] 🔍 Payment ID: \(result.paymentId ?? "nil")")
                                    
                                    // If payment actually succeeded on Square, try to complete it again with the payment ID
                                    if result.success, let paymentId = result.paymentId, !paymentId.isEmpty {
                                        print("[PaymentView] 🔄 Retrying completion with payment ID: \(paymentId)")
                                        do {
                                            _ = try await APIService.shared.completeDonation(
                                                donationId: donation.id,
                                                squarePaymentId: paymentId,
                                                status: "SUCCEEDED",
                                                donorName: donorName,
                                                donorPhone: donorPhone,
                                                donorEmail: donorEmail,
                                                donorAddress: donorAddress
                                            )
                                            print("[PaymentView] ✅ Donation marked as SUCCEEDED after retry")
                                            await MainActor.run {
                                                self.isProcessing = false
                                                self.paymentStatus = .success
                                            }
                                        } catch {
                                            print("[PaymentView] ⚠️ Retry also failed: \(error.localizedDescription)")
                                            // Still show success to user since payment went through on Square
                                            await MainActor.run {
                                                self.isProcessing = false
                                                self.paymentStatus = .success
                                            }
                                        }
                                    } else {
                                        // Payment actually failed - mark as FAILED
                                        do {
                                            _ = try await APIService.shared.completeDonation(
                                                donationId: donation.id,
                                                squarePaymentId: result.paymentId ?? "",
                                                status: "FAILED",
                                                donorName: donorName,
                                                donorPhone: donorPhone,
                                                donorEmail: donorEmail,
                                                donorAddress: donorAddress
                                            )
                                            print("[PaymentView] ✅ Donation marked as FAILED after error")
                                        } catch {
                                            print("[PaymentView] ⚠️ Failed to update donation status: \(error.localizedDescription)")
                                        }
                                        await MainActor.run {
                                            self.isProcessing = false
                                            self.paymentStatus = .failure(error.localizedDescription)
                                        }
                                    }
                                } else {
                                    // No payment result - mark as FAILED
                                    print("[PaymentView] ⚠️ No payment result available")
                                    do {
                                        _ = try await APIService.shared.completeDonation(
                                            donationId: donation.id,
                                            squarePaymentId: "",
                                            status: "FAILED",
                                            donorName: donorName,
                                            donorPhone: donorPhone,
                                            donorEmail: donorEmail,
                                            donorAddress: donorAddress
                                        )
                                        print("[PaymentView] ✅ Donation marked as FAILED")
                                    } catch {
                                        print("[PaymentView] ⚠️ Failed to update donation status: \(error.localizedDescription)")
                                    }
                                    await MainActor.run {
                                        self.isProcessing = false
                                        self.paymentStatus = .failure(error.localizedDescription)
                                    }
                                }
                            }
                        }
                    }
                }
            } catch {
                print("[PaymentView] ❌ Error in payment flow: \(error)")
                print("[PaymentView] ❌ Error details: \(error.localizedDescription)")
                // If donation was initiated but payment failed to start, cancel it
                if let donationId = currentDonationId {
                    do {
                        _ = try await APIService.shared.cancelDonation(donationId: donationId)
                        print("[PaymentView] ✅ Donation canceled after payment flow error")
                    } catch {
                        print("[PaymentView] ⚠️ Failed to cancel donation: \(error.localizedDescription)")
                    }
                }
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
    @SwiftUIEnvironment(\.dismiss) var dismiss: DismissAction
    
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
            Text("processingPayment".localized)
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
    @EnvironmentObject var appState: AppState
    @State private var appearAnimation = false
    @State private var autoDismissTimer: Timer?
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String?, defaultColor: Color = Color(red: 0.26, green: 0.20, blue: 0.20)) -> Color {
        guard let hex = hex, !hex.isEmpty else {
            return defaultColor
        }
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6,
              let rgb = UInt32(hexSanitized, radix: 16) else {
            return defaultColor
        }
        
        let red = Double((rgb >> 16) & 0xFF) / 255.0
        let green = Double((rgb >> 8) & 0xFF) / 255.0
        let blue = Double(rgb & 0xFF) / 255.0
        
        return Color(red: red, green: green, blue: blue)
    }
    
    // Background view matching theme
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        // First try to use asset (local, no network needed)
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
        } else {
            // Final fallback to default gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white,
                    Color(red: 0.95, green: 0.97, blue: 1.0)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }
    
    // Theme colors
    private var headingColor: Color {
        if let theme = appState.temple?.kioskTheme,
           let hex = theme.colors?.headingColor {
            return colorFromHex(hex)
        }
        return Color(red: 0.26, green: 0.20, blue: 0.20) // #423232
    }
    
    private var bodyTextColor: Color {
        Color(red: 0.5, green: 0.5, blue: 0.6)
    }
    
    private var buttonColor: Color {
        Color(red: 1.0, green: 0.58, blue: 0.0) // Orange matching theme
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                backgroundView(geometry: geometry)
            }
            .ignoresSafeArea(.all, edges: .all)
            
            VStack(spacing: 40) {
                Spacer()
                
                // Result icon with animation
                ZStack {
                    // Glow effect - subtle for theme
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    (status == .success ? Color.green : Color.red).opacity(0.2),
                                    Color.clear
                                ]),
                                center: .center,
                                startRadius: 20,
                                endRadius: 120
                            )
                        )
                        .frame(width: 240, height: 240)
                        .scaleEffect(appearAnimation ? 1.1 : 0.8)
                        .opacity(appearAnimation ? 0.5 : 0.0)
                    
                    Image(systemName: status == .success ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 100))
                        .foregroundColor(status == .success ? Color.green : Color.red)
                        .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                }
                .scaleEffect(appearAnimation ? 1.0 : 0.3)
                .opacity(appearAnimation ? 1.0 : 0.0)
                
                VStack(spacing: 20) {
                    Text(status == .success ? "thankYou".localized : "paymentFailed".localized)
                        .font(.custom("Inter-SemiBold", size: 42))
                        .foregroundColor(headingColor)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                    
                    if case .success = status {
                        Text("Your donation of $\(String(format: "%.2f", amount)) has been processed successfully.")
                            .font(.custom("Inter-Regular", size: 20))
                            .foregroundColor(bodyTextColor)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .opacity(appearAnimation ? 1.0 : 0.0)
                            .offset(y: appearAnimation ? 0 : 20)
                    } else if case .failure(let error) = status {
                        Text(error)
                            .font(.custom("Inter-Medium", size: 18))
                            .foregroundColor(Color.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .opacity(appearAnimation ? 1.0 : 0.0)
                            .offset(y: appearAnimation ? 0 : 20)
                    }
                }
                
                // Action button - matching theme orange
                Button(action: onDismiss) {
                    HStack(spacing: 12) {
                        Image(systemName: status == .success ? "checkmark.circle.fill" : "arrow.clockwise")
                            .font(.system(size: 22))
                        Text(status == .success ? "Done" : "Try Again")
                            .font(.custom("Inter-Medium", size: 20))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        status == .success 
                            ? Color.green
                            : buttonColor
                    )
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 40)
                .scaleEffect(appearAnimation ? 1.0 : 0.9)
                .opacity(appearAnimation ? 1.0 : 0.0)
                .offset(y: appearAnimation ? 0 : 30)
                
                Spacer()
            }
            .padding(40)
            
            // Time and Network Status in top right
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, 20)
                        .padding(.top, 7)
                }
                Spacer()
            }
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
    let donorAddress: String?
    let onComplete: () -> Void
    
    var body: some View {
        ModernPaymentView(
            amount: amount,
            category: category,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            donorAddress: donorAddress,
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
