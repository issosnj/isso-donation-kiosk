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
    var categorySelectedColor: String {
        appState.temple?.kioskTheme?.colors?.categorySelectedColor ?? 
        appState.temple?.homeScreenConfig?.buttonColors?.categorySelected ?? "#3366CC"
    }
    
    var categoryUnselectedColor: String {
        appState.temple?.kioskTheme?.colors?.categoryUnselectedColor ?? 
        appState.temple?.homeScreenConfig?.buttonColors?.categoryUnselected ?? "#3366CC"
    }
    
    var amountSelectedColor: String {
        appState.temple?.kioskTheme?.colors?.amountSelectedColor ?? 
        appState.temple?.homeScreenConfig?.buttonColors?.amountSelected ?? "#3366CC"
    }
    
    var amountUnselectedColor: String {
        appState.temple?.kioskTheme?.colors?.amountUnselectedColor ?? 
        appState.temple?.homeScreenConfig?.buttonColors?.amountUnselected ?? "#3366CC"
    }
    
    // Get colors with defaults (Color values)
    var categorySelectedColorValue: Color {
        // Default to red for selected category if not configured
        if !categorySelectedColor.isEmpty {
            return colorFromHex(categorySelectedColor)
        }
        return Color(red: 0.9, green: 0.2, blue: 0.2) // Red color for selected category
    }
    
    var categoryUnselectedColorValue: Color {
        let baseColor = colorFromHex(categoryUnselectedColor)
        // If unselected color is same as selected, apply opacity
        if categoryUnselectedColor == categorySelectedColor {
            return baseColor.opacity(0.7)
        }
        return baseColor
    }
    
    var amountSelectedColorValue: Color {
        colorFromHex(amountSelectedColor)
    }
    
    var amountUnselectedColorValue: Color {
        colorFromHex(amountUnselectedColor)
    }
    
    // Theme helper properties with defaults
    var theme: KioskTheme? {
        appState.temple?.kioskTheme
    }
    
    var headingFont: String {
        theme?.fonts?.headingFamily ?? "Inter-SemiBold"
    }
    
    var headingSize: CGFloat {
        CGFloat(theme?.fonts?.headingSize ?? 32)
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
    
    var headingColor: Color {
        colorFromHex(theme?.colors?.headingColor, defaultColor: colorFromHex("423232"))
    }
    
    var bodyTextColor: Color {
        colorFromHex(theme?.colors?.bodyTextColor, defaultColor: Color(red: 0.5, green: 0.5, blue: 0.6))
    }
    
    var subtitleColor: Color {
        colorFromHex(theme?.colors?.subtitleColor, defaultColor: Color(red: 0.5, green: 0.5, blue: 0.6))
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
        CGFloat(theme?.layout?.amountButtonHeight ?? 70)
    }
    
    var categoryButtonHeight: CGFloat {
        CGFloat(theme?.layout?.categoryButtonHeight ?? 70)
    }
    
    var headerTopPadding: CGFloat {
        CGFloat(theme?.layout?.headerTopPadding ?? 120)
    }
    
    var categoryHeaderTopPadding: CGFloat {
        CGFloat((theme?.layout?.categoryHeaderTopPadding ?? headerTopPadding) + 5)
    }
    
    var sectionSpacing: CGFloat {
        CGFloat(theme?.layout?.sectionSpacing ?? 40)
    }
    
    var categoryAmountSectionSpacing: CGFloat {
        CGFloat(theme?.layout?.categoryAmountSectionSpacing ?? 40)
    }
    
    var donationSelectionPageLeftPadding: CGFloat {
        CGFloat(theme?.layout?.donationSelectionPageLeftPadding ?? 40)
    }
    
    var donationSelectionPageRightPadding: CGFloat {
        CGFloat(theme?.layout?.donationSelectionPageRightPadding ?? 40)
    }
    
    var customAmountKeypadX: CGFloat {
        CGFloat(theme?.layout?.customAmountKeypadX ?? 0)
    }
    
    var customAmountKeypadY: CGFloat {
        CGFloat(theme?.layout?.customAmountKeypadY ?? 0)
    }
    
    var keypadTheme: KeypadTheme {
        let layout = theme?.layout
        return KeypadTheme(
            width: CGFloat(layout?.customAmountKeypadWidth ?? 320),
            buttonHeight: CGFloat(layout?.customAmountKeypadButtonHeight ?? 70),
            buttonSpacing: CGFloat(layout?.customAmountKeypadButtonSpacing ?? 12),
            buttonCornerRadius: CGFloat(layout?.customAmountKeypadButtonCornerRadius ?? 12),
            backgroundColor: colorFromHex(layout?.customAmountKeypadBackgroundColor, defaultColor: Color(red: 135/255.0, green: 81/255.0, blue: 43/255.0)),
            borderColor: colorFromHex(layout?.customAmountKeypadBorderColor, defaultColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0)),
            borderWidth: CGFloat(layout?.customAmountKeypadBorderWidth ?? 3),
            glowColor: colorFromHex(layout?.customAmountKeypadGlowColor, defaultColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0)),
            glowRadius: CGFloat(layout?.customAmountKeypadGlowRadius ?? 15),
            buttonColor: colorFromHex(layout?.customAmountKeypadButtonColor, defaultColor: Color(red: 248/255.0, green: 216/255.0, blue: 161/255.0)),
            buttonTextColor: colorFromHex(layout?.customAmountKeypadButtonTextColor, defaultColor: Color(red: 0.2, green: 0.2, blue: 0.3)),
            numberFontSize: CGFloat(layout?.customAmountKeypadNumberFontSize ?? 32),
            letterFontSize: CGFloat(layout?.customAmountKeypadLetterFontSize ?? 10),
            padding: CGFloat(layout?.customAmountKeypadPadding ?? 16),
            cornerRadius: CGFloat(layout?.customAmountKeypadCornerRadius ?? 16)
        )
    }
    
    var buttonSpacing: CGFloat {
        CGFloat(theme?.layout?.buttonSpacing ?? 12)
    }
    
    var cornerRadius: CGFloat {
        CGFloat(theme?.layout?.cornerRadius ?? 12)
    }
    
    var quantityTotalSpacing: CGFloat {
        CGFloat(theme?.layout?.quantityTotalSpacing ?? 24)
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                backgroundView(geometry: geometry)
            }
            .ignoresSafeArea(.all, edges: .all)
            
            mainContent
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
        .sheet(isPresented: $showingYajmanOpportunities) {
            if let category = selectedCategory, let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                YajmanOpportunitiesView(
                    category: category,
                    opportunities: opportunities,
                    onDismiss: {
                        showingYajmanOpportunities = false
                    }
                )
            }
        }
        .fullScreenCover(isPresented: $showingDetails) {
            ModernDonationDetailsView(
                    amount: currentAmount,
                    category: selectedCategory,
                    onConfirm: { name, phone, email, address in
                        showingDetails = false
                        // Show pledge option ONLY if selected category has yajman opportunities (sponsor tiers)
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
                        showingDetails = false
                        onDismiss()
                    }
                )
            }
            .sheet(isPresented: $showingPledgeOption) {
                PledgeOptionViewWrapper(
                    amount: currentAmount,
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
            .fullScreenCover(isPresented: $showingPayment) {
            ModernPaymentView(
                    amount: currentAmount,
                    category: selectedCategory,
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
                    }
                }
            )
        }
        .task {
            // Only refresh if categories are empty to avoid unnecessary refreshes
            if appState.categories.isEmpty {
                await appState.refreshCategories()
            }
            
            // Refresh temple config to get latest theme settings
            await appState.refreshTempleConfig()
        }
        .onChange(of: appState.temple?.kioskTheme) { _ in
            // Theme was updated, view will automatically refresh due to @EnvironmentObject
            print("[DonationHomeView] Theme updated, view will refresh")
        }
        .detectTouches() // Detect all user interactions to reset idle timer
        .onChange(of: customAmount) { _ in
            // User is typing in custom amount field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: selectedCategory) { _ in
            // User selected a category - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: selectedAmount) { _ in
            // User selected an amount - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: quantity) { _ in
            // User changed quantity - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
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
    
    private var mainContent: some View {
        ZStack {
            // Use reduced spacing when keypad is showing
            HStack(spacing: showingCustomAmountKeypad ? 20 : categoryAmountSectionSpacing) {
                // Show keypad in place of category section when active
                if showingCustomAmountKeypad {
                    // If X and Y are both 0, use default positioning (aligned with category buttons)
                    // Otherwise, use absolute positioning
                    if customAmountKeypadX == 0 && customAmountKeypadY == 0 {
                        VStack(spacing: 0) {
                            // Match the same top padding as category section header
                            Spacer()
                                .frame(height: categoryHeaderTopPadding)
                            
                            // Match the header height and bottom padding exactly
                            // Heading size + body size + spacing 6pt + bottom padding 12pt
                            Spacer()
                                .frame(height: headingSize + bodySize + 6 + 12)
                            
                            // Keypad aligned to start where category buttons start
                            // Match the exact padding used by category buttons (16pt)
                            HStack {
                                CustomNumericKeypad(
                                    amount: $customAmount,
                                    onDismiss: {
                                        showingCustomAmountKeypad = false
                                        customAmountFocused = false
                                    },
                                    theme: keypadTheme
                                )
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            
                            Spacer()
                        }
                        .frame(maxWidth: .infinity)
                    } else {
                        // Custom positioning using X and Y coordinates
                        GeometryReader { geometry in
                            CustomNumericKeypad(
                                amount: $customAmount,
                                onDismiss: {
                                    showingCustomAmountKeypad = false
                                    customAmountFocused = false
                                },
                                theme: keypadTheme
                            )
                            .position(
                                x: customAmountKeypadX > 0 ? customAmountKeypadX : geometry.size.width / 2,
                                y: customAmountKeypadY > 0 ? customAmountKeypadY : geometry.size.height / 2
                            )
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                } else {
                    categorySection
                        .frame(maxWidth: .infinity)
                }
                
                amountSection
                    .frame(maxWidth: .infinity)
            }
            .padding(.leading, donationSelectionPageLeftPadding)
            .padding(.trailing, donationSelectionPageRightPadding)
            
            // Overlay to detect taps outside keypad
            // Only close when tapping on the amount section, not on the keypad itself
            if showingCustomAmountKeypad {
                HStack(spacing: 0) {
                    // Left side - keypad area, allow taps to pass through to buttons
                    Color.clear
                        .frame(maxWidth: .infinity)
                        .allowsHitTesting(false)
                    
                    // Right side - amount section, close on tap
                    Color.clear
                        .frame(maxWidth: .infinity)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            showingCustomAmountKeypad = false
                            customAmountFocused = false
                        }
                }
            }
        }
    }
    
    
    // Check if any categories have yajman opportunities (sponsorship tiers)
    private var hasSponsorshipTiers: Bool {
        appState.temple?.yajmanOpportunitiesEnabled == true &&
        appState.categories.contains { category in
            category.yajmanOpportunities != nil && !(category.yajmanOpportunities?.isEmpty ?? true)
        }
    }
    
    private var categorySection: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 6) {
                Text("selectCategory".localized)
                    .font(.custom(headingFont, size: headingSize))
                    .foregroundColor(headingColor)
                
                if hasSponsorshipTiers {
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                        Text("Yajman Opportunities Available")
                            .font(.custom(bodyFont, size: bodySize - 2))
                            .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                    }
                    .padding(.top, 4)
                } else {
                    Text("Choose your donation category")
                        .font(.custom(bodyFont, size: bodySize))
                        .foregroundColor(subtitleColor)
                }
            }
            .padding(.top, categoryHeaderTopPadding)
            .padding(.bottom, 12)
            
            categoryContent
                .frame(maxWidth: .infinity)
            
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
    
    private var categoryContent: some View {
        VStack(spacing: 12) {
            if !appState.categories.isEmpty {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(appState.categories) { category in
                            CleanCategoryButton(
                                category: category,
                                isSelected: selectedCategory?.id == category.id,
                                selectedColor: categorySelectedColorValue,
                                unselectedColor: categoryUnselectedColorValue,
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
                            .frame(maxWidth: categoryBoxMaxWidth) // Use theme width
                        }
                    }
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity)
                    .frame(alignment: .center)
                }
            } else {
                emptyCategoriesView
            }
        }
        .frame(maxWidth: .infinity)
    }
    
    private var emptyCategoriesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.fill")
                .font(.system(size: 48))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            
            Text("No categories available")
                .font(.custom("Inter-SemiBold", size: 18))
                .foregroundColor(colorFromHex("423232"))
            
            Text("Categories can be added in the admin portal")
                .font(.custom("Inter-Regular", size: 14))
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
                .font(.custom("Inter-Medium", size: 14))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                .cornerRadius(12)
            }
            .padding(.top, 8)
        }
        .padding(.top, 60)
        .padding(.leading, donationSelectionPageLeftPadding)
        .padding(.trailing, donationSelectionPageRightPadding)
    }
    
    private var amountSection: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 6) {
                Text("selectAmount".localized)
                    .font(.custom(headingFont, size: headingSize))
                    .foregroundColor(headingColor)
                
                Text("Choose a preset donation amount")
                    .font(.custom(bodyFont, size: bodySize))
                    .foregroundColor(subtitleColor)
            }
            .padding(.top, headerTopPadding)
            .padding(.bottom, 12)
            
            amountContent
                .frame(maxWidth: .infinity)
            
            Spacer()
            
            continueButton
        }
        .frame(maxWidth: .infinity)
    }
    
    private var amountContent: some View {
        VStack(spacing: 12) {
            presetAmountButtons
                .padding(.horizontal, 16)
            
            CleanCustomAmountField(
                text: $customAmount,
                isActive: true, // Always show inline text field
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
                }
            )
            .padding(.horizontal, 16)
        }
    }
    
    private var presetAmountButtons: some View {
        let buttonCount = presetAmounts.count
        return Group {
            if buttonCount > 0 {
                // Use 2-column grid for 3 rows x 2 columns layout
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(presetAmounts, id: \.self) { amount in
                        amountButton(amount: amount)
                    }
                }
            } else {
                EmptyView()
            }
        }
    }
    
    private func amountButton(amount: Double) -> some View {
        CleanAmountButton(
            amount: amount,
            isSelected: selectedAmount == amount && selectedCategory == nil,
            selectedColor: amountSelectedColorValue,
            unselectedColor: amountUnselectedColorValue,
            action: {
                // Clear category when preset amount is selected
                selectedCategory = nil
                quantity = 1
                selectedAmount = amount
                customAmount = ""
                customAmountFocused = false
            }
        )
    }
    
    private var continueButton: some View {
        VStack(spacing: 16) {
            // Show quantity and total side by side when category with quantity is selected
            if let category = selectedCategory, let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                HStack(spacing: quantityTotalSpacing) {
                    // Quantity selector
                    VStack(spacing: 8) {
                        Text("quantity".localized)
                            .font(.custom(bodyFont, size: bodySize))
                            .foregroundColor(subtitleColor)
                        
                        HStack(spacing: 12) {
                            Button(action: {
                                if quantity > 1 {
                                    quantity -= 1
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(quantity > 1 ? Color(red: 0.2, green: 0.4, blue: 0.8) : Color.gray)
                            }
                            .disabled(quantity <= 1)
                            
                            Text("\(quantity)")
                                .font(.custom(headingFont, size: 24))
                                .foregroundColor(quantityTotalColor)
                                .frame(minWidth: 40)
                            
                            Button(action: {
                                quantity += 1
                            }) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            }
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 24)
                        .background(Color.white)
                        .cornerRadius(cornerRadius)
                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                    }
                    
                    // Total display
                    VStack(spacing: 6) {
                        Text("total".localized)
                            .font(.custom(bodyFont, size: bodySize))
                            .foregroundColor(subtitleColor)
                        
                        Text("$\(String(format: "%.2f", defaultAmount * Double(quantity)))")
                            .font(.custom(headingFont, size: 28))
                            .foregroundColor(quantityTotalColor)
                    }
                }
                .padding(.bottom, 8)
                .transition(.scale.combined(with: .opacity))
            } else if hasValidAmount {
                // Show total only when amount is selected (no quantity)
                VStack(spacing: 6) {
                    Text("Total")
                        .font(.custom("Inter-Regular", size: 14))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                    
                    Text("$\(String(format: "%.2f", currentAmount))")
                        .font(.custom("Inter-SemiBold", size: 28))
                        .foregroundColor(colorFromHex("423232"))
                }
                .padding(.bottom, 8)
                .transition(.scale.combined(with: .opacity))
            }
            
            // Buttons side by side: Home and Continue
            HStack(spacing: 16) {
                // Home button - uses returnToHomeButtonColor from theme
                Button(action: {
                    onDismiss()
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "house.fill")
                        Text("returnToHome".localized)
                    }
                    .font(.custom("Inter-Medium", size: 18))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        Group {
                            let buttonColor = colorFromHex(
                                appState.temple?.kioskTheme?.colors?.returnToHomeButtonColor,
                                defaultColor: Color(red: 1.0, green: 0.58, blue: 0.0)
                            )
                            if appState.temple?.kioskTheme?.colors?.returnToHomeButtonGradient == true {
                                gradientFromColor(buttonColor)
                            } else {
                                buttonColor
                            }
                        }
                    )
                    .cornerRadius(12)
                }
                
                // Continue button - uses proceedToPaymentButtonColor from theme
                Button(action: {
                    showingDetails = true
                }) {
                    Text("Review Donation")
                        .font(.custom("Inter-Medium", size: 18))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            Group {
                                if hasValidAmount {
                                    let buttonColor = colorFromHex(
                                        appState.temple?.kioskTheme?.colors?.proceedToPaymentButtonColor,
                                        defaultColor: Color(red: 1.0, green: 0.58, blue: 0.0)
                                    )
                                    if appState.temple?.kioskTheme?.colors?.proceedToPaymentButtonGradient == true {
                                        gradientFromColor(buttonColor)
                                    } else {
                                        buttonColor
                                    }
                                } else {
                                    Color.gray.opacity(0.4)
                                }
                            }
                        )
                        .cornerRadius(12)
                }
                .disabled(!hasValidAmount)
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 30)
        }
        .frame(maxWidth: .infinity)
    }
    
    private var hasValidAmount: Bool {
        // Check if category with defaultAmount is selected
        if let category = selectedCategory, let defaultAmount = category.defaultAmount, defaultAmount > 0 {
            return defaultAmount * Double(quantity) > 0
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
            return defaultAmount * Double(quantity)
        }
        // Otherwise use selected amount or custom amount
        if let amount = selectedAmount {
            return amount
        }
        return Double(customAmount) ?? 0
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
                amount: currentAmount,
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

// Clean, simple amount button matching reference
struct CleanAmountButton: View {
    let amount: Double
    let isSelected: Bool
    let selectedColor: Color
    let unselectedColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
                Text("$\(Int(amount))")
                .font(.custom("Inter-Medium", size: 20))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 70)
                .background(isSelected ? selectedColor : unselectedColor)
                .cornerRadius(12)
        }
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

