import SwiftUI
import UIKit

// Typealias to avoid conflict with SDK's Environment enum
typealias SwiftUIEnvironment = SwiftUI.Environment

// Payment status enum shared across payment views
enum PaymentStatus: Equatable {
    case success
    case failure(String)
}

struct ModernPaymentView: View {
    let amount: Double
    let category: DonationCategory?
    /// When set, persisted on the donation and shown on email/PDF receipts as line items.
    let lineItems: [DonationLineItemBody]?
    /// Primary `categoryId` on the donation record; defaults to `category?.id` when nil.
    let donationRecordCategoryId: String?
    let donorName: String?
    let donorPhone: String?
    let donorEmail: String?
    let donorAddress: String?
    /// When true, backend marks donation anonymous and skips donor CRM profile from placeholder phone.
    let submittedAsAnonymous: Bool
    let onComplete: () -> Void
    let onCancel: (() -> Void)? // Optional callback for cancel action
    @ObservedObject private var languageManager = LanguageManager.shared
    
    @EnvironmentObject var appState: AppState
    @State private var isProcessing = false
    @State private var paymentStatus: PaymentStatus?
    @State private var appearAnimation = false
    @State private var cardPulse = false
    @State private var isReady = false
    @State private var donationId: String? = nil
    @State private var hasStartedPayment = false // Guard against multiple payment attempts
    @State private var isStartingPayment = false // Synchronous flag to prevent race conditions
    @SwiftUIEnvironment(\.dismiss) var dismiss: DismissAction
    
