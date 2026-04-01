import SwiftUI
import UIKit

struct DonationHomeView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var languageManager = LanguageManager.shared
    let onDismiss: () -> Void
    @State private var selectedAmount: Double?
    @State private var customAmount: String = ""
    @State private var selectedCategory: DonationCategory?
    @State private var quantity: Int = 1
    @State private var showingDetails = false
    @State private var showingPayment = false
    @State private var showingYajmanOpportunities = false
    @State private var showingPledgeOption = false
    @State private var showingCustomAmountKeypad = false
    @State private var hideSystemKeyboard = false
    @State private var donorName: String?
    @State private var donorPhone: String?
    @State private var donorEmail: String?
    @State private var donorAddress: String?
    /// Line items for Step 3 review + payment (primary row + optional additional seva).
    @State private var reviewDonationLines: [CheckoutDonationLine] = []
    /// After "Additional seva", next "Review donation" appends step-2 selection instead of replacing lines.
    @State private var appendSevaOnNextReview = false
    @FocusState private var customAmountFocused: Bool
    
    // Preset amounts from backend config, fallback to defaults
    var presetAmounts: [Double] {
        appState.temple?.homeScreenConfig?.presetAmounts ?? [5, 10, 25, 50, 100]
    }
    
    // Button colors from backend config, with defaults
    var buttonColors: ButtonColors {
        appState.temple?.homeScreenConfig?.buttonColors ?? ButtonColors(
            categorySelected: nil,
            categoryUnselected: nil,
            amountSelected: nil,
            amountUnselected: nil
        )
    }
    
    // Cache default colors for better performance
    private static let defaultBlue = Color(red: 0.2, green: 0.4, blue: 0.8) // Vibrant blue matching image
    /// Selected category / amount buttons (always #931613 on this screen).
    private static let donationSelectedButtonColor = Color(red: 147/255, green: 22/255, blue: 19/255)
    private static let maxCategoryQuantity = 99
    
    // Helper to convert hex string to Color - optimized
    func colorFromHex(_ hex: String?, defaultColor: Color = Self.defaultBlue) -> Color {
        guard let hex = hex, !hex.isEmpty else {
            return defaultColor
        }
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        // Handle 3-character hex codes (e.g., #336 -> #3366CC)
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
    
    // Get button colors from kioskTheme.colors, fallback to homeScreenConfig.buttonColors for backward compatibility
    // Reference theme: cream/beige; selected category solid burgundy
    var categorySelectedColor: String {
        appState.temple?.kioskTheme?.colors?.categorySelectedColor ??
        appState.temple?.homeScreenConfig?.buttonColors?.categorySelected ?? "#931613"
    }
    
    var categoryUnselectedColor: String {
        appState.temple?.kioskTheme?.colors?.categoryUnselectedColor ??
        appState.temple?.homeScreenConfig?.buttonColors?.categoryUnselected ?? "#E8E4DC"
    }
    
    var amountSelectedColor: String {
        appState.temple?.kioskTheme?.colors?.amountSelectedColor ??
        appState.temple?.homeScreenConfig?.buttonColors?.amountSelected ?? "#931613"
    }
    
    var amountUnselectedColor: String {
        appState.temple?.kioskTheme?.colors?.amountUnselectedColor ??
        appState.temple?.homeScreenConfig?.buttonColors?.amountUnselected ?? "#E8E4DC"
    }
    
    // Get colors with defaults (Color values)
    var categorySelectedColorValue: Color {
        Self.donationSelectedButtonColor
    }
    
    var categoryUnselectedColorValue: Color {
        let baseColor = colorFromHex(categoryUnselectedColor)
        if categoryUnselectedColor == categorySelectedColor {
            return baseColor.opacity(0.8)
        }
        return baseColor
    }
    
    var amountSelectedColorValue: Color {
        Self.donationSelectedButtonColor
    }
    
    var amountUnselectedColorValue: Color {
        colorFromHex(amountUnselectedColor)
    }
    
    // Theme helper properties with defaults
    var theme: KioskTheme? {
        appState.temple?.kioskTheme
    }
    
    var headingFont: String {
        theme?.fonts?.headingFamily ?? "Inter-Bold"
    }
    
    var headingSize: CGFloat {
        CGFloat(theme?.fonts?.headingSize ?? 34)
    }
    
    var sectionSubtitleSize: CGFloat {
        13
    }
    
    var buttonFont: String {
        theme?.fonts?.buttonFamily ?? "Inter-Medium"
    }
    
    var buttonSize: CGFloat {
        CGFloat(theme?.fonts?.buttonSize ?? 18)
    }
    
    var bodyFont: String {
        theme?.fonts?.bodyFamily ?? "Inter-Regular"
    }
    
    var bodySize: CGFloat {
        CGFloat(theme?.fonts?.bodySize ?? 14)
    }
    
    /// Same source and default as `KioskHomeView` header (`headingColor` / welcome text).
    var headingColor: Color {
        colorFromHex(theme?.colors?.headingColor, defaultColor: Color(red: 0.22, green: 0.18, blue: 0.16))
    }
    
    var bodyTextColor: Color {
        colorFromHex(theme?.colors?.bodyTextColor, defaultColor: Color(red: 0.5, green: 0.5, blue: 0.6))
    }
    
    var subtitleColor: Color {
        colorFromHex(theme?.colors?.subtitleColor, defaultColor: Color(red: 0.45, green: 0.45, blue: 0.52))
    }
    
    var quantityTotalColor: Color {
        colorFromHex(theme?.colors?.quantityTotalColor, defaultColor: headingColor)
    }
    
    var categoryBoxMaxWidth: CGFloat {
        CGFloat(theme?.layout?.categoryBoxMaxWidth ?? 400)
    }
    
    var amountButtonWidth: CGFloat {
        CGFloat(theme?.layout?.amountButtonWidth ?? 120)
    }
    
    var amountButtonHeight: CGFloat {
        CGFloat(theme?.layout?.amountButtonHeight ?? 64)
    }
    
    var categoryButtonHeight: CGFloat {
        CGFloat(theme?.layout?.categoryButtonHeight ?? 64)
    }
    
    var headerTopPadding: CGFloat {
        CGFloat(theme?.layout?.headerTopPadding ?? DesignSystem.Layout.pageTopPadding)
    }
    
    var categoryHeaderTopPadding: CGFloat {
        CGFloat(theme?.layout?.categoryHeaderTopPadding ?? headerTopPadding)
    }
    
    var sectionSpacing: CGFloat {
        CGFloat(theme?.layout?.sectionSpacing ?? DesignSystem.Spacing.xl)
    }
    
    var categoryAmountSectionSpacing: CGFloat {
        CGFloat(theme?.layout?.categoryAmountSectionSpacing ?? DesignSystem.Layout.donationSelectionSectionSpacing)
    }
    
    var donationSelectionPageLeftPadding: CGFloat {
        CGFloat(theme?.layout?.donationSelectionPageLeftPadding ?? DesignSystem.Layout.pageHorizontalPadding)
    }
    
    var donationSelectionPageRightPadding: CGFloat {
        CGFloat(theme?.layout?.donationSelectionPageRightPadding ?? DesignSystem.Layout.pageHorizontalPadding)
    }
    
    
    var keypadTheme: KeypadTheme {
        let layout = theme?.layout
        return KeypadTheme(
            width: CGFloat(layout?.customAmountKeypadWidth ?? 320),
            buttonHeight: CGFloat(layout?.customAmountKeypadButtonHeight ?? 70),
            buttonSpacing: CGFloat(layout?.customAmountKeypadButtonSpacing ?? DesignSystem.Components.inlineSpacing),
            buttonCornerRadius: CGFloat(layout?.customAmountKeypadButtonCornerRadius ?? DesignSystem.Components.buttonCornerRadius),
            backgroundColor: colorFromHex(layout?.customAmountKeypadBackgroundColor, defaultColor: Color(red: 135/255.0, green: 81/255.0, blue: 43/255.0)),
            borderColor: colorFromHex(layout?.customAmountKeypadBorderColor, defaultColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0)),
            borderWidth: CGFloat(layout?.customAmountKeypadBorderWidth ?? 3),
            glowColor: colorFromHex(layout?.customAmountKeypadGlowColor, defaultColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0)),
            glowRadius: CGFloat(layout?.customAmountKeypadGlowRadius ?? 15),
            buttonColor: colorFromHex(layout?.customAmountKeypadButtonColor, defaultColor: Color(red: 248/255.0, green: 216/255.0, blue: 161/255.0)),
            buttonTextColor: colorFromHex(layout?.customAmountKeypadButtonTextColor, defaultColor: Color(red: 0.2, green: 0.2, blue: 0.3)),
            numberFontSize: CGFloat(layout?.customAmountKeypadNumberFontSize ?? 32),
            letterFontSize: CGFloat(layout?.customAmountKeypadLetterFontSize ?? 10),
            padding: CGFloat(layout?.customAmountKeypadPadding ?? DesignSystem.Spacing.md),
            cornerRadius: CGFloat(layout?.customAmountKeypadCornerRadius ?? DesignSystem.Components.cardCornerRadius)
        )
    }
    
    var buttonSpacing: CGFloat {
        CGFloat(theme?.layout?.buttonSpacing ?? DesignSystem.Components.inlineSpacing)
    }
    
    var cornerRadius: CGFloat {
        CGFloat(theme?.layout?.cornerRadius ?? DesignSystem.Components.buttonCornerRadius)
    }
    
    var quantityTotalSpacing: CGFloat {
        CGFloat(theme?.layout?.quantityTotalSpacing ?? DesignSystem.Components.sectionSpacing)
    }
    
    // Glass panel design — premium centered container
    private let glassPanelMaxWidthFraction: CGFloat = 0.94
    private let glassPanelMaxWidthPoints: CGFloat = 1400
    private let glassPanelHorizontalPadding: CGFloat = 56
    private let glassPanelVerticalPadding: CGFloat = 8
    private let glassPanelColumnSpacing: CGFloat = 64
    private let glassPanelCornerRadius: CGFloat = 28
    private let glassPanelInternalPadding: CGFloat = 44
    
    var body: some View {
        donationHomeRoot
            .sheet(isPresented: $showingYajmanOpportunities) {
                yajmanOpportunitiesSheetContent
            }
            .fullScreenCover(isPresented: $showingDetails) {
                reviewDonationFullScreenCover
            }
            .sheet(isPresented: $showingPledgeOption) {
                pledgeOptionSheetContent
            }
            .fullScreenCover(isPresented: $showingPayment) {
                paymentFullScreenCover
            }
            .task {
                if appState.categories.isEmpty {
                    await appState.refreshCategories()
                }
                await appState.refreshKioskConfig()
            }
            .onChange(of: appState.temple?.kioskTheme) { _ in
                print("[DonationHomeView] Theme updated, view will refresh")
            }
            .detectTouches()
            .onChange(of: customAmount) { _ in
                IdleTimer.shared.userDidInteract()
            }
            .onChange(of: selectedCategory) { _ in
                IdleTimer.shared.userDidInteract()
            }
            .onChange(of: selectedAmount) { _ in
                IdleTimer.shared.userDidInteract()
            }
            .onChange(of: quantity) { _ in
                IdleTimer.shared.userDidInteract()
            }
    }
    
    /// Split from `body` so the compiler can type-check the main screen and flow modifiers separately.
    private var donationHomeRoot: some View {
        GeometryReader { geometry in
            ZStack {
                backgroundView(geometry: geometry)
                mainContent(geometry: geometry)
                VStack {
                    HStack {
                        ReaderBatteryStatusView()
                            .padding(.leading, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                        Spacer()
                    }
                    Spacer()
                }
                VStack {
                    HStack {
                        Spacer()
                        TimeAndNetworkStatusView()
                            .padding(.trailing, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                    }
                    Spacer()
                }
            }
        }
        .ignoresSafeArea(.all, edges: .all)
    }
    
    @ViewBuilder
    private var yajmanOpportunitiesSheetContent: some View {
        if let category = selectedCategory, let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
            YajmanOpportunitiesView(
                category: category,
                opportunities: opportunities,
                onDismiss: { showingYajmanOpportunities = false }
            )
        }
    }
    
    private var reviewDonationFullScreenCover: some View {
        ModernDonationDetailsView(
            donationLines: $reviewDonationLines,
            category: selectedCategory,
            initialDonorName: donorName,
            initialDonorPhone: donorPhone,
            initialDonorEmail: donorEmail,
            initialDonorAddress: donorAddress,
            onConfirm: { name, phone, email, address in
                showingDetails = false
                let categoryHasOpportunities = selectedCategory?.yajmanOpportunities != nil && !(selectedCategory?.yajmanOpportunities?.isEmpty ?? true)
                print("[DonationHomeView] 🔍 Category has opportunities: \(categoryHasOpportunities)")
                print("[DonationHomeView] 🔍 Selected category: \(selectedCategory?.name ?? "nil")")
                print("[DonationHomeView] 🔍 Should show pledge: \(categoryHasOpportunities)")
                if categoryHasOpportunities {
                    print("[DonationHomeView] ✅ Showing pledge option for sponsor tier")
                    showingPledgeOption = true
                } else {
                    print("[DonationHomeView] ⏭️ Going directly to payment (pledge only available for sponsor tiers)")
                    showingPayment = true
                }
                donorName = name
                donorPhone = phone
                donorEmail = email
                donorAddress = address
            },
            onCancel: {
                appendSevaOnNextReview = false
                showingDetails = false
            },
            onAddAdditionalSeva: {
                appendSevaOnNextReview = true
                showingDetails = false
                selectedCategory = nil
                selectedAmount = nil
                customAmount = ""
                quantity = 1
                showingCustomAmountKeypad = false
                customAmountFocused = false
            }
        )
    }
    
    private var pledgeOptionSheetContent: some View {
        PledgeOptionViewWrapper(
            amount: checkoutTotalAmount,
            category: selectedCategory,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            onPayNow: {
                showingPledgeOption = false
                showingPayment = true
            },
            onPledge: {
                Task {
                    await createPledge()
                }
            },
            onCancel: {
                showingPledgeOption = false
            }
        )
    }
    
    private var paymentFullScreenCover: some View {
        ModernPaymentView(
            amount: checkoutTotalAmount,
            category: selectedCategory,
            lineItems: checkoutLineItemsForAPI,
            donationRecordCategoryId: reviewDonationLines.first?.categoryId ?? selectedCategory?.id,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            donorAddress: donorAddress,
            onComplete: {
                withAnimation {
                    showingPayment = false
                    selectedAmount = nil
                    customAmount = ""
                    selectedCategory = nil
                    quantity = 1
                    donorName = nil
                    donorPhone = nil
                    donorEmail = nil
                    reviewDonationLines = []
                    appendSevaOnNextReview = false
                }
                onDismiss()
            },
            onCancel: {
                showingPayment = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    showingDetails = true
                }
            }
        )
    }
    
    // Background view using GeometryReader for consistent sizing
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
            defaultGradientBackground
        }
    }
    
    private var defaultGradientBackground: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color.white,
                Color(red: 0.95, green: 0.97, blue: 1.0)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea(.all, edges: .all)
    }
    
    @ViewBuilder
    private func mainContent(geometry: GeometryProxy) -> some View {
        let panelMaxWidth = min(geometry.size.width * glassPanelMaxWidthFraction, glassPanelMaxWidthPoints)
        let columnSpacing = geometry.scale(max(glassPanelColumnSpacing, categoryAmountSectionSpacing))
        
        ZStack(alignment: .top) {
            if showingCustomAmountKeypad {
                Color.black.opacity(0.25)
                    .ignoresSafeArea()
                    .onTapGesture {
                        showingCustomAmountKeypad = false
                        customAmountFocused = false
                    }
            }
            VStack(spacing: 0) {
                // Step header — centered above panel with decorative lines
                stepHeaderView(geometry: geometry)
                    .padding(.top, geometry.scale(78))
                    .padding(.bottom, geometry.scale(20))
                    .onTapGesture {
                        guard showingCustomAmountKeypad else { return }
                        showingCustomAmountKeypad = false
                        customAmountFocused = false
                    }
                
                // Glass panel — shifted down for breathing room above
                VStack(spacing: 0) {
                HStack(alignment: .top, spacing: columnSpacing) {
                    if showingCustomAmountKeypad {
                        keypadPlaceholderSection(geometry: geometry)
                            .frame(maxWidth: .infinity)
                            .transition(.asymmetric(
                                insertion: .opacity.combined(with: .scale(scale: 0.97)),
                                removal: .opacity.combined(with: .scale(scale: 0.97))
                            ))
                    } else {
                        categorySection(geometry: geometry)
                            .frame(maxWidth: .infinity)
                    }
                    
                    Rectangle()
                        .fill(Color.black.opacity(0.06))
                        .frame(width: 1)
                        .padding(.vertical, geometry.scale(8))
                        .contentShape(Rectangle())
                        .onTapGesture {
                            guard showingCustomAmountKeypad else { return }
                            showingCustomAmountKeypad = false
                            customAmountFocused = false
                        }
                    
                    amountSection(geometry: geometry)
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, geometry.scale(glassPanelInternalPadding))
                .padding(.top, geometry.scale(glassPanelVerticalPadding))
                .padding(.bottom, geometry.scale(28))
            }
            .frame(maxWidth: panelMaxWidth, maxHeight: geometry.size.height * 0.76)
            .background(
                RoundedRectangle(cornerRadius: geometry.scale(glassPanelCornerRadius))
                    .fill(Color.white.opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: geometry.scale(glassPanelCornerRadius))
                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                    )
            )
            .shadow(color: Color.black.opacity(0.09), radius: geometry.scale(40), x: 0, y: geometry.scale(16))
            .padding(.horizontal, geometry.scale(glassPanelHorizontalPadding))
            .animation(.spring(response: DesignSystem.Components.modalSpringResponse, dampingFraction: DesignSystem.Components.modalSpringDamping), value: showingCustomAmountKeypad)
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
    
    @ViewBuilder
    private func stepHeaderView(geometry: GeometryProxy) -> some View {
        let lineColor = Color(red: 0.42, green: 0.32, blue: 0.32).opacity(0.4)
        HStack(spacing: geometry.scale(16)) {
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
            Text("step2DonationSelection".localized)
                .font(.custom("Georgia", size: geometry.scale(20)))
                .foregroundColor(Color(red: 0.42, green: 0.32, blue: 0.32))
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
        }
        .padding(.horizontal, geometry.scale(40))
    }
    
    @ViewBuilder
    private func keypadPlaceholderSection(geometry: GeometryProxy) -> some View {
        let dismissKeypad = {
            showingCustomAmountKeypad = false
            customAmountFocused = false
        }
        VStack(spacing: 0) {
            Spacer().frame(height: geometry.scale(8))
            // Match category section header: top + single line (Georgia 28pt) + bottom
            Spacer().frame(height: geometry.scale(8 + 32 + 21))
            HStack(spacing: 0) {
                CustomNumericKeypad(
                    amount: $customAmount,
                    onDismiss: dismissKeypad,
                    theme: keypadTheme
                )
                Color.clear
                    .contentShape(Rectangle())
                    .frame(maxWidth: .infinity)
                    .onTapGesture(perform: dismissKeypad)
            }
            .padding(.horizontal, geometry.scale(DesignSystem.Spacing.md))
            Color.clear
                .contentShape(Rectangle())
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onTapGesture(perform: dismissKeypad)
        }
        .frame(maxWidth: .infinity)
    }
    
    // Check if any categories have yajman opportunities (sponsorship tiers)
    private var hasSponsorshipTiers: Bool {
        appState.temple?.yajmanOpportunitiesEnabled == true &&
        appState.categories.contains { category in
            category.yajmanOpportunities != nil && !(category.yajmanOpportunities?.isEmpty ?? true)
        }
    }
    
    @ViewBuilder
    private func categorySection(geometry: GeometryProxy) -> some View {
        VStack(spacing: 0) {
            // Header — clear hierarchy, centered
            VStack(alignment: .center, spacing: geometry.scale(6)) {
                Text("selectCategory".localized)
                    .font(.custom("Georgia", size: geometry.scale(28)))
                    .foregroundColor(headingColor)
                    .multilineTextAlignment(.center)
                
                if hasSponsorshipTiers {
                    HStack(spacing: geometry.scale(6)) {
                        Image(systemName: "star.fill")
                            .font(.system(size: geometry.scale(12)))
                            .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                        Text("Yajman Opportunities Available")
                            .font(.custom(bodyFont, size: geometry.scale(bodySize - 2)))
                            .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                    }
                    .padding(.top, geometry.scale(2))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, geometry.scale(8))
            .padding(.bottom, geometry.scale(21))
            
            categoryContent(geometry: geometry)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity)
    }
    
    @ViewBuilder
    private func categoryContent(geometry: GeometryProxy) -> some View {
        VStack(spacing: geometry.scale(DesignSystem.Components.inlineSpacing)) {
            if !appState.categories.isEmpty {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: geometry.scale(14)) {
                        ForEach(appState.categories) { category in
                            CleanCategoryButton(
                                category: category,
                                isSelected: selectedCategory?.id == category.id,
                                selectedColor: categorySelectedColorValue,
                                unselectedColor: categoryUnselectedColorValue,
                                height: geometry.scale(categoryButtonHeight),
                                horizontalPadding: geometry.scale(20),
                                action: {
                                    // Use simpler animation for better performance
                                    if selectedCategory?.id == category.id {
                                        selectedCategory = nil
                                        selectedAmount = nil
                                        customAmount = ""
                                        quantity = 1
                                    } else {
                                        selectedCategory = category
                                        quantity = 1
                                        // Clear preset amount selection when category is selected
                                        selectedAmount = nil
                                        customAmount = ""
                                        customAmountFocused = false
                                        
                                        // If category has yajman opportunities, show them
                                        if let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                                            showingYajmanOpportunities = true
                                        }
                                    }
                                }
                            )
                            .frame(maxWidth: geometry.scale(categoryBoxMaxWidth)) // Use theme width
                        }
                    }
                    .padding(.horizontal, geometry.scale(DesignSystem.Spacing.md))
                    .frame(maxWidth: .infinity, alignment: .center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                emptyCategoriesView(geometry: geometry)
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    @ViewBuilder
    private func emptyCategoriesView(geometry: GeometryProxy) -> some View {
        VStack(spacing: geometry.scale(DesignSystem.Spacing.md)) {
            Image(systemName: "folder.fill")
                .font(.system(size: geometry.scale(48)))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            
            Text("No categories available")
                .font(.custom("Inter-SemiBold", size: geometry.scale(18)))
                .foregroundColor(colorFromHex("423232"))
            
            Text("Categories can be added in the admin portal")
                .font(.custom("Inter-Regular", size: geometry.scale(14)))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                .multilineTextAlignment(.center)
            
            Button(action: {
                Task {
                    await appState.refreshCategories()
                }
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh Categories")
                }
                .font(.custom("Inter-Medium", size: geometry.scale(14)))
                .foregroundColor(.white)
                .padding(.horizontal, geometry.scale(DesignSystem.Spacing.md))
                .padding(.vertical, geometry.scale(8))
                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                .cornerRadius(geometry.scale(12))
            }
            .padding(.top, geometry.scale(8))
        }
        .padding(.top, geometry.scale(60))
        .padding(.leading, geometry.scale(donationSelectionPageLeftPadding))
        .padding(.trailing, geometry.scale(donationSelectionPageRightPadding))
    }
    
    @ViewBuilder
    private func amountSection(geometry: GeometryProxy) -> some View {
        VStack(spacing: 0) {
            VStack(alignment: .center, spacing: geometry.scale(6)) {
                Text("selectAmount".localized)
                    .font(.custom("Georgia", size: geometry.scale(28)))
                    .foregroundColor(amountSelectedColorValue)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, geometry.scale(8))
            .padding(.bottom, geometry.scale(21))
            .onTapGesture {
                guard showingCustomAmountKeypad else { return }
                showingCustomAmountKeypad = false
                customAmountFocused = false
            }
            
            amountContent(geometry: geometry)
                .frame(maxWidth: .infinity)
            
            Spacer(minLength: 0)
            
            actionButtonsRow(geometry: geometry)
                .padding(.top, geometry.scale(12))
        }
        .frame(maxWidth: .infinity)
    }
    
    @ViewBuilder
    private func amountContent(geometry: GeometryProxy) -> some View {
        VStack(spacing: geometry.scale(12)) {
            presetAmountButtons(geometry: geometry)
            
            CleanCustomAmountField(
                text: $customAmount,
                isActive: selectedCategory == nil && selectedAmount == nil && (!customAmount.isEmpty || customAmountFocused || showingCustomAmountKeypad),
                isFocused: $customAmountFocused,
                showingKeypad: $showingCustomAmountKeypad,
                onTap: {
                    // Clear category when custom amount is selected
                    selectedCategory = nil
                    quantity = 1
                    selectedAmount = nil
                    // Show custom keypad instead of system keyboard
                    showingCustomAmountKeypad = true
                    customAmountFocused = true
                },
                selectedColor: amountSelectedColorValue,
                height: geometry.scale(amountButtonHeight)
            )
            
            categoryQuantityStepper(geometry: geometry)
        }
        .padding(.horizontal, geometry.scale(DesignSystem.Spacing.md))
    }
    
    /// Quantity applies only when a category with `quantityEnabled` and a default unit price is selected.
    private var effectiveQuantity: Int {
        guard let cat = selectedCategory,
              cat.quantityEnabled,
              let u = cat.defaultAmount, u > 0 else { return 1 }
        return min(max(quantity, 1), Self.maxCategoryQuantity)
    }
    
    @ViewBuilder
    private func categoryQuantityStepper(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let creamFill = Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0)
        let h = geometry.scale(amountButtonHeight)
        if (selectedCategory?.quantityEnabled == true) && ((selectedCategory?.defaultAmount ?? 0) > 0) {
            HStack(spacing: s(14)) {
                Text("quantity".localized)
                    .font(.custom("Georgia", size: 19))
                    .foregroundColor(headingColor)
                Spacer(minLength: s(8))
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    quantity = max(1, quantity - 1)
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: s(32)))
                        .foregroundColor(quantity <= 1 ? headingColor.opacity(0.35) : Self.donationSelectedButtonColor)
                }
                .disabled(quantity <= 1)
                .buttonStyle(.plain)
                
                Text("\(quantity)")
                    .font(.system(size: s(22), weight: .medium, design: .serif))
                    .foregroundColor(headingColor)
                    .monospacedDigit()
                    .frame(minWidth: s(44))
                
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    quantity = min(quantity + 1, Self.maxCategoryQuantity)
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: s(32)))
                        .foregroundColor(quantity >= Self.maxCategoryQuantity ? headingColor.opacity(0.35) : Self.donationSelectedButtonColor)
                }
                .disabled(quantity >= Self.maxCategoryQuantity)
                .buttonStyle(.plain)
            }
            .padding(.horizontal, DesignSystem.Spacing.lg)
            .frame(height: h)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                    .fill(creamFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                            .fill(Color.white.opacity(0.15))
                    )
                    .shadow(color: Color.black.opacity(0.08), radius: 6, y: 3)
            )
            .cornerRadius(DesignSystem.Components.buttonCornerRadius)
            .overlay(
                DonationGoldRingBorder(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                    .allowsHitTesting(false)
            )
        }
    }
    
    @ViewBuilder
    private func presetAmountButtons(geometry: GeometryProxy) -> some View {
        let buttonCount = presetAmounts.count
        if buttonCount > 0 {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: geometry.scale(14)) {
                ForEach(presetAmounts, id: \.self) { amount in
                    amountButton(amount: amount, geometry: geometry)
                }
            }
        }
    }
    
    private func amountButton(amount: Double, geometry: GeometryProxy) -> some View {
        CleanAmountButton(
            amount: amount,
            isSelected: selectedAmount == amount && selectedCategory == nil,
            selectedColor: amountSelectedColorValue,
            unselectedColor: amountUnselectedColorValue,
            height: geometry.scale(amountButtonHeight),
            action: {
                // Toggle selection: if already selected, unselect it; otherwise select it
                if selectedAmount == amount && selectedCategory == nil {
                    // Unselect the amount
                    selectedAmount = nil
                    customAmount = ""
                    customAmountFocused = false
                } else {
                    // Select the amount and clear category
                    selectedCategory = nil
                    quantity = 1
                    selectedAmount = amount
                    customAmount = ""
                    customAmountFocused = false
                }
            }
        )
    }
    
    @ViewBuilder
    private func actionButtonsRow(geometry: GeometryProxy) -> some View {
        let actionCorner = geometry.scale(12)
        let creamFill = Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0)
        let reviewFill = Color(red: 147.0/255.0, green: 22.0/255.0, blue: 19.0/255.0)
        HStack(spacing: geometry.scale(DesignSystem.Spacing.sm)) {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    donorName = nil
                    donorPhone = nil
                    donorEmail = nil
                    donorAddress = nil
                    reviewDonationLines = []
                    appendSevaOnNextReview = false
                    onDismiss()
                }) {
                    HStack(spacing: geometry.scale(DesignSystem.Spacing.sm)) {
                        Image(systemName: "house.fill")
                        Text("returnToHome".localized)
                    }
                    .font(.custom("Inter-Regular", size: geometry.scale(18)))
                    .foregroundColor(headingColor)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, geometry.scale(18))
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
                .overlay(
                    DonationGoldRingBorder(cornerRadius: actionCorner)
                        .allowsHitTesting(false)
                )
                .buttonStyle(.plain)
                
                Button(action: {
                    guard hasValidAmount else { return }
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    let nextLine = CheckoutDonationLine.primary(
                        amount: currentAmount,
                        category: selectedCategory,
                        quantity: effectiveQuantity
                    )
                    if appendSevaOnNextReview {
                        reviewDonationLines.append(nextLine)
                        appendSevaOnNextReview = false
                    } else {
                        reviewDonationLines = [nextLine]
                    }
                    showingDetails = true
                }) {
                    Text("reviewDonation".localized)
                        .font(.custom("Inter-Medium", size: geometry.scale(18)))
                        .foregroundColor(hasValidAmount ? Color.white : headingColor)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, geometry.scale(18))
                        .background(
                            RoundedRectangle(cornerRadius: actionCorner)
                                .fill(hasValidAmount ? reviewFill : creamFill)
                                .overlay(
                                    RoundedRectangle(cornerRadius: actionCorner)
                                        .fill(hasValidAmount ? Color.clear : Color.white.opacity(0.15))
                                )
                        )
                        .cornerRadius(actionCorner)
                }
                .buttonStyle(.plain)
                .overlay(
                    DonationGoldRingBorder(cornerRadius: actionCorner)
                        .allowsHitTesting(false)
                )
                .allowsHitTesting(hasValidAmount)
        }
        .frame(maxWidth: .infinity)
    }
    
    private var hasValidAmount: Bool {
        // Check if category with defaultAmount is selected
        if let category = selectedCategory, let defaultAmount = category.defaultAmount, defaultAmount > 0 {
            return defaultAmount * Double(effectiveQuantity) > 0
        }
        // Otherwise check preset amount or custom amount
        if let amount = selectedAmount {
            return amount > 0
        }
        if let custom = Double(customAmount) {
            return custom > 0
        }
        return false
    }
    
    private var currentAmount: Double {
        // If category with defaultAmount is selected, multiply by quantity
        if let category = selectedCategory, let defaultAmount = category.defaultAmount, defaultAmount > 0 {
            return defaultAmount * Double(effectiveQuantity)
        }
        // Otherwise use selected amount or custom amount
        if let amount = selectedAmount {
            return amount
        }
        return Double(customAmount) ?? 0
    }
    
    /// Total charged at checkout (sum of review lines, or step-2 selection before review opens).
    private var checkoutTotalAmount: Double {
        let sum = reviewDonationLines.reduce(0) { $0 + $1.amount }
        return sum > 0 ? sum : currentAmount
    }
    
    private var checkoutLineItemsForAPI: [DonationLineItemBody]? {
        guard !reviewDonationLines.isEmpty else { return nil }
        return reviewDonationLines.map {
            DonationLineItemBody(
                label: $0.label,
                amount: $0.amount,
                quantity: $0.quantity > 1 ? $0.quantity : nil
            )
        }
    }
    
    private func createPledge() async {
        guard let templeId = appState.temple?.id,
              let deviceId = appState.deviceId else {
            print("[DonationHomeView] ❌ Missing temple ID or device ID for pledge")
            await MainActor.run {
                showingPledgeOption = false
            }
            return
        }
        
        do {
            let pledge = try await APIService.shared.createPledge(
                templeId: templeId,
                deviceId: deviceId,
                amount: checkoutTotalAmount,
                categoryId: selectedCategory?.id,
                donorName: donorName ?? "",
                donorPhone: donorPhone ?? "",
                donorEmail: donorEmail
            )
            
            print("[DonationHomeView] ✅ Pledge created: \(pledge.id)")
            
            // Reset and dismiss
            await MainActor.run {
                showingPledgeOption = false
                // Reset selections
                selectedCategory = nil
                selectedAmount = nil
                customAmount = ""
                quantity = 1
                donorName = nil
                donorPhone = nil
                donorEmail = nil
                reviewDonationLines = []
                appendSevaOnNextReview = false
                
                // Show success message or navigate back
                onDismiss()
            }
        } catch {
            print("[DonationHomeView] ❌ Failed to create pledge: \(error.localizedDescription)")
            await MainActor.run {
                showingPledgeOption = false
            }
        }
    }
}

