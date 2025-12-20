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
    private static let defaultBlue = Color(red: 0.2, green: 0.4, blue: 0.8)
    
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
        LinearGradient(
            gradient: Gradient(colors: [
                Color.white,
                Color(red: 0.95, green: 0.97, blue: 1.0)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea(.all, edges: .all)
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
        HStack(spacing: 0) {
            categorySection
            
            // Divider
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(width: 2)
            
            amountSection
        }
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
                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.white)
                    .cornerRadius(10)
                    .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
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
            VStack(spacing: 12) {
                Text("Select Category")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                
                Text("Choose where your donation goes (optional)")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
            }
            .padding(.top, 60)
            .padding(.bottom, 40)
            
            categoryContent
                .frame(maxWidth: .infinity)
            
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.5))
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
                    .padding(.horizontal, 40)
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
                .foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.7))
            
            Text("No categories available")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
            
            Text("Categories can be added in the admin portal")
                .font(.system(size: 14, weight: .regular))
                .foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.7))
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
                .cornerRadius(8)
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
                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
            
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
                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
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
            .cornerRadius(12)
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
            VStack(spacing: 12) {
                Text("Select Amount")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                
                Text("Choose a preset amount or enter custom")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
            }
            .padding(.top, 60)
            .padding(.bottom, 40)
            
            amountContent
                .frame(maxWidth: .infinity)
            
            Spacer()
            
            continueButton
        }
        .frame(maxWidth: .infinity)
        .background(Color.white)
    }
    
    private var amountContent: some View {
        VStack(spacing: 30) {
            presetAmountButtons
                .padding(.horizontal, 40)
            
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
            .padding(.horizontal, 40)
            
            if hasValidAmount {
                VStack(spacing: 8) {
                    Text("Selected Amount")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                    
                    Text("$\(String(format: "%.2f", currentAmount))")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                }
                .padding(.top, 20)
                .transition(.scale.combined(with: .opacity))
            }
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
            if hasValidAmount {
                Text("Ready to donate $\(String(format: "%.2f", currentAmount))")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
            }
            
            Button(action: {
                showingDetails = true
            }) {
                Text(hasValidAmount ? "Ready to donate $\(String(format: "%.2f", currentAmount))" : "Select Amount to Continue")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        hasValidAmount
                            ? Color(red: 0.2, green: 0.4, blue: 0.8)
                            : Color.gray.opacity(0.4)
                    )
                    .cornerRadius(12)
            }
            .disabled(!hasValidAmount)
            .padding(.horizontal, 40)
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
                .frame(height: 70)
                .background(
                    isSelected ? selectedColor : unselectedColor
                )
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
        HStack(spacing: 8) {
            Text("$")
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(.gray)
                .frame(width: 20, alignment: .leading)
            
            if isActive {
                TextField("", text: $text, prompt: Text("Custom Amount").foregroundColor(.gray))
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
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .frame(height: 70)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    isActive 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.5)
                        : Color.gray.opacity(0.2),
                    lineWidth: isActive ? 2 : 1
                )
        )
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
            VStack(spacing: 4) {
                Text(category.name)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                
                if let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                    Text("$\(Int(defaultAmount))")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .background(
                isSelected ? selectedColor : unselectedColor
            )
            .cornerRadius(12)
        }
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}
