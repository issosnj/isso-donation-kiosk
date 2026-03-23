import SwiftUI
import UIKit

struct ModernDonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let initialDonorName: String?
    let initialDonorPhone: String?
    let initialDonorEmail: String?
    let initialDonorAddress: String?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    let onCancel: (() -> Void)? // Optional callback to return to home
    @ObservedObject private var languageManager = LanguageManager.shared
    
    @State private var donorName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var donorAddress = ""
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @State private var isLookingUpDonor = false
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var showAddressSuggestions = false
    @State private var addressSessionToken: String? = nil
    @FocusState private var nameFocused: Bool
    @FocusState private var phoneFocused: Bool
    @FocusState private var emailFocused: Bool
    @FocusState private var addressFocused: Bool
    @State private var showingPhoneKeypad = false
    @State private var showingNameKeypad = false
    @State private var showingEmailKeypad = false
    @State private var showingAddressKeypad = false
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    // If category is selected, name and phone are required
    private var isNameRequired: Bool {
        category != nil
    }
    
    private var isPhoneRequired: Bool {
        category != nil
    }
    
    private var canProceed: Bool {
        if category != nil {
            // For category donations, name and phone are required
            return !donorName.trimmingCharacters(in: .whitespaces).isEmpty &&
                   !donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
        } else {
            // For preset amounts, all fields are optional
            return true
        }
    }
    
    // Theme layout helpers
    private var theme: KioskTheme? {
        appState.temple?.kioskTheme
    }
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
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
        
        guard hexSanitized.count == 6 else {
            return defaultColor
        }
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return defaultColor
        }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
    
    // Helper to create a gradient from a color (lighter variant for gradient effect)
    private func gradientFromColor(_ color: Color) -> LinearGradient {
        // Convert Color to UIColor to extract components
        let uiColor = UIColor(color)
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        
        // Create a lighter variant by increasing brightness
        let lighterColor = Color(
            red: min(1.0, Double(r) * 1.15),
            green: min(1.0, Double(g) * 1.15),
            blue: min(1.0, Double(b) * 1.15)
        )
        return LinearGradient(
            gradient: Gradient(colors: [color, lighterColor]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private var detailsPageHorizontalSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsPageHorizontalSpacing ?? DesignSystem.Spacing.xl)
    }
    
    private var detailsPageSidePadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageSidePadding ?? 60)
    }
    
    private var detailsPageTopPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageTopPadding ?? DesignSystem.Layout.pageTopPadding)
    }
    
    private var detailsPageBottomPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageBottomPadding ?? DesignSystem.Spacing.xl)
    }
    
    private var detailsCardMaxWidth: CGFloat {
        CGFloat(theme?.layout?.detailsCardMaxWidth ?? 420)
    }
    
    private var donorFormMaxWidth: CGFloat {
        CGFloat(theme?.layout?.donorFormMaxWidth ?? 420)
    }
    
    private var detailsCardPadding: CGFloat {
        CGFloat(theme?.layout?.detailsCardPadding ?? DesignSystem.Layout.cardPadding)
    }
    
    private var detailsCardSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsCardSpacing ?? DesignSystem.Spacing.md)
    }
    
    // Font sizes
    private var detailsAmountFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsAmountFontSize ?? 56)
    }
    
    private var detailsLabelFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsLabelFontSize ?? DesignSystem.Typography.inputSize)
    }
    
    private var detailsInputFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsInputFontSize ?? DesignSystem.Typography.inputSize)
    }
    
    private var detailsButtonFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsButtonFontSize ?? DesignSystem.Typography.subsectionSize + 2)
    }
    
    // Colors
    private var detailsAmountColor: Color {
        colorFromHex(theme?.layout?.detailsAmountColor, defaultColor: Color(red: 0.26, green: 0.20, blue: 0.20))
    }
    
    private var detailsTextColor: Color {
        colorFromHex(theme?.layout?.detailsTextColor, defaultColor: Color(red: 0.26, green: 0.20, blue: 0.20))
    }
    
    private var detailsInputBorderColor: Color {
        colorFromHex(theme?.layout?.detailsInputBorderColor, defaultColor: Color.gray.opacity(0.2))
    }
    
    private var detailsInputFocusColor: Color {
        colorFromHex(theme?.layout?.detailsInputFocusColor, defaultColor: Color(red: 0.2, green: 0.4, blue: 0.8))
    }
    
    private var detailsButtonColor: Color {
        colorFromHex(theme?.layout?.detailsButtonColor, defaultColor: Color(red: 0.2, green: 0.4, blue: 0.8))
    }
    
    private var detailsButtonTextColor: Color {
        colorFromHex(theme?.layout?.detailsButtonTextColor, defaultColor: Color.white)
    }
    
    // Reusable donor input row — polished empty & filled states, consistent spacing
    @ViewBuilder
    private func donorInputRow(
        label: String,
        icon: String,
        value: String,
        isEmpty: Bool,
        hasError: Bool,
        onTap: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.xs) {
            Text(label)
                .font(.custom(DesignSystem.Typography.labelFont, size: DesignSystem.Typography.labelSize))
                .foregroundColor(detailsTextColor.opacity(0.75))
            Button(action: onTap) {
                HStack(alignment: .center, spacing: DesignSystem.Components.inlineSpacing) {
                    Image(systemName: icon)
                        .font(.system(size: DesignSystem.Typography.secondarySize))
                        .foregroundColor(detailsTextColor.opacity(isEmpty ? 0.45 : 0.65))
                        .frame(width: DesignSystem.Components.iconFrameWidth, alignment: .center)
                    Text(value)
                        .font(.custom("Inter-Regular", size: detailsInputFontSize))
                        .foregroundColor(isEmpty ? detailsTextColor.opacity(0.45) : detailsTextColor)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(minHeight: DesignSystem.Components.inputHeight)
                .padding(.horizontal, DesignSystem.Spacing.lg)
                .padding(.vertical, DesignSystem.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                        .fill(Color.white.opacity(0.55))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                                .stroke(
                                    hasError ? Color.red.opacity(0.5) : Color.white.opacity(0.4),
                                    lineWidth: 1
                                )
                        )
                )
            }
            .buttonStyle(.plain)
        }
    }
    
    // Helper view for background
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
    
    // Main content view
    @ViewBuilder
    private var mainContentView: some View {
        ScrollView {
                    VStack(spacing: 0) {
                        // Top spacing
                        Spacer()
                            .frame(height: detailsPageTopPadding)
                        
                        // Main content: Left (Review Donation) and Right (Optional Information)
                        HStack(alignment: .top, spacing: detailsPageHorizontalSpacing) {
                            // LEFT SIDE: Review Donation Panel
                    VStack(alignment: .leading, spacing: 0) {
                        Text("reviewDonation".localized)
                            .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.sectionTitleSize))
                            .foregroundColor(detailsTextColor)
                            .padding(.bottom, DesignSystem.Spacing.md)
                        
                        // Donation breakdown — Donation line first, then Total
                        VStack(alignment: .leading, spacing: DesignSystem.Spacing.sm) {
                            if let category = category {
                                HStack {
                                    Text(category.name)
                                        .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                        .foregroundColor(detailsTextColor.opacity(0.9))
                                    Spacer()
                                    Text(amount.formattedCurrency())
                                        .font(.custom("Inter-Medium", size: detailsLabelFontSize + 2))
                                        .foregroundColor(detailsAmountColor)
                                        .monospacedDigit()
                                }
                            }
                            HStack {
                                Text("Donation")
                                    .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                    .foregroundColor(detailsTextColor.opacity(0.9))
                                Spacer()
                                Text(amount.formattedCurrency())
                                    .font(.custom("Inter-Medium", size: detailsLabelFontSize + 2))
                                    .foregroundColor(detailsAmountColor)
                                    .monospacedDigit()
                            }
                            Divider()
                                .background(Color.gray.opacity(0.25))
                                .padding(.vertical, DesignSystem.Spacing.xs)
                            HStack {
                                Text("Total")
                                    .font(.custom("Inter-SemiBold", size: detailsLabelFontSize + 2))
                                    .foregroundColor(detailsTextColor)
                                Spacer()
                                Text(amount.formattedCurrency())
                                    .font(.custom("Inter-SemiBold", size: detailsAmountFontSize - 8))
                                    .foregroundColor(detailsAmountColor)
                                    .monospacedDigit()
                            }
                        }
                        .padding(.vertical, DesignSystem.Spacing.md)
                        .padding(.horizontal, DesignSystem.Spacing.md)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(DesignSystem.Components.chipCornerRadius)
                        .padding(.bottom, DesignSystem.Spacing.md)
                        
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            dismiss()
                        }) {
                            HStack(spacing: 4) {
                                Text("Change Amount")
                                    .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: DesignSystem.Typography.secondarySize, weight: .medium))
                            }
                            .foregroundColor(detailsButtonColor)
                        }
                        
                        Spacer(minLength: 0)
                    }
                    .frame(width: detailsCardMaxWidth, alignment: .leading)
                    .padding(detailsCardPadding)
                    .background(
                        // Glass effect background
                        ZStack {
                            // Blur effect
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.25))
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(.ultraThinMaterial)
                                )
                        }
                    )
                    .cornerRadius(DesignSystem.Components.cardCornerRadius)
                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    
                    // RIGHT SIDE: Optional Information Panel
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Optional Information")
                            .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.sectionTitleSize))
                            .foregroundColor(detailsTextColor)
                            .padding(.bottom, DesignSystem.Spacing.md)
                        
                        VStack(alignment: .leading, spacing: DesignSystem.Components.inlineSpacing) {
                            donorInputRow(
                                label: "nameOptional".localized,
                                icon: "person.fill",
                                value: donorName.isEmpty ? "enterYourName".localized : donorName,
                                isEmpty: donorName.isEmpty,
                                hasError: category != nil && donorName.trimmingCharacters(in: .whitespaces).isEmpty,
                                onTap: { showingNameKeypad = true }
                            )
                            donorInputRow(
                                label: "phoneOptional".localized,
                                icon: "phone.fill",
                                value: donorPhone.isEmpty ? "enterYourPhone".localized : formatPhoneDisplay(donorPhone),
                                isEmpty: donorPhone.isEmpty,
                                hasError: category != nil && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty,
                                onTap: { showingPhoneKeypad = true }
                            )
                            donorInputRow(
                                label: "emailForReceipt".localized,
                                icon: "envelope.fill",
                                value: donorEmail.isEmpty ? "enterYourEmail".localized : donorEmail,
                                isEmpty: donorEmail.isEmpty,
                                hasError: false,
                                onTap: { showingEmailKeypad = true }
                            )
                            ZStack(alignment: .topLeading) {
                                donorInputRow(
                                    label: "mailingAddressOptional".localized,
                                    icon: "mappin.circle.fill",
                                    value: donorAddress.isEmpty ? "enterYourAddress".localized : donorAddress,
                                    isEmpty: donorAddress.isEmpty,
                                    hasError: false,
                                    onTap: { showingAddressKeypad = true }
                                )
                                
                                // Address suggestions overlay - positioned absolutely to prevent layout shifts
                                if showAddressSuggestions && !addressSuggestions.isEmpty && addressFocused {
                                    VStack(spacing: 0) {
                                        ForEach(addressSuggestions.prefix(5)) { suggestion in
                                            Button(action: {
                                                Task {
                                                    await selectAddress(suggestion: suggestion)
                                                }
                                            }) {
                                                HStack(alignment: .top, spacing: 12) {
                                                    Image(systemName: "mappin.circle.fill")
                                                        .font(.system(size: 18))
                                                        .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                                        .padding(.top, 2)
                                                    
                                                    VStack(alignment: .leading, spacing: 4) {
                                                        Text(suggestion.structured_formatting.main_text)
                                                            .font(.custom("Inter-Medium", size: detailsInputFontSize))
                                                            .foregroundColor(detailsTextColor)
                                                            .lineLimit(2)
                                                            .fixedSize(horizontal: false, vertical: true)
                                                        Text(suggestion.structured_formatting.secondary_text)
                                                            .font(.custom("Inter-Regular", size: detailsInputFontSize - 2))
                                                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                                            .lineLimit(2)
                                                            .fixedSize(horizontal: false, vertical: true)
                                                    }
                                                    .frame(maxWidth: .infinity, alignment: .leading)
                                                }
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 12)
                                                .background(Color.white)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                            
                                            if suggestion.id != addressSuggestions.prefix(5).last?.id {
                                                Divider()
                                                    .padding(.horizontal, 16)
                                            }
                                        }
                                    }
                                    .background(Color.white)
                                    .cornerRadius(DesignSystem.Components.buttonCornerRadius)
                                    .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 5)
                                    .frame(maxWidth: 400)
                                    .frame(maxHeight: 300)
                                    .padding(.top, 60) // Position below the address input field
                                }
                            }
                        }
                        
                        Spacer(minLength: 0)
                    }
                    .frame(width: donorFormMaxWidth)
                    .padding(detailsCardPadding)
                    .background(
                        // Glass effect background
                        ZStack {
                            // Blur effect
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.25))
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(.ultraThinMaterial)
                                )
                        }
                    )
                    .cornerRadius(DesignSystem.Components.cardCornerRadius)
                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    }
                    .padding(.horizontal, detailsPageSidePadding)
                        
                        // CTA row — Back (secondary) + Proceed (primary)
                        HStack(spacing: DesignSystem.Spacing.sm) {
                            Button(action: {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                                    if let onCancel = onCancel {
                                        onCancel()
                                    } else {
                                        dismiss()
                                    }
                                }
                            }) {
                                HStack(spacing: DesignSystem.Components.inlineSpacing) {
                                    Image(systemName: "arrow.left")
                                        .font(.system(size: detailsButtonFontSize - 4, weight: .medium))
                                    Text("backToDonation".localized)
                                        .font(.custom("Inter-Medium", size: detailsButtonFontSize))
                                }
                                .foregroundColor(detailsButtonColor)
                                .frame(maxWidth: .infinity)
                                .frame(height: DesignSystem.Components.buttonHeight)
                                .background(Color.white.opacity(0.6))
                                .cornerRadius(DesignSystem.Components.buttonCornerRadius)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                                        .stroke(detailsButtonColor.opacity(0.5), lineWidth: 1.5)
                                )
                            }
                            Button(action: {
                                guard canProceed else { return }
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                                    onConfirm(
                                        donorName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorName.trimmingCharacters(in: .whitespaces),
                                        donorPhone.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorPhone.trimmingCharacters(in: .whitespaces),
                                        donorEmail.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorEmail.trimmingCharacters(in: .whitespaces),
                                        donorAddress.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorAddress.trimmingCharacters(in: .whitespaces)
                                    )
                                }
                            }) {
                                HStack(spacing: DesignSystem.Components.inlineSpacing) {
                                    Text("proceedToPayment".localized)
                                        .font(.custom("Inter-Medium", size: detailsButtonFontSize))
                                    Image(systemName: "arrow.right")
                                        .font(.system(size: detailsButtonFontSize - 4, weight: .semibold))
                                }
                                .foregroundColor(canProceed ? .white : Color(white: 0.45))
                                .frame(maxWidth: .infinity)
                                .frame(height: DesignSystem.Components.buttonHeight)
                                .background(
                                    Group {
                                        if canProceed {
                                            let buttonColor = colorFromHex(
                                                theme?.colors?.proceedToPaymentButtonColor,
                                                defaultColor: Color(red: 1.0, green: 0.58, blue: 0.0)
                                            )
                                            if theme?.colors?.proceedToPaymentButtonGradient == true {
                                                gradientFromColor(buttonColor)
                                            } else {
                                                buttonColor
                                            }
                                        } else {
                                            Color(white: 0.78)
                                        }
                                    }
                                )
                                .cornerRadius(DesignSystem.Components.buttonCornerRadius)
                                .shadow(color: canProceed ? Color.black.opacity(0.2) : .clear, radius: 8, x: 0, y: 4)
                            }
                            .disabled(!canProceed)
                        }
                        .padding(.horizontal, detailsPageSidePadding)
                        .padding(.top, DesignSystem.Spacing.lg)
                        .padding(.bottom, detailsPageBottomPadding)
                    }
                }
        }
    
    var body: some View {
        ZStack {
            // Background: Use same background as donation page
            GeometryReader { geometry in
                backgroundView(geometry: geometry)
            }
            .ignoresSafeArea(.all, edges: .all)
            
            // Main content
            GeometryReader { geometry in
                mainContentView
                    .frame(width: geometry.size.width)
                    .onTapGesture {
                        // Dismiss keyboard when tapping background
                        nameFocused = false
                        phoneFocused = false
                        emailFocused = false
                        addressFocused = false
                    }
            }
            
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
        .sheet(isPresented: $showingPhoneKeypad) {
            PhoneNumberKeypadView(phoneNumber: $donorPhone) {
                showingPhoneKeypad = false
            }
        }
        .sheet(isPresented: $showingNameKeypad) {
            NameKeypadView(name: $donorName) {
                showingNameKeypad = false
            }
            .presentationBackground(.clear)
            .presentationDetents([.large])
        }
        .sheet(isPresented: $showingEmailKeypad) {
            EmailKeypadView(email: $donorEmail) {
                showingEmailKeypad = false
            }
        }
        .sheet(isPresented: $showingAddressKeypad) {
            AddressKeypadView(address: $donorAddress) {
                showingAddressKeypad = false
            }
        }
        .sheet(isPresented: $showingYajmanOpportunities) {
            if let category = category, let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                YajmanOpportunitiesView(
                    category: category,
                    opportunities: opportunities,
                    onDismiss: {
                        showingYajmanOpportunities = false
                    }
                )
            }
        }
        .onAppear {
            // Initialize fields with saved donor details if available
            // Always restore from initial values when view appears (preserves data when returning from payment)
            if let initialName = initialDonorName, !initialName.isEmpty {
                donorName = initialName
            }
            if let initialPhone = initialDonorPhone, !initialPhone.isEmpty {
                donorPhone = initialPhone
            }
            if let initialEmail = initialDonorEmail, !initialEmail.isEmpty {
                donorEmail = initialEmail
            }
            if let initialAddress = initialDonorAddress, !initialAddress.isEmpty {
                donorAddress = initialAddress
            }
            
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
        }
        .detectTouches() // Detect all user interactions to reset idle timer
        .onChange(of: donorName) { _ in
            // User is typing in name field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorPhone) { newPhone in
            // User is typing in phone field - reset idle timer
            IdleTimer.shared.userDidInteract()
            
            // Auto-populate donor info if phone number is complete (10+ digits)
            let digitsOnly = newPhone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
            if digitsOnly.count >= 10 && !isLookingUpDonor {
                Task {
                    await lookupDonorInfo(phone: digitsOnly)
                }
            }
        }
        .onChange(of: donorEmail) { _ in
            // User is typing in email field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorAddress) { _ in
            // User is typing in address field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
    }
    
    private func lookupDonorInfo(phone: String) async {
        guard !phone.isEmpty, phone.count >= 10 else {
            return
        }
        
        isLookingUpDonor = true
        defer { isLookingUpDonor = false }
        
        do {
            let response = try await APIService.shared.lookupDonor(phone: phone)
            if response.found, let donor = response.donor {
                await MainActor.run {
                    // Only auto-populate if fields are empty (don't overwrite user input)
                    if donorName.trimmingCharacters(in: .whitespaces).isEmpty, let name = donor.name {
                        donorName = name
                    }
                    if donorEmail.trimmingCharacters(in: .whitespaces).isEmpty, let email = donor.email {
                        donorEmail = email
                    }
                    if donorAddress.trimmingCharacters(in: .whitespaces).isEmpty, let address = donor.address {
                        donorAddress = address
                    }
                }
            }
        } catch {
            // Silently fail - don't show error for lookup failures
            print("[DonationDetailsView] Failed to lookup donor: \(error.localizedDescription)")
        }
    }
    
    private func searchAddresses(input: String) async {
        guard input.count >= 3 else {
            await MainActor.run {
                addressSuggestions = []
                showAddressSuggestions = false
            }
            return
        }
        
        // Generate session token if not exists
        if addressSessionToken == nil {
            addressSessionToken = UUID().uuidString
        }
        
        do {
            let response = try await APIService.shared.autocompleteAddress(
                input: input,
                sessionToken: addressSessionToken
            )
            await MainActor.run {
                addressSuggestions = response.predictions
                showAddressSuggestions = !response.predictions.isEmpty
            }
        } catch {
            // Silently fail - don't show error for autocomplete failures
            print("[DonationDetailsView] Failed to autocomplete address: \(error.localizedDescription)")
            await MainActor.run {
                addressSuggestions = []
                showAddressSuggestions = false
            }
        }
    }
    
    private func selectAddress(suggestion: AddressPrediction) async {
        do {
            let details = try await APIService.shared.getPlaceDetails(
                placeId: suggestion.place_id,
                sessionToken: addressSessionToken
            )
            
            await MainActor.run {
                if let formattedAddress = details.formatted_address {
                    donorAddress = formattedAddress
                } else {
                    donorAddress = suggestion.description
                }
                showAddressSuggestions = false
                addressFocused = false
                // Reset session token after selection
                addressSessionToken = nil
            }
        } catch {
            // Fallback to description if details fetch fails
            await MainActor.run {
                donorAddress = suggestion.description
                showAddressSuggestions = false
                addressFocused = false
                addressSessionToken = nil
            }
        }
    }
    
    private func formatPhoneDisplay(_ phone: String) -> String {
        let digits = phone.filter { $0.isNumber }
        if digits.isEmpty {
            return ""
        }
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3))
            return "(\(areaCode)) \(firstPart)"
        } else {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3).prefix(3))
            let lastPart = String(digits.dropFirst(6))
            return "(\(areaCode)) \(firstPart)-\(lastPart)"
        }
    }
}

// Keep old view for compatibility
struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    
    var body: some View {
        ModernDonationDetailsView(
            amount: amount,
            category: category,
            initialDonorName: nil,
            initialDonorPhone: nil,
            initialDonorEmail: nil,
            initialDonorAddress: nil,
            onConfirm: onConfirm,
            onCancel: nil
        )
    }
}