// Wrapper to handle pledge creation and state updates
struct PledgeOptionViewWrapper: View {
    let amount: Double
    let category: DonationCategory?
    let donorName: String?
    let donorPhone: String?
    let donorEmail: String?
    let onPayNow: () -> Void
    let onPledge: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        PledgeOptionView(
            amount: amount,
            category: category,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            onPayNow: onPayNow,
            onPledge: onPledge,
            onCancel: onCancel
        )
    }
}

// Amount button — clear selected state, structured grid feel
struct CleanAmountButton: View {
    let amount: Double
    let isSelected: Bool
    let selectedColor: Color
    let unselectedColor: Color
    var height: CGFloat = 64
    var unselectedTextColor: Color = Color(red: 0.22, green: 0.18, blue: 0.16)
    let action: () -> Void
    
    private var textColor: Color {
        isSelected ? .white : unselectedTextColor
    }
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Text(amount.formattedCurrencyWhole())
                .font(.system(size: 19, weight: .regular, design: .serif))
                .monospacedDigit()
                .foregroundColor(textColor)
                .frame(maxWidth: .infinity)
                .frame(height: height)
                .background(
                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                        .fill(isSelected ? selectedColor : Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                                .fill(isSelected ? Color.clear : Color.white.opacity(0.15))
                        )
                        .shadow(color: isSelected ? .black.opacity(0.0) : .black.opacity(0.08), radius: isSelected ? 0 : 6, y: isSelected ? 0 : 3)
                )
                .cornerRadius(DesignSystem.Components.buttonCornerRadius)
        }
        .overlay(
            DonationGoldRingBorder(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                .allowsHitTesting(false)
        )
        .scaleEffect(isSelected ? 1.01 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}

// Custom amount — same fill, shadow, and gold ring as CleanAmountButton
struct CleanCustomAmountField: View {
    @Binding var text: String
    let isActive: Bool
    @FocusState.Binding var isFocused: Bool
    @Binding var showingKeypad: Bool
    let onTap: () -> Void
    let selectedColor: Color
    var height: CGFloat = 64
    var unselectedTextColor: Color = Color(red: 0.22, green: 0.18, blue: 0.16)
    
    private var textColor: Color {
        isActive ? .white : unselectedTextColor
    }
    
    var body: some View {
        HStack(spacing: DesignSystem.Components.inlineSpacing) {
            Text("customAmount".localized)
                .font(.custom("Georgia", size: 19))
                .foregroundColor(textColor)
            Spacer()
            Image(systemName: "square.and.pencil")
                .font(.system(size: DesignSystem.Typography.secondarySize))
                .foregroundColor(isActive ? Color.white.opacity(0.92) : unselectedTextColor.opacity(0.7))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: height)
        .padding(.horizontal, DesignSystem.Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                .fill(isActive ? selectedColor : Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                        .fill(isActive ? Color.clear : Color.white.opacity(0.15))
                )
                .shadow(color: isActive ? .black.opacity(0.0) : .black.opacity(0.08), radius: isActive ? 0 : 6, y: isActive ? 0 : 3)
        )
        .cornerRadius(DesignSystem.Components.buttonCornerRadius)
        .contentShape(Rectangle())
        .onTapGesture {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onTap()
        }
        .onChange(of: isFocused) { focused in
            if focused {
                // Show custom keypad when field is focused
                showingKeypad = true
                // Hide system keyboard by resigning focus immediately
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    isFocused = false
                }
            }
        }
        .overlay(
            DonationGoldRingBorder(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                .allowsHitTesting(false)
        )
        .scaleEffect(isActive ? 1.01 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
    }
}

// Clean category button — lighter visual weight, clear hierarchy
struct CleanCategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let selectedColor: Color
    let unselectedColor: Color
    var height: CGFloat = 64
    var horizontalPadding: CGFloat = 20
    var unselectedTextColor: Color = Color(red: 0.22, green: 0.18, blue: 0.16)
    let action: () -> Void
    
    private var hasSelectedImage: Bool {
        UIImage(named: "CategoryButtonSelected") != nil
    }
    
    private var hasUnselectedImage: Bool {
        UIImage(named: "CategoryButtonUnselected") != nil
    }
    
    private var textColor: Color {
        isSelected ? .white : unselectedTextColor
    }
    
    private var secondaryTextColor: Color {
        isSelected ? Color.white.opacity(0.92) : unselectedTextColor.opacity(0.85)
    }
    
    /// Default category amount on the trailing edge (matches kiosk burgundy accent).
    private var categoryAmountAccent: Color {
        Color(red: 147.0 / 255.0, green: 22.0 / 255.0, blue: 19.0 / 255.0)
    }
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            HStack(alignment: .center, spacing: DesignSystem.Spacing.sm) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(category.name)
                        .font(.custom("Georgia", size: 19))
                        .foregroundColor(textColor)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                    
                    if let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                            Text("Includes \(opportunities.count) yajman \(opportunities.count == 1 ? "opportunity" : "opportunities")")
                                .font(.custom(DesignSystem.Typography.secondaryFont, size: 11))
                                .foregroundColor(secondaryTextColor)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                HStack(spacing: DesignSystem.Spacing.sm) {
                    if let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                        Text(defaultAmount.formattedCurrencyWhole())
                            .font(.system(size: 19, weight: .regular, design: .serif))
                            .foregroundColor(isSelected ? .white : categoryAmountAccent)
                            .monospacedDigit()
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignSystem.Typography.secondarySize, weight: .medium))
                        .foregroundColor(isSelected ? .white.opacity(0.95) : unselectedTextColor.opacity(0.7))
                }
            }
            .padding(.horizontal, horizontalPadding)
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .background(buttonBackground)
            .cornerRadius(DesignSystem.Components.buttonCornerRadius)
        }
        .overlay(
            DonationGoldRingBorder(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                .allowsHitTesting(false)
        )
        .shadow(color: isSelected ? .black.opacity(0.0) : .black.opacity(0.08), radius: isSelected ? 0 : 6, y: isSelected ? 0 : 3)
        .scaleEffect(isSelected ? 1.01 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
    
    // Button background - uses custom images if available, otherwise falls back to colors
    @ViewBuilder
    private var buttonBackground: some View {
        if isSelected {
            if hasSelectedImage {
                // Use custom selected background image
                Image("CategoryButtonSelected")
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
            } else {
                selectedColor
            }
        } else {
            RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                .fill(Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                        .fill(Color.white.opacity(0.15))
                )
        }
    }
}

