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
        colorFromHex(buttonColors.categorySelected)
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
            // Background: Custom image if available, otherwise gradient
            if let backgroundUrl = appState.temple?.homeScreenConfig?.backgroundImageUrl,
               let url = URL(string: backgroundUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        // Show gradient while loading
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white,
                                Color(red: 0.95, green: 0.97, blue: 1.0)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        // Fallback to gradient on error
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white,
                                Color(red: 0.95, green: 0.97, blue: 1.0)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    @unknown default:
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
            // Only refresh if categories are empty to avoid unnecessary refreshes
            if appState.categories.isEmpty {
                await appState.refreshCategories()
            }
        }
    }
    
    private var mainContent: some View {
        HStack(spacing: 60) {
            categorySection
            amountSection
        }
        .padding(.horizontal, 60)
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
                    .font(.system(size: 16, weight: .medium))
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
            VStack(spacing: 8) {
                Text("Select Category")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundColor(colorFromHex("423232"))
                
                Text("Choose your donation category")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            }
            .padding(.top, 60)
            .padding(.bottom, 30)
            
            categoryContent
                .frame(maxWidth: .infinity)
            
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
    
    private var categoryContent: some View {
        VStack(spacing: 20) {
            if !appState.categories.isEmpty {
                ScrollView {
                    VStack(spacing: 16) {
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
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                if let category = selectedCategory, let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                    quantitySelector(category: category, defaultAmount: defaultAmount)
                }
            } else {
                emptyCategoriesView
            }
        }
    }
    
    private var emptyCategoriesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.fill")
                .font(.system(size: 48))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            
            Text("No categories available")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(colorFromHex("423232"))
            
            Text("Categories can be added in the admin portal")
                .font(.system(size: 14, weight: .regular))
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
                .font(.system(size: 14, weight: .medium))
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
    
    private func quantitySelector(category: DonationCategory, defaultAmount: Double) -> some View {
        VStack(spacing: 12) {
            Text("Quantity")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(colorFromHex("423232"))
            
            HStack(spacing: 20) {
                    Button(action: {
                        if quantity > 1 {
                            quantity -= 1
                        }
                    }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(quantity > 1 ? Color(red: 0.2, green: 0.4, blue: 0.8) : Color.gray)
                }
                .disabled(quantity <= 1)
                
                Text("\(quantity)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(colorFromHex("423232"))
                    .frame(minWidth: 60)
                
                    Button(action: {
                        quantity += 1
                    }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                }
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 40)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
            
            Text("Total: $\(String(format: "%.2f", defaultAmount * Double(quantity)))")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
        }
        .padding(.horizontal, 40)
        .padding(.top, 20)
        .transition(.scale.combined(with: .opacity))
    }
    
    private var amountSection: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 8) {
                Text("Select Amount")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundColor(colorFromHex("423232"))
                
                Text("Choose preset donation amount from")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            }
            .padding(.top, 60)
            .padding(.bottom, 30)
            
            amountContent
                .frame(maxWidth: .infinity)
            
            Spacer()
            
            continueButton
        }
        .frame(maxWidth: .infinity)
    }
    
    private var amountContent: some View {
        VStack(spacing: 20) {
            presetAmountButtons
                .padding(.horizontal, 20)
            
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
            .padding(.horizontal, 20)
        }
    }
    
    private var presetAmountButtons: some View {
        let buttonCount = presetAmounts.count
        return Group {
            if buttonCount > 0 {
                if buttonCount <= 4 {
                    VStack(spacing: 16) {
                        HStack(spacing: 16) {
                            ForEach(Array(presetAmounts.prefix(2)), id: \.self) { amount in
                                amountButton(amount: amount)
                            }
                        }
                        
                        if buttonCount > 2 {
                            HStack(spacing: 16) {
                                ForEach(Array(presetAmounts.suffix(buttonCount > 2 ? buttonCount - 2 : 0)), id: \.self) { amount in
                                    amountButton(amount: amount)
                                }
                            }
                        }
                    }
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach(presetAmounts, id: \.self) { amount in
                                amountButton(amount: amount)
                            }
                        }
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
            Button(action: {
                showingDetails = true
            }) {
                Text("Select Amount to Continue")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        hasValidAmount
                            ? Color(red: 1.0, green: 0.58, blue: 0.0) // Orange color
                            : Color.gray.opacity(0.4)
                    )
                    .cornerRadius(16)
            }
            .disabled(!hasValidAmount)
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
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
                .font(.system(size: 24, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .background(
                    ZStack {
                        // Base gradient
                        LinearGradient(
                            gradient: Gradient(colors: [
                                (isSelected ? selectedColor : unselectedColor),
                                (isSelected ? selectedColor : unselectedColor).opacity(0.9)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        
                        // Shine effect overlay
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(0.2),
                                Color.clear,
                                Color.clear
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    }
                )
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
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
                    .font(.system(size: 20, weight: .medium))
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
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .frame(height: 80)
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
            HStack(spacing: 12) {
                // Icon on the left (orange leaf-like icon)
                Image(systemName: "leaf.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Color(red: 1.0, green: 0.58, blue: 0.0))
                
                VStack(spacing: 4) {
                    Text(category.name)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    if let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                        Text("$\(Int(defaultAmount))")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                Spacer()
                
                // Chevron on the right
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        (isSelected ? selectedColor : unselectedColor),
                        (isSelected ? selectedColor : unselectedColor).opacity(0.9)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}