    var body: some View {
        ZStack {
            Group {
                if let status = paymentStatus {
                    // Show result view for both success and failure
                    ModernPaymentResultView(
                        status: status,
                        amount: amount,
                        onDismiss: {
                            paymentStatus = nil
                            // For success, go back to home (onComplete)
                            // For failure, go back to review donation screen (onCancel)
                            if case .success = status {
                                onComplete()
                            } else {
                                // Failure - use onCancel to return to review donation screen with details preserved
                                if let onCancel = onCancel {
                                    onCancel()
                                } else {
                                    dismiss()
                                }
                            }
                        }
                    )
                } else if isProcessing || hasStartedPayment {
                    // While processing, show loading UI - Stripe SDK will show its own UI when ready
                    // The SDK UI will overlay on top of this view
                    ModernProcessingView(
                        amount: amount,
                        onCancel: {
                            cancelPayment()
                        }
                    )
                } else {
                    // Initial state - show loading while starting payment
                    ModernProcessingView(
                        amount: amount,
                        onCancel: {
                            cancelPayment()
                        }
                    )
                }
            }
            
            // Time and Network Status in top right
            // Reader Battery Status in top left
            VStack {
                HStack {
                    ReaderBatteryStatusView()
                        .padding(.leading, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                    Spacer()
                }
                Spacer()
            }
            
            // Time and Network Status in top right
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                }
                Spacer()
            }
        }
        .onAppear {
            // Reset state if no payment is actually in progress
            if !StripePaymentService.shared.isPaymentInProgress() {
                // If payment isn't active but flags are set, reset them
                if isProcessing && donationId == nil {
                    appLog("🔄 Resetting stale isProcessing flag (no active payment)", category: "PaymentView")
                    isProcessing = false
                }
            }
            
            // Guard against multiple payment attempts
            guard !isStartingPayment && !hasStartedPayment else {
                return
            }
            
            // Set flag immediately to prevent race conditions
            isStartingPayment = true
            
            // Check if there's already a payment in progress
            if StripePaymentService.shared.isPaymentInProgress() {
                StripePaymentService.shared.cancelCurrentPayment()
                // Reset state and wait briefly for SDK to clear
                isReady = false
                isProcessing = false
                paymentStatus = nil
                hasStartedPayment = false
                isStartingPayment = false
                donationId = nil
                Task {
                    try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                    await MainActor.run {
                        if !hasStartedPayment && !isStartingPayment {
                            isStartingPayment = true
                            hasStartedPayment = true
                            isReady = true
                            // Don't set isProcessing here - let processPayment() set it after guard checks
                            processPayment()
                        }
                    }
                }
                return
            }
            
            // Start payment immediately
            if !isReady && !isProcessing {
                hasStartedPayment = true
                isReady = true
                // Don't set isProcessing here - let processPayment() set it after guard checks
                processPayment()
            } else {
                isStartingPayment = false
            }
        }
        .onDisappear {
            // Don't cancel if payment was successful - success view is showing
            if case .success = paymentStatus {
                appLog("✅ View disappeared after successful payment - no cleanup needed", category: "PaymentView")
                return
            }
            
            // For Stripe SDK, check if payment is in progress
            // If payment is processing, Stripe SDK is handling it
            let isPaymentActive = StripePaymentService.shared.isPaymentInProgress()
            
            appLog("👋 View disappeared - isPaymentActive: \(isPaymentActive), isProcessing: \(isProcessing), paymentStatus: \(paymentStatus != nil ? "set" : "nil")", category: "PaymentView")
            
            // Only cancel if payment hasn't actually started
            // If payment is active, Stripe SDK is handling it
            if !isPaymentActive {
                appLog("💡 Payment not active - view disappeared before payment started", category: "PaymentView")
                
                // Cancel any in-progress payment attempt
                if StripePaymentService.shared.isPaymentInProgress() {
                    appLog("🚫 Cancelling in-progress payment attempt", category: "PaymentView")
                    StripePaymentService.shared.cancelCurrentPayment()
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
                // Payment is active - Stripe SDK is handling it, don't cancel
                appLog("💡 View disappeared but payment is active (Stripe SDK processing) - not canceling", category: "PaymentView")
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
                            stripePaymentIntentId: nil,
                            status: "FAILED",
                            donorName: donorName,
                            donorPhone: donorPhone,
                            donorEmail: donorEmail,
                            donorAddress: donorAddress,
                            submittedAsAnonymous: nil
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
    
    private func cancelPayment() {
        appLog("🚫 User cancelled payment", category: "PaymentView")
        
        // Cancel Stripe payment if in progress
        if StripePaymentService.shared.isPaymentInProgress() {
            StripePaymentService.shared.cancelCurrentPayment()
        }
        
        // Cancel donation if it was created
        if let donationId = donationId {
            Task {
                do {
                    _ = try await APIService.shared.cancelDonation(donationId: donationId)
                    appLog("✅ Donation cancelled successfully", category: "PaymentView")
                } catch {
                    appLog("⚠️ Failed to cancel donation: \(error.localizedDescription)", category: "PaymentView")
                }
            }
        }
        
        // Reset state
        isProcessing = false
        hasStartedPayment = false
        isStartingPayment = false
        donationId = nil
        paymentStatus = nil
        
        // Dismiss payment view and return to review donation screen
        // If onCancel callback is provided, use it; otherwise use dismiss()
        if let onCancel = onCancel {
            onCancel()
        } else {
            dismiss()
        }
    }
    
    private func processPayment() {
        // Guard against duplicate calls - check both flags
        guard !isProcessing else {
            appLog("⚠️ Payment already processing - ignoring duplicate call", category: "PaymentView")
            isStartingPayment = false
            return
        }
        
        // Also check if we already have a donation ID (payment already started)
        if donationId != nil {
            appLog("⚠️ Payment already started with donation ID: \(donationId!) - ignoring duplicate call", category: "PaymentView")
            isStartingPayment = false
            return
        }
        
        // Check if Stripe payment is already in progress
        if StripePaymentService.shared.isPaymentInProgress() {
            appLog("⚠️ Stripe payment already in progress - ignoring duplicate call", category: "PaymentView")
            isStartingPayment = false
            return
        }
        
        isStartingPayment = false
        
        guard let templeId = appState.temple?.id else {
            paymentStatus = .failure("Device not properly activated - missing temple")
            return
        }
        
        guard let deviceId = appState.deviceId else {
            paymentStatus = .failure("Device not properly activated - missing device")
            return
        }
        
        // Show loading state immediately
        isProcessing = true
        
        Task {
            var currentDonationId: String? = nil
            do {
                // Initiate donation with backend
                let donation = try await APIService.shared.initiateDonation(
                    templeId: templeId,
                    deviceId: deviceId,
                    amount: amount,
                    categoryId: donationRecordCategoryId ?? category?.id,
                    lineItems: lineItems
                )
                
                // Store donation ID for potential cancellation
                currentDonationId = donation.id
                await MainActor.run {
                    donationId = donation.id
                    // Set isProcessing only after donation is initiated and we're about to start Square payment
                    isProcessing = true
                }
                
                // 2. Start payment using Stripe Terminal SDK
                // Connection will be handled inside startPayment() when needed
                await MainActor.run {
                    guard let viewController = UIViewController.topViewController() else {
                        isProcessing = false
                        paymentStatus = .failure("Unable to present payment interface")
                        return
                    }
                    
                    // Ensure view is loaded
                    _ = viewController.view
                    
                    StripePaymentService.shared.startPayment(
                        donationId: donation.id,
                        amount: amount,
                        from: viewController
                    ) { result in
                        Task {
                            var paymentResult: StripePaymentService.PaymentResult?
                            
                            switch result {
                                case .success(let result):
                                    paymentResult = result
                                case .failure(let error):
                                    let nsError = error as NSError
                                    let errorDescription = error.localizedDescription
                                    let errorCode = nsError.code
                                    let isReaderNotConnected = nsError.userInfo["NSLocalizedFailureReasonErrorKey"] as? String == "reader_not_connected" ||
                                                               errorDescription.lowercased().contains("no reader") ||
                                                               errorDescription.lowercased().contains("reader not connected") ||
                                                               errorDescription.lowercased().contains("connect hardware") ||
                                                               errorDescription.lowercased().contains("hardware") ||
                                                               errorCode == -2
                                    
                                    if isReaderNotConnected {
                                        await MainActor.run {
                                            isProcessing = false
                                            hasStartedPayment = false
                                            paymentStatus = .failure("Reader not connected. Please connect your Stripe M2 reader.")
                                        }
                                        return
                                    }
                                    
                                    // Check if this is a payment_already_in_progress error
                                    let isPaymentInProgressError = errorDescription.contains("payment_already_in_progress") || 
                                                                   errorDescription.contains("already in progress") ||
                                                                   nsError.userInfo["NSLocalizedFailureReasonErrorKey"] as? String == "payment_already_in_progress"
                                    
                                    if isPaymentInProgressError {
                                        StripePaymentService.shared.cancelCurrentPayment()
                                        try? await Task.sleep(nanoseconds: 1_000_000_000)
                                        await MainActor.run {
                                            hasStartedPayment = false
                                            isProcessing = false
                                            isReady = false
                                            hasStartedPayment = true
                                            processPayment()
                                        }
                                        return
                                    }
                                    
                                    // Check if this is a payment setup error (createPaymentIntent failed)
                                    let isSetupError = errorDescription.contains("Payment setup failed") ||
                                                      errorDescription.contains("Internal server error") ||
                                                      errorDescription.contains("500") ||
                                                      errorDescription.contains("Stripe configuration")
                                    
                                    // Payment failed - mark donation as FAILED
                                    do {
                                        _ = try await APIService.shared.completeDonation(
                                            donationId: donation.id,
                                            stripePaymentIntentId: nil,
                                            status: "FAILED",
                                            donorName: donorName,
                                            donorPhone: donorPhone,
                                            donorEmail: donorEmail,
                                            donorAddress: donorAddress,
                                            submittedAsAnonymous: nil
                                        )
                                    } catch {}
                                    await MainActor.run {
                                        isProcessing = false
                                        hasStartedPayment = false
                                        // Show more user-friendly error for setup issues
                                        let userMessage = isSetupError 
                                            ? "Payment setup failed. Please check Stripe configuration in the admin portal."
                                            : errorDescription
                                        paymentStatus = .failure(userMessage)
                                    }
                                    return
                                }
                                
                                guard let result = paymentResult else {
                                    await MainActor.run {
                                        isProcessing = false
                                        paymentStatus = .failure("Payment result is missing")
                                    }
                                    return
                                }
                                
                                // Set paymentStatus immediately if payment succeeded on device
                                // This prevents onDisappear from trying to cancel a succeeded payment
                                if result.success {
                                    await MainActor.run {
                                        paymentStatus = .success
                                        // Record successful donation time for idle detection
                                        appState.recordSuccessfulDonation()
                                    }
                                }
                                
                                // Complete donation on backend (non-blocking after status is set)
                                do {
                                    _ = try await APIService.shared.completeDonation(
                                        donationId: donation.id,
                                        stripePaymentIntentId: result.paymentIntentId,
                                        status: result.success ? "SUCCEEDED" : "FAILED",
                                        donorName: donorName,
                                        donorPhone: donorPhone,
                                        donorEmail: donorEmail,
                                        donorAddress: donorAddress,
                                        submittedAsAnonymous: result.success ? submittedAsAnonymous : nil
                                    )
                                } catch {
                                    // Backend completion failed, but payment already succeeded on device
                                    appLog("⚠️ Payment succeeded on device but backend completion failed: \(error.localizedDescription)", category: "PaymentView")
                                }
                                
                                await MainActor.run {
                                    isProcessing = false
                                    if !result.success {
                                        paymentStatus = .failure(result.error ?? "Payment failed")
                                    }
                                }
                        }
                    }
                }
            } catch {
                // If donation was initiated but payment failed to start, cancel it
                if let donationId = currentDonationId {
                    do {
                        _ = try await APIService.shared.cancelDonation(donationId: donationId)
                    } catch {}
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
                    
                    Text(amount.formattedCurrency())
                        .font(.custom("Inter-SemiBold", size: 72))
                        .foregroundColor(.white)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                    
                    Text("Tap or insert your card")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(.gray)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        .offset(y: appearAnimation ? 0 : 20)
                        .padding(.top, DesignSystem.Spacing.sm + 2)
                }
                
                Spacer()
            }
            .padding(DesignSystem.Spacing.xl + DesignSystem.Spacing.sm)
            
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
            // Stripe Terminal SDK will show its own card entry UI
            // and detect card interactions from Stripe M2 reader automatically
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
            
            Text(amount.formattedCurrency())
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
            .padding(DesignSystem.Spacing.xl + DesignSystem.Spacing.sm)
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

// MARK: - Card tap processing (brands + trust row)

/// Stylized wallet labels (not official trademark artwork). Matches common on-screen presentation.
private struct PaymentProcessingDigitalWalletStrip: View {
    let geometry: GeometryProxy
    
    private func s(_ v: CGFloat) -> CGFloat { geometry.scale(v) }
    
    var body: some View {
        HStack(spacing: s(8)) {
            applePayMark
            googlePayMark
            samsungPayMark
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Apple Pay, Google Pay, Samsung Pay")
    }
    
    private var applePayMark: some View {
        Group {
            if #available(iOS 17.0, *) {
                HStack(spacing: s(5)) {
                    Image(systemName: "apple.logo")
                        .font(.system(size: s(13), weight: .semibold))
                    Text("Pay")
                        .font(.system(size: s(11), weight: .semibold))
                }
                .foregroundStyle(.white)
            } else {
                Text("Apple Pay")
                    .font(.system(size: s(10), weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .padding(.horizontal, s(10))
        .padding(.vertical, s(6))
        .background(RoundedRectangle(cornerRadius: s(5), style: .continuous).fill(Color.black))
        .accessibilityLabel("Apple Pay")
    }
    
    private var googlePayMark: some View {
        HStack(spacing: s(5)) {
            googlePayGlyph
            Text("Pay")
                .font(.system(size: s(11), weight: .semibold))
                .foregroundStyle(Color(red: 0.26, green: 0.32, blue: 0.38))
        }
        .padding(.horizontal, s(9))
        .padding(.vertical, s(6))
        .background(
            RoundedRectangle(cornerRadius: s(5), style: .continuous)
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.08), radius: s(2), x: 0, y: s(1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: s(5), style: .continuous)
                .stroke(Color.black.opacity(0.1), lineWidth: 1)
        )
    }
    
    private var googlePayGlyph: some View {
        ZStack {
            Text("G")
                .font(.system(size: s(14), weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color(red: 0.26, green: 0.52, blue: 0.96),
                            Color(red: 0.13, green: 0.59, blue: 0.95),
                            Color(red: 0.16, green: 0.69, blue: 0.38),
                            Color(red: 0.98, green: 0.75, blue: 0.18),
                            Color(red: 0.92, green: 0.25, blue: 0.21),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
        .frame(width: s(18), height: s(18))
    }
    
    private var samsungPayMark: some View {
        Text("Samsung Pay")
            .font(.system(size: s(10), weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, s(9))
            .padding(.vertical, s(7))
            .background(
                RoundedRectangle(cornerRadius: s(5), style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.04, green: 0.09, blue: 0.45),
                                Color(red: 0.09, green: 0.22, blue: 0.72),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            )
    }
}

/// Animated card tapping a reader — replaces a static spinner for clearer “tap the terminal” guidance.
private struct PaymentProcessingTapAnimation: View {
    let geometry: GeometryProxy
    let burgundy: Color
    let heading: Color
    @State private var cardPressed = false
    
    private func s(_ v: CGFloat) -> CGFloat { geometry.scale(v) }
    
    var body: some View {
        ZStack {
            // Terminal body
            RoundedRectangle(cornerRadius: s(14), style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.38, green: 0.40, blue: 0.44),
                            Color(red: 0.22, green: 0.24, blue: 0.28),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: s(210), height: s(102))
                .overlay(
                    RoundedRectangle(cornerRadius: s(14), style: .continuous)
                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.22), radius: s(12), x: 0, y: s(6))
            
            // Contactless / tap target + LED
            VStack(spacing: s(8)) {
                RoundedRectangle(cornerRadius: s(3), style: .continuous)
                    .fill(Color.black.opacity(0.35))
                    .frame(width: s(120), height: s(5))
                HStack(spacing: s(6)) {
                    Image(systemName: "wave.3.right.circle.fill")
                        .font(.system(size: s(22), weight: .medium))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(burgundy, heading.opacity(0.35))
                    Circle()
                        .fill(cardPressed ? Color.green.opacity(0.95) : Color.orange.opacity(0.55))
                        .frame(width: s(8), height: s(8))
                        .shadow(color: cardPressed ? Color.green.opacity(0.5) : .clear, radius: s(4))
                }
            }
            .offset(y: -s(8))
            
            // Card moves down to “tap” the reader
            Image(systemName: "creditcard.fill")
                .font(.system(size: s(52), weight: .medium))
                .foregroundStyle(
                    LinearGradient(
                        colors: [burgundy, burgundy.opacity(0.82)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: burgundy.opacity(0.35), radius: s(10), x: 0, y: s(4))
                .rotation3DEffect(.degrees(-8), axis: (x: 1, y: 0, z: 0))
                .offset(y: cardPressed ? s(6) : -s(38))
                .scaleEffect(cardPressed ? 0.94 : 1.0)
        }
        .frame(width: s(240), height: s(168))
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                cardPressed = true
            }
        }
    }
}

private struct PaymentProcessingCardBrandStrip: View {
    let geometry: GeometryProxy
    
    private func s(_ v: CGFloat) -> CGFloat { geometry.scale(v) }
    
    var body: some View {
        VStack(spacing: s(12)) {
            HStack(spacing: s(10)) {
                visaMark
                mastercardMark
                amexMark
                discoverMark
            }
            PaymentProcessingDigitalWalletStrip(geometry: geometry)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, Samsung Pay")
    }
    
    private var visaMark: some View {
        Text("VISA")
            .font(.system(size: s(11), weight: .heavy))
            .foregroundStyle(.white)
            .padding(.horizontal, s(10))
            .padding(.vertical, s(6))
            .background(RoundedRectangle(cornerRadius: s(4), style: .continuous).fill(Color(red: 0.05, green: 0.20, blue: 0.65)))
    }
    
    private var mastercardMark: some View {
        ZStack {
            RoundedRectangle(cornerRadius: s(5), style: .continuous)
                .fill(Color.white)
            ZStack {
                Circle()
                    .fill(Color(red: 235 / 255, green: 0 / 255, blue: 27 / 255))
                    .frame(width: s(20), height: s(20))
                    .offset(x: -s(6))
                Circle()
                    .fill(Color(red: 247 / 255, green: 158 / 255, blue: 27 / 255))
                    .frame(width: s(20), height: s(20))
                    .offset(x: s(6))
            }
        }
        .frame(width: s(46), height: s(28))
        .clipShape(RoundedRectangle(cornerRadius: s(5), style: .continuous))
    }
    
    private var amexMark: some View {
        Text("AMEX")
            .font(.system(size: s(9), weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, s(7))
            .padding(.vertical, s(7))
            .background(RoundedRectangle(cornerRadius: s(4), style: .continuous).fill(Color(red: 0, green: 0.44, blue: 0.76)))
    }
    
    private var discoverMark: some View {
        Text("DISC")
            .font(.system(size: s(10), weight: .heavy))
            .foregroundStyle(.white)
            .padding(.horizontal, s(8))
            .padding(.vertical, s(6))
            .background(RoundedRectangle(cornerRadius: s(4), style: .continuous).fill(Color(red: 1.0, green: 0.38, blue: 0.0)))
    }
}

private struct PaymentProcessingSecureBadge: View {
    let geometry: GeometryProxy
    let headingColor: Color
    let accentColor: Color
    
    private func s(_ v: CGFloat) -> CGFloat { geometry.scale(v) }
    
    var body: some View {
        HStack(spacing: s(10)) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: s(20), weight: .semibold))
                .foregroundStyle(accentColor)
            Text("secureEncrypted".localized)
                .font(.custom("Georgia", size: s(17)))
                .foregroundStyle(headingColor.opacity(0.92))
        }
        .padding(.horizontal, s(18))
        .padding(.vertical, s(12))
        .background(
            RoundedRectangle(cornerRadius: s(14), style: .continuous)
                .fill(Color.white.opacity(0.2))
        )
        .overlay(
            RoundedRectangle(cornerRadius: s(14), style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }
}

// Modern processing view — themed glass panel, clear card instructions, brands + secure badge
struct ModernProcessingView: View {
    let amount: Double
    let onCancel: () -> Void
    @EnvironmentObject var appState: AppState
    @State private var appearAnimation = false
    
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
    
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
        } else {
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
    
    private var headingColor: Color {
        if let hex = appState.temple?.kioskTheme?.colors?.headingColor {
            return colorFromHex(hex)
        }
        return Color(red: 0.26, green: 0.20, blue: 0.20)
    }
    
    /// Same fixed red as donation summary **Total** (`DonationDetailsView`) — do not use theme proceed button color (often orange).
    private var burgundyBrand: Color {
        Color(red: 147.0 / 255.0, green: 22.0 / 255.0, blue: 19.0 / 255.0)
    }
    
    private var creamFill: Color {
        Color(red: 242.0 / 255.0, green: 235.0 / 255.0, blue: 224.0 / 255.0)
    }
    
    /// Matches `DonationHomeView` / `DonationDetailsView` glass panel (Step 2 & 3).
    private let glassPanelCorner: CGFloat = 28
    private let glassPanelMaxWidthFraction: CGFloat = 0.94
    private let glassPanelMaxWidthPoints: CGFloat = 1400
    private let glassPanelHorizontalPadding: CGFloat = 56
    private let glassPanelVerticalPadding: CGFloat = 8
    private let glassPanelInternalPadding: CGFloat = 44
    /// Same as `DonationDetailsView` Step 3 panel content top inset.
    private let step3PanelContentTopInset: CGFloat = 20
    
    private var stepLineBrown: Color {
        Color(red: 0.42, green: 0.32, blue: 0.32)
    }
    
    @ViewBuilder
    private func paymentStepHeader(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let lineColor = stepLineBrown.opacity(0.4)
        HStack(spacing: s(16)) {
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
            Text("processingHeading".localized)
                .font(.custom("Georgia", size: s(20)))
                .foregroundColor(stepLineBrown)
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
        }
        .padding(.horizontal, s(40))
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                let s: (CGFloat) -> CGFloat = { geometry.scale($0) }
                let panelMaxWidth = min(geometry.size.width * glassPanelMaxWidthFraction, glassPanelMaxWidthPoints)
                let cancelCorner = s(DesignSystem.Components.buttonCornerRadius)
                
                ZStack {
                    backgroundView(geometry: geometry)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                    
                    // Same top alignment & glass panel placement as Step 2 / Step 3 (`DonationHomeView` / `DonationDetailsView`).
                    ZStack(alignment: .top) {
                        VStack(spacing: 0) {
                            paymentStepHeader(geometry: geometry)
                                .padding(.top, s(78))
                                .padding(.bottom, s(20))
                            
                            VStack(spacing: 0) {
                                // Center: reader animation + prominent total
                                VStack(spacing: 0) {
                                    Spacer(minLength: s(6))
                                    
                                    VStack(spacing: s(22)) {
                                        PaymentProcessingTapAnimation(
                                            geometry: geometry,
                                            burgundy: burgundyBrand,
                                            heading: headingColor
                                        )
                                        .scaleEffect(appearAnimation ? 1.0 : 0.88)
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                        
                                        VStack(spacing: s(14)) {
                                            Text("totalSevaLabel".localized)
                                                .font(.custom("Georgia", size: s(32)))
                                                .fontWeight(.semibold)
                                                .foregroundStyle(headingColor)
                                                .multilineTextAlignment(.center)
                                            Text(amount.formattedCurrency())
                                                .font(.system(size: s(58), weight: .bold, design: .serif))
                                                .foregroundStyle(burgundyBrand)
                                                .monospacedDigit()
                                                .multilineTextAlignment(.center)
                                                .minimumScaleFactor(0.65)
                                                .lineLimit(1)
                                        }
                                        .padding(.vertical, s(30))
                                        .padding(.horizontal, s(36))
                                        .frame(maxWidth: .infinity)
                                        .background(
                                            RoundedRectangle(cornerRadius: s(22), style: .continuous)
                                                .fill(Color.white.opacity(0.5))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: s(22), style: .continuous)
                                                        .fill(creamFill.opacity(0.35))
                                                )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: s(22), style: .continuous)
                                                .stroke(burgundyBrand.opacity(0.35), lineWidth: s(2))
                                        )
                                        .shadow(color: burgundyBrand.opacity(0.18), radius: s(20), x: 0, y: s(10))
                                        .padding(.horizontal, s(4))
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                    }
                                    
                                    Spacer(minLength: s(6))
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                
                                // Bottom: instructions, payment marks, secure badge, cancel
                                VStack(spacing: s(16)) {
                                    Text("processingInstructionsSimple".localized)
                                        .font(.custom("Georgia", size: s(20)))
                                        .foregroundStyle(headingColor.opacity(0.9))
                                        .multilineTextAlignment(.center)
                                        .fixedSize(horizontal: false, vertical: true)
                                        .padding(.horizontal, s(4))
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    VStack(spacing: s(14)) {
                                        PaymentProcessingCardBrandStrip(geometry: geometry)
                                        PaymentProcessingSecureBadge(geometry: geometry, headingColor: headingColor, accentColor: burgundyBrand)
                                    }
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    Button(action: {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        onCancel()
                                    }) {
                                        Text("cancel".localized)
                                            .font(.custom("Georgia", size: s(16)))
                                            .foregroundColor(headingColor)
                                            .frame(maxWidth: .infinity)
                                            .frame(minHeight: s(58), maxHeight: s(58))
                                            .background(
                                                RoundedRectangle(cornerRadius: cancelCorner)
                                                    .fill(creamFill)
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: cancelCorner)
                                                            .fill(Color.white.opacity(0.15))
                                                    )
                                            )
                                            .cornerRadius(cancelCorner)
                                    }
                                    .buttonStyle(.plain)
                                    .overlay(
                                        DonationGoldRingBorder(cornerRadius: cancelCorner)
                                            .allowsHitTesting(false)
                                    )
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                }
                                .padding(.top, s(8))
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                            .padding(.horizontal, s(glassPanelInternalPadding))
                            .padding(.top, s(glassPanelVerticalPadding + step3PanelContentTopInset))
                            .padding(.bottom, s(28))
                            .frame(maxWidth: panelMaxWidth, maxHeight: geometry.size.height * 0.76, alignment: .top)
                            .background(
                                RoundedRectangle(cornerRadius: s(glassPanelCorner))
                                    .fill(Color.white.opacity(0.15))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: s(glassPanelCorner))
                                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                                    )
                            )
                            .shadow(color: Color.black.opacity(0.09), radius: s(40), x: 0, y: s(16))
                            .padding(.horizontal, s(glassPanelHorizontalPadding))
                            .offset(y: appearAnimation ? 0 : s(12))
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
            }
            .ignoresSafeArea(.all, edges: .all)
            
            VStack {
                HStack {
                    ReaderBatteryStatusView()
                        .padding(.leading, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                    Spacer()
                }
                Spacer()
            }
            
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                }
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.86).delay(0.08)) {
                appearAnimation = true
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
        return Color(red: 0.26, green: 0.20, blue: 0.20)
    }
    
    /// Same as `ModernProcessingView` / Step 3 review total accent.
    private var burgundyBrand: Color {
        Color(red: 147.0 / 255.0, green: 22.0 / 255.0, blue: 19.0 / 255.0)
    }
    
    private var creamFill: Color {
        Color(red: 242.0 / 255.0, green: 235.0 / 255.0, blue: 224.0 / 255.0)
    }
    
    private var stepLineBrown: Color {
        Color(red: 0.42, green: 0.32, blue: 0.32)
    }
    
    private let glassPanelCorner: CGFloat = 28
    private let glassPanelMaxWidthFraction: CGFloat = 0.94
    private let glassPanelMaxWidthPoints: CGFloat = 1400
    private let glassPanelHorizontalPadding: CGFloat = 56
    private let glassPanelVerticalPadding: CGFloat = 8
    private let glassPanelInternalPadding: CGFloat = 44
    private let step3PanelContentTopInset: CGFloat = 20
    
    private var isSuccess: Bool {
        if case .success = status { return true }
        return false
    }
    
    @ViewBuilder
    private func resultStepHeader(geometry: GeometryProxy, titleKey: String) -> some View {
        let s = geometry.scale
        let lineColor = stepLineBrown.opacity(0.4)
        HStack(spacing: s(16)) {
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
            Text(titleKey.localized)
                .font(.custom("Georgia", size: s(20)))
                .foregroundColor(stepLineBrown)
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
        }
        .padding(.horizontal, s(40))
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                let s: (CGFloat) -> CGFloat = { geometry.scale($0) }
                let panelMaxWidth = min(geometry.size.width * glassPanelMaxWidthFraction, glassPanelMaxWidthPoints)
                let actionCorner = s(DesignSystem.Components.buttonCornerRadius)
                
                ZStack {
                    backgroundView(geometry: geometry)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                    
                    ZStack(alignment: .top) {
                        VStack(spacing: 0) {
                            resultStepHeader(geometry: geometry, titleKey: isSuccess ? "paymentCompleteHeading" : "paymentUnsuccessfulHeading")
                                .padding(.top, s(78))
                                .padding(.bottom, s(20))
                            
                            VStack(spacing: 0) {
                                VStack(spacing: s(20)) {
                                    ZStack {
                                        Circle()
                                            .fill(burgundyBrand.opacity(0.14))
                                            .frame(width: s(152), height: s(152))
                                            .blur(radius: s(10))
                                        Circle()
                                            .stroke(headingColor.opacity(0.12), lineWidth: s(6))
                                            .frame(width: s(118), height: s(118))
                                        Image(systemName: isSuccess ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .font(.system(size: s(44), weight: .semibold))
                                            .foregroundStyle(isSuccess ? burgundyBrand : Color(red: 0.72, green: 0.2, blue: 0.16))
                                    }
                                    .scaleEffect(appearAnimation ? 1.0 : 0.9)
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    Text(isSuccess ? "thankYouForYourSeva".localized : "paymentFailed".localized)
                                        .font(.custom("Georgia", size: s(32)))
                                        .foregroundStyle(headingColor)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, s(12))
                                        .fixedSize(horizontal: false, vertical: true)
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    if isSuccess {
                                        VStack(spacing: s(12)) {
                                            Text("donationApprovedMessage".localized)
                                                .font(.custom("Georgia", size: s(22)))
                                                .foregroundStyle(headingColor.opacity(0.95))
                                                .multilineTextAlignment(.center)
                                            Text("emailReceiptShortly".localized)
                                                .font(.custom("Georgia", size: s(19)))
                                                .foregroundStyle(headingColor.opacity(0.72))
                                                .multilineTextAlignment(.center)
                                            HStack(alignment: .firstTextBaseline, spacing: s(10)) {
                                                Text("donationAmountLabel".localized)
                                                    .font(.system(size: s(20), weight: .medium, design: .serif))
                                                    .foregroundStyle(headingColor.opacity(0.78))
                                                Text(amount.formattedCurrency())
                                                    .font(.system(size: s(26), weight: .bold, design: .serif))
                                                    .foregroundStyle(burgundyBrand)
                                                    .monospacedDigit()
                                            }
                                            .padding(.top, s(6))
                                        }
                                        .padding(.horizontal, s(8))
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                    } else if case .failure(let error) = status {
                                        Text(error)
                                            .font(.custom("Georgia", size: s(19)))
                                            .foregroundStyle(headingColor.opacity(0.9))
                                            .multilineTextAlignment(.center)
                                            .padding(.horizontal, s(10))
                                            .fixedSize(horizontal: false, vertical: true)
                                            .opacity(appearAnimation ? 1.0 : 0.0)
                                    }
                                }
                                
                                Spacer(minLength: s(28))
                                
                                Button(action: {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    autoDismissTimer?.invalidate()
                                    onDismiss()
                                }) {
                                    HStack(spacing: s(10)) {
                                        Image(systemName: isSuccess ? "checkmark.circle.fill" : "arrow.counterclockwise.circle.fill")
                                            .font(.system(size: s(18), weight: .semibold))
                                        Text(isSuccess ? "done".localized : "tryAgain".localized)
                                            .font(.custom("Georgia", size: s(17)))
                                    }
                                    .foregroundColor(headingColor)
                                    .frame(maxWidth: .infinity)
                                    .frame(minHeight: s(58), maxHeight: s(58))
                                    .background(
                                        RoundedRectangle(cornerRadius: actionCorner)
                                            .fill(creamFill)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: actionCorner)
                                                    .fill(Color.white.opacity(0.15))
                                            )
                                    )
                                    .cornerRadius(actionCorner)
                                }
                                .buttonStyle(.plain)
                                .overlay(
                                    DonationGoldRingBorder(cornerRadius: actionCorner)
                                        .allowsHitTesting(false)
                                )
                                .opacity(appearAnimation ? 1.0 : 0.0)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                            .padding(.horizontal, s(glassPanelInternalPadding))
                            .padding(.top, s(glassPanelVerticalPadding + step3PanelContentTopInset))
                            .padding(.bottom, s(28))
                            .frame(maxWidth: panelMaxWidth, maxHeight: geometry.size.height * 0.76, alignment: .top)
                            .background(
                                RoundedRectangle(cornerRadius: s(glassPanelCorner))
                                    .fill(Color.white.opacity(0.15))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: s(glassPanelCorner))
                                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                                    )
                            )
                            .shadow(color: Color.black.opacity(0.09), radius: s(40), x: 0, y: s(16))
                            .padding(.horizontal, s(glassPanelHorizontalPadding))
                            .offset(y: appearAnimation ? 0 : s(12))
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
            }
            .ignoresSafeArea(.all, edges: .all)
            
            VStack {
                HStack {
                    ReaderBatteryStatusView()
                        .padding(.leading, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                    Spacer()
                }
                Spacer()
            }
            
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, DesignSystem.Layout.screenPadding)
                        .padding(.top, DesignSystem.Spacing.sm)
                }
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.86).delay(0.08)) {
                appearAnimation = true
            }
            
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
    let onCancel: (() -> Void)? = nil
    var lineItems: [DonationLineItemBody]? = nil
    var donationRecordCategoryId: String? = nil
    
    var body: some View {
        ModernPaymentView(
            amount: amount,
            category: category,
            lineItems: lineItems,
            donationRecordCategoryId: donationRecordCategoryId,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            donorAddress: donorAddress,
            submittedAsAnonymous: false,
            onComplete: onComplete,
            onCancel: onCancel
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
    let onCancel: () -> Void
    
    var body: some View {
        ModernProcessingView(amount: amount, onCancel: onCancel)
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
