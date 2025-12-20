import SwiftUI

struct DonationHomeView: View {
    @EnvironmentObject var appState: AppState
    let onDismiss: () -> Void
    @State private var selectedAmount: Double?
    @State private var customAmount: String = ""
    @State private var selectedCategory: DonationCategory?
    @State private var quantity: Int = 1
    @State private var showingDetails = false
    @State private var showingPayment = false
    @State private var donorName: String?
    @State private var donorEmail: String?
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
    
    // Get colors with defaults
    var categorySelectedColor: Color {
        // Default to red for selected category if not configured
        if let hex = buttonColors.categorySelected, !hex.isEmpty {
            return colorFromHex(hex)
        }
        return Color(red: 0.9, green: 0.2, blue: 0.2) // Red color for selected category
    }
    
    var categoryUnselectedColor: Color {
        let baseColor = colorFromHex(buttonColors.categoryUnselected)
        // If unselected color is same as selected, apply opacity
        if buttonColors.categoryUnselected == buttonColors.categorySelected {
            return baseColor.opacity(0.7)
        }
        return baseColor
    }
    
    var amountSelectedColor: Color {
        colorFromHex(buttonColors.amountSelected)
    }
    
    var amountUnselectedColor: Color {
        colorFromHex(buttonColors.amountUnselected)
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
        CGFloat(theme?.layout?.categoryHeaderTopPadding ?? headerTopPadding)
    }
    
    var sectionSpacing: CGFloat {
        CGFloat(theme?.layout?.sectionSpacing ?? 40)
    }
    
    var categoryAmountSectionSpacing: CGFloat {
        CGFloat(theme?.layout?.categoryAmountSectionSpacing ?? 40)
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
            backgroundGradient
            mainContent
            homeButtonOverlay
        }
        .fullScreenCover(isPresented: $showingDetails) {
            ModernDonationDetailsView(
                    amount: currentAmount,
                    category: selectedCategory,
                    onConfirm: { name, email in
                        showingDetails = false
                        showingPayment = true
                        donorName = name
                        donorEmail = email
                    }
                )
            }
            .fullScreenCover(isPresented: $showingPayment) {
            ModernPaymentView(
                    amount: currentAmount,
                    category: selectedCategory,
                    donorName: donorName,
                    donorEmail: donorEmail,
                    onComplete: {
                    withAnimation {
                        showingPayment = false
                        selectedAmount = nil
                        customAmount = ""
                        selectedCategory = nil
                        quantity = 1
                        donorName = nil
                        donorEmail = nil
                    }
                }
            )
        }
    }
    
    private var backgroundGradient: some View {
        Group {
            // Background: Use preloaded image from AppState for instant display
            if let backgroundImage = appState.backgroundImage {
                Image(uiImage: backgroundImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .ignoresSafeArea(.all, edges: .all)
            } else if let backgroundUrl = appState.temple?.homeScreenConfig?.backgroundImageUrl,
               let url = URL(string: backgroundUrl) {
                // Show gradient immediately while loading, then overlay image when ready
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.white,
                            Color(red: 0.95, green: 0.97, blue: 1.0)
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            Color.clear
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            Color.clear
                        @unknown default:
                            Color.clear
                        }
                    }
                }
                .ignoresSafeArea(.all, edges: .all)
            } else {
                // Default gradient background
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
        }
        .onTapGesture {
            customAmountFocused = false
        }
        .task {
            // Ensure background image is preloaded
            if appState.backgroundImage == nil {
                await appState.preloadBackgroundImage()
            }
            
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
        .onChange(of: appState.temple?.homeScreenConfig?.backgroundImageUrl) { _ in
            // Background URL changed, reload image
            Task {
                await appState.preloadBackgroundImage()
            }
        }
        .onChange(of: appState.backgroundImage) { _ in
            // Background image was updated, view will refresh automatically
            print("[DonationHomeView] Background image updated")
        }
    }
    
    private var mainContent: some View {
        HStack(spacing: categoryAmountSectionSpacing) {
            categorySection
                .frame(maxWidth: .infinity)
            
            amountSection
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 40)
    }
    
    private var homeButtonOverlay: some View {
        VStack {
            HStack {
                    Button(action: {
                        onDismiss()
                    }) {
                    HStack(spacing: 8) {
                        Image(systemName: "house.fill")
                        Text("Home")
                    }
                    .font(.custom("Inter-Medium", size: 16))
                    .foregroundColor(colorFromHex("423232"))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.95))
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.15), radius: 6, x: 0, y: 3)
                }
                .padding()
                Spacer()
            }
            Spacer()
        }
    }
    
    private var categorySection: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 6) {
                Text("Select Category")
                    .font(.custom(headingFont, size: headingSize))
                    .foregroundColor(headingColor)
                
                Text("Choose your donation category")
                    .font(.custom(bodyFont, size: bodySize))
                    .foregroundColor(subtitleColor)
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
                                selectedColor: categorySelectedColor,
                                unselectedColor: categoryUnselectedColor,
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
        .padding(.horizontal, 40)
    }
    
    private var amountSection: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 6) {
                Text("Select Amount")
                    .font(.custom(headingFont, size: headingSize))
                    .foregroundColor(headingColor)
                
                Text("Choose preset donation amount from")
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
                isActive: selectedAmount == nil && selectedCategory == nil,
                isFocused: $customAmountFocused,
                onTap: {
                    // Clear category when custom amount is selected
                    selectedCategory = nil
                    quantity = 1
                    selectedAmount = nil
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
            selectedColor: amountSelectedColor,
            unselectedColor: amountUnselectedColor,
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
                        Text("Quantity")
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
                        Text("Total")
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
            
            Button(action: {
                showingDetails = true
            }) {
                Text("Select Amount to Continue")
                    .font(.custom("Inter-Medium", size: 18))
                    .foregroundColor(.white)
                    .frame(maxWidth: 600) // Center the button with max width
                    .padding(.vertical, 14)
                    .background(
                        hasValidAmount
                            ? Color(red: 1.0, green: 0.58, blue: 0.0) // Orange color
                            : Color.gray.opacity(0.4)
                    )
                    .cornerRadius(12)
            }
            .disabled(!hasValidAmount)
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
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Text("$")
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                .frame(width: 24, alignment: .leading)
            
            if isActive {
                TextField("", text: $text, prompt: Text("Custom Amount").foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6)))
                    .keyboardType(.decimalPad)
                    .font(.custom("Inter-Regular", size: 20))
                    .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                    .focused($isFocused)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.done)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .onChange(of: text) { newValue in
                        let filtered = newValue.filter { "0123456789.".contains($0) }
                        if filtered != newValue {
                            text = filtered
                        }
                    }
            } else {
                Button(action: onTap) {
                    Text("Custom Amount")
                        .font(.custom("Inter-Regular", size: 20))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
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