// Clean custom amount field
struct CleanCustomAmountField: View {
    @Binding var text: String
    let isActive: Bool
    @FocusState.Binding var isFocused: Bool
    @Binding var showingKeypad: Bool
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Text("$")
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                .frame(width: 24, alignment: .leading)
            
            if isActive {
                // Display field that shows amount or placeholder - styled like the image
                HStack {
                    if text.isEmpty {
                        Text("customAmount".localized)
                            .font(.custom("Inter-Regular", size: 20))
                            .foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.65))
                    } else {
                        Text(text)
                            .font(.custom("Inter-Regular", size: 20))
                            .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .frame(height: 60)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 0.98, green: 0.97, blue: 0.95)) // Cream/white interior
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(red: 0.85, green: 0.75, blue: 0.55), lineWidth: 2) // Light gold border
                        )
                )
                .contentShape(Rectangle())
                .onTapGesture {
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
            } else {
                Button(action: onTap) {
                    HStack {
                        if !text.isEmpty, let amount = Double(text), amount > 0 {
                            Text("$\(text)")
                                .font(.custom("Inter-Regular", size: 20))
                                .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                        } else {
                            Text("customAmount".localized)
                                .font(.custom("Inter-Regular", size: 20))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .frame(height: 60)
        .background(Color.white)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isActive 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.5)
                        : Color.gray.opacity(0.2),
                    lineWidth: isActive ? 2 : 1
                )
        )
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .scaleEffect(isActive ? 1.01 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isActive)
    }
}

// Clean category button
struct CleanCategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let selectedColor: Color
    let unselectedColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                // Icon on the left (orange leaf-like icon)
                Image(systemName: "leaf.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(red: 1.0, green: 0.58, blue: 0.0))
                
                // Category name and amount side by side
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
            Text(category.name)
                            .font(.custom("Inter-SemiBold", size: 18))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        if let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                            Text("$\(Int(defaultAmount))")
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(.white)
                        }
                    }
                    
                    // Show yajman opportunities indicator - make it more visible
                    if let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                            Text("Includes \(opportunities.count) yajman \(opportunities.count == 1 ? "opportunity" : "opportunities")")
                                .font(.custom("Inter-Medium", size: 13))
                                .foregroundColor(.white.opacity(0.95))
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                Spacer()
                
                // Chevron on the right
                Image(systemName: "chevron.right")
                    .font(.custom("Inter-SemiBold", size: 14))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .background(isSelected ? selectedColor : unselectedColor)
            .cornerRadius(12)
        }
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

