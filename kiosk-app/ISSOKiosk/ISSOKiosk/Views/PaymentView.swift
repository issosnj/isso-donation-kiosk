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
                                            donorAddress: donorAddress
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
                                        donorAddress: donorAddress
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

private struct PaymentProcessingCardBrandStrip: View {
    let geometry: GeometryProxy
    
    private func s(_ v: CGFloat) -> CGFloat { geometry.scale(v) }
    
    var body: some View {
        HStack(spacing: s(10)) {
            visaMark
            mastercardMark
            amexMark
            discoverMark
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Visa, Mastercard, American Express, Discover")
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
    @State private var rotationAngle: Double = 0
    @State private var appearAnimation = false
    @State private var pulseGlow = false
    
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
                                VStack(spacing: s(26)) {
                                    ZStack {
                                        Circle()
                                            .fill(burgundyBrand.opacity(pulseGlow ? 0.12 : 0.18))
                                            .frame(width: s(152), height: s(152))
                                            .blur(radius: s(12))
                                        
                                        Circle()
                                            .stroke(headingColor.opacity(0.12), lineWidth: s(7))
                                            .frame(width: s(118), height: s(118))
                                        
                                        Circle()
                                            .trim(from: 0, to: 0.78)
                                            .stroke(
                                                AngularGradient(
                                                    colors: [
                                                        burgundyBrand.opacity(0.55),
                                                        burgundyBrand,
                                                        burgundyBrand.opacity(0.72),
                                                    ],
                                                    center: .center
                                                ),
                                                style: StrokeStyle(lineWidth: s(7), lineCap: .round)
                                            )
                                            .frame(width: s(118), height: s(118))
                                            .rotationEffect(.degrees(rotationAngle))
                                        
                                        Image(systemName: "creditcard.fill")
                                            .font(.system(size: s(40), weight: .medium))
                                            .foregroundStyle(burgundyBrand)
                                    }
                                    .scaleEffect(appearAnimation ? 1.0 : 0.88)
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                    .padding(.top, s(4))
                                    
                                    // Same visual rhythm as donation summary **Total** row (`DonationDetailsView`).
                                    HStack(alignment: .firstTextBaseline, spacing: s(12)) {
                                        Text("totalSevaLabel".localized)
                                            .font(.system(size: s(24), weight: .semibold, design: .serif))
                                            .foregroundStyle(headingColor)
                                        Spacer(minLength: s(8))
                                        Text(amount.formattedCurrency())
                                            .font(.system(size: s(30), weight: .bold, design: .serif))
                                            .foregroundStyle(burgundyBrand)
                                            .monospacedDigit()
                                    }
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    Text("processingInstructionsSimple".localized)
                                        .font(.custom("Georgia", size: s(23)))
                                        .foregroundStyle(headingColor.opacity(0.92))
                                        .multilineTextAlignment(.center)
                                        .fixedSize(horizontal: false, vertical: true)
                                        .padding(.horizontal, s(8))
                                        .padding(.top, s(4))
                                        .opacity(appearAnimation ? 1.0 : 0.0)
                                    
                                    VStack(spacing: s(18)) {
                                        PaymentProcessingCardBrandStrip(geometry: geometry)
                                        PaymentProcessingSecureBadge(geometry: geometry, headingColor: headingColor, accentColor: burgundyBrand)
                                    }
                                    .opacity(appearAnimation ? 1.0 : 0.0)
                                }
                                
                                Spacer(minLength: s(28))
                                
                                // Pinned to bottom of glass panel — aligns with action row on Step 3 review.
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
            withAnimation(.linear(duration: 2.4).repeatForever(autoreverses: false)) {
                rotationAngle = 360
            }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                pulseGlow = true
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
                        VStack(spacing: 12) {
                            Text("Your donation was approved!")
                                .font(.custom("Inter-SemiBold", size: 24))
                                .foregroundColor(headingColor)
                                .multilineTextAlignment(.center)
                            
                            Text("You will receive an email receipt shortly.")
                                .font(.custom("Inter-Regular", size: 20))
                                .foregroundColor(bodyTextColor)
                                .multilineTextAlignment(.center)
                            
                            Text("Donation amount: \(amount.formattedCurrency())")
                                .font(.custom("Inter-Medium", size: 18))
                                .foregroundColor(bodyTextColor.opacity(0.8))
                                .multilineTextAlignment(.center)
                                .padding(.top, 4)
                        }
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
            .padding(DesignSystem.Spacing.xl + DesignSystem.Spacing.sm)
            
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
