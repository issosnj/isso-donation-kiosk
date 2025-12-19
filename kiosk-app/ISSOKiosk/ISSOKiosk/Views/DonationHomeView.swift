import SwiftUI

struct DonationHomeView: View {
    @EnvironmentObject var appState: AppState
    let onDismiss: () -> Void
    @State private var selectedAmount: Double?
    @State private var customAmount: String = ""
    @State private var selectedCategory: DonationCategory?
    @State private var showingDetails = false
    @State private var showingPayment = false
    @State private var donorName: String?
    @State private var donorEmail: String?
    @FocusState private var customAmountFocused: Bool
    
    // Preset amounts from backend config, fallback to defaults
    var presetAmounts: [Double] {
        appState.temple?.homeScreenConfig?.presetAmounts ?? [5, 10, 25, 50, 100]
    }
    
    var body: some View {
        ZStack {
            // Subtle gradient background (white to light blue)
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
                // Dismiss keyboard when tapping background
                customAmountFocused = false
            }
            
            // Two-part split screen layout
            HStack(spacing: 0) {
                // LEFT SIDE: Category/Event Selection
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
                    
                    // Category selection
                    VStack(spacing: 20) {
                        if !appState.categories.isEmpty {
                            ScrollView {
                                VStack(spacing: 16) {
                                    ForEach(appState.categories) { category in
                                        CleanCategoryButton(
                                            category: category,
                                            isSelected: selectedCategory?.id == category.id,
                                            action: {
                                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                    selectedCategory = selectedCategory?.id == category.id ? nil : category
                                                }
                                            }
                                        )
                                        .frame(maxWidth: .infinity)
                                    }
                                }
                                .padding(.horizontal, 40)
                            }
                        } else {
                            VStack(spacing: 12) {
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
                            }
                            .padding(.top, 60)
                            .padding(.horizontal, 40)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .background(Color.white.opacity(0.5))
                
                // Divider
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 2)
                
                // RIGHT SIDE: Amount Selection & Continue
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
                    
                    // Amount selection content
                    VStack(spacing: 30) {
                        // Preset amount buttons - flexible grid based on count
                        let buttonCount = presetAmounts.count
                        if buttonCount > 0 {
                            if buttonCount <= 4 {
                                // 2x2 grid for 4 or fewer
                                VStack(spacing: 16) {
                                    HStack(spacing: 16) {
                                        ForEach(Array(presetAmounts.prefix(2)), id: \.self) { amount in
                                            CleanAmountButton(
                                                amount: amount,
                                                isSelected: selectedAmount == amount,
                                                action: {
                                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                        selectedAmount = amount
                                                        customAmount = ""
                                                        customAmountFocused = false
                                                    }
                                                }
                                            )
                                        }
                                    }
                                    
                                    if buttonCount > 2 {
                                        HStack(spacing: 16) {
                                            ForEach(Array(presetAmounts.suffix(buttonCount > 2 ? buttonCount - 2 : 0)), id: \.self) { amount in
                                                CleanAmountButton(
                                                    amount: amount,
                                                    isSelected: selectedAmount == amount,
                                                    action: {
                                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                            selectedAmount = amount
                                                            customAmount = ""
                                                            customAmountFocused = false
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Scrollable grid for more than 4
                                ScrollView {
                                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                        ForEach(presetAmounts, id: \.self) { amount in
                                            CleanAmountButton(
                                                amount: amount,
                                                isSelected: selectedAmount == amount,
                                                action: {
                                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                        selectedAmount = amount
                                                        customAmount = ""
                                                        customAmountFocused = false
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 40)
                        
                        // Custom amount field
                        CleanCustomAmountField(
                            text: $customAmount,
                            isActive: selectedAmount == nil,
                            isFocused: $customAmountFocused,
                            onTap: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedAmount = nil
                                    customAmountFocused = true
                                }
                            }
                        )
                        .padding(.horizontal, 40)
                        
                        // Selected amount display
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
                    .frame(maxWidth: .infinity)
                    
                    Spacer()
                    
                    // Continue button at bottom
                    VStack(spacing: 16) {
                        if hasValidAmount {
                            Text("Ready to donate $\(String(format: "%.2f", currentAmount))")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                        }
                        
                        Button(action: {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                showingDetails = true
                            }
                        }) {
                            Text("Continue")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 20)
                                .background(
                                    hasValidAmount 
                                        ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                        : Color.gray.opacity(0.4)
                                )
                                .cornerRadius(12)
                        }
                        .disabled(!hasValidAmount)
                        .padding(.horizontal, 40)
                    }
                    .padding(.bottom, 60)
                }
                .frame(maxWidth: .infinity)
                .background(Color(red: 0.98, green: 0.99, blue: 1.0))
            }
            
            // Home button in top left
            VStack {
                HStack {
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            onDismiss()
                        }
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
        .fullScreenCover(isPresented: $showingDetails) {
            ModernDonationDetailsView(
                amount: currentAmount,
                category: selectedCategory,
                onConfirm: { name, email in
                    withAnimation {
                        showingDetails = false
                        showingPayment = true
                        donorName = name
                        donorEmail = email
                    }
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
                        donorName = nil
                        donorEmail = nil
                    }
                }
            )
        }
    }
    
    private var hasValidAmount: Bool {
        if let amount = selectedAmount {
            return amount > 0
        }
        if let custom = Double(customAmount) {
            return custom > 0
        }
        return false
    }
    
    private var currentAmount: Double {
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
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("$\(Int(amount))")
                .font(.system(size: 24, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 70)
                .background(
                    isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8)
                        : Color(red: 0.2, green: 0.4, blue: 0.8)
                )
                .cornerRadius(12)
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}

// Clean custom amount field
struct CleanCustomAmountField: View {
    @Binding var text: String
    let isActive: Bool
    @FocusState.Binding var isFocused: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Text("$")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.gray)
                    .frame(width: 20, alignment: .leading)
                
                if isActive {
                    TextField("Custom Amount", text: $text)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                        .focused($isFocused)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .onChange(of: text) { newValue in
                            let filtered = newValue.filter { "0123456789.".contains($0) }
                            if filtered != newValue {
                                text = filtered
                            }
                        }
                } else {
                    Text("Custom Amount")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity, alignment: .leading)
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
        }
        .scaleEffect(isActive ? 1.02 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
    }
}

// Clean category button
struct CleanCategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(category.name)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(isSelected ? .white : Color(red: 0.3, green: 0.3, blue: 0.4))
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8)
                        : Color.white
                )
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            isSelected 
                                ? Color.clear
                                : Color.gray.opacity(0.3),
                            lineWidth: 1
                        )
                )
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}
