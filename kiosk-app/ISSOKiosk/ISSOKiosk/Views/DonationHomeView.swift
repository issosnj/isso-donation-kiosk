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
    
    // Preset amounts matching reference
    let presetAmounts: [Double] = [5, 10, 25, 50]
    
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
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Centered content
                VStack(spacing: 30) {
                    // Title
                    Text("Make a Donation")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        .multilineTextAlignment(.center)
                    
                    // Descriptive text
                    VStack(spacing: 8) {
                        Text("Tap an amount to give by card or digital wallet.")
                            .font(.system(size: 20, weight: .regular))
                            .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                        Text("Every gift makes a difference.")
                            .font(.system(size: 20, weight: .regular))
                            .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                    }
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    
                    // Preset amount buttons - 4 in a row
                    HStack(spacing: 16) {
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
                    
                    // Categories (if available) - more subtle
                    if !appState.categories.isEmpty {
                        VStack(spacing: 12) {
                            Text("Category (Optional)")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
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
                                    }
                                }
                                .padding(.horizontal, 40)
                            }
                        }
                        .padding(.top, 10)
                    }
                    
                    // Continue button
                    Button(action: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            showingDetails = true
                        }
                    }) {
                        Text("Continue")
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
                    .padding(.top, 20)
                }
                .frame(maxWidth: 600) // Limit width for better centering on large screens
                
                Spacer()
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
        .sheet(isPresented: $showingDetails) {
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
                
                if isActive {
                    TextField("Custom Amount", text: $text)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                        .focused($isFocused)
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
                }
            }
            .frame(maxWidth: .infinity)
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
