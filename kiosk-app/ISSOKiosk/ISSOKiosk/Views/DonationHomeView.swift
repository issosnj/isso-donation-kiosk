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
    @State private var isCustomAmountFocused = false
    @FocusState private var customAmountFocused: Bool
    
    // Modern preset amounts
    let presetAmounts: [Double] = [5, 10, 25, 100]
    
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
            
            ScrollView {
                VStack(spacing: 0) {
                    // Top section with logo and title
                    VStack(spacing: 20) {
                        // Logo/Icon with animation
                        if let temple = appState.temple {
                            if let logoUrl = temple.logoUrl, !logoUrl.isEmpty {
                                AsyncImage(url: URL(string: logoUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Image(systemName: "building.2.fill")
                                        .font(.system(size: 60))
                                        .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                }
                                .frame(height: 80)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                            } else {
                                Image(systemName: "building.2.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                    .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                            }
                        }
                        .scaleEffect(1.0)
                        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: appState.temple?.id)
                        
                        // Main title with fade-in
                        Text("Make a Donation")
                            .font(.system(size: 52, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            .multilineTextAlignment(.center)
                            .opacity(1.0)
                        
                        // Descriptive text
                        VStack(spacing: 8) {
                            Text("Help us continue what we do best.")
                                .font(.system(size: 22, weight: .regular))
                                .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.6))
                            Text("Your gift will go a long way.")
                                .font(.system(size: 22, weight: .regular))
                                .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.6))
                        }
                        .multilineTextAlignment(.center)
                    }
                    .padding(.top, 60)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 50)
                    
                    // Preset amount buttons with smooth animations
                    VStack(spacing: 20) {
                        HStack(spacing: 20) {
                            ForEach(presetAmounts, id: \.self) { amount in
                                AnimatedAmountButton(
                                    amount: amount,
                                    isSelected: selectedAmount == amount,
                                    action: {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                            selectedAmount = amount
                                            customAmount = ""
                                            isCustomAmountFocused = false
                                            customAmountFocused = false
                                        }
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, 40)
                        
                        // Custom amount input with smooth transitions
                        AnimatedCustomAmountField(
                            text: $customAmount,
                            isActive: selectedAmount == nil,
                            isFocused: $customAmountFocused,
                            onTap: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedAmount = nil
                                    isCustomAmountFocused = true
                                }
                            }
                        )
                        .padding(.horizontal, 40)
                    }
                    .padding(.bottom, 40)
                    
                    // Categories with smooth animations
                    if !appState.categories.isEmpty {
                        VStack(spacing: 15) {
                            Text("Category (Optional)")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 15) {
                                    ForEach(appState.categories) { category in
                                        AnimatedCategoryButton(
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
                        .padding(.bottom, 30)
                    }
                    
                    // Continue button with pulse animation when ready
                    Button(action: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            showingDetails = true
                        }
                    }) {
                        HStack(spacing: 12) {
                            if hasValidAmount {
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.system(size: 24))
                            }
                            Text("Continue")
                                .font(.system(size: 26, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 22)
                        .background(
                            Group {
                                if hasValidAmount {
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.2, green: 0.4, blue: 0.8),
                                            Color(red: 0.3, green: 0.5, blue: 0.9)
                                        ]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                } else {
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.gray.opacity(0.4),
                                            Color.gray.opacity(0.5)
                                        ]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                }
                            }
                        )
                        .cornerRadius(18)
                        .shadow(
                            color: hasValidAmount 
                                ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4)
                                : Color.clear,
                            radius: hasValidAmount ? 12 : 0,
                            x: 0,
                            y: 6
                        )
                    }
                    .disabled(!hasValidAmount)
                    .scaleEffect(hasValidAmount ? 1.0 : 0.98)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: hasValidAmount)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 60)
                }
            }
            
            // Home button with animation
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
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
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
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.2), radius: 4, x: 0, y: 2)
                    }
                    .padding()
                    .scaleEffect(1.0)
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

// Animated amount button with smooth selection
struct AnimatedAmountButton: View {
    let amount: Double
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("$\(Int(amount))")
                .font(.system(size: 30, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 85)
                .background(
                    Group {
                        if isSelected {
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        } else {
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.25, green: 0.45, blue: 0.85),
                                    Color(red: 0.2, green: 0.4, blue: 0.8)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        }
                    }
                )
                .cornerRadius(18)
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(
                            isSelected 
                                ? Color.white.opacity(0.6)
                                : Color.clear,
                            lineWidth: isSelected ? 4 : 0
                        )
                )
                .shadow(
                    color: isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.5)
                        : Color.black.opacity(0.15),
                    radius: isSelected ? 12 : 6,
                    x: 0,
                    y: isSelected ? 6 : 3
                )
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}

// Smooth custom amount field
struct AnimatedCustomAmountField: View {
    @Binding var text: String
    let isActive: Bool
    @FocusState.Binding var isFocused: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Text("$")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundColor(isActive ? Color(red: 0.2, green: 0.4, blue: 0.8) : .gray)
                
                if isActive {
                    TextField("Custom Amount", text: $text)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        .focused($isFocused)
                        .onChange(of: text) { newValue in
                            // Filter to only allow numbers and decimal point
                            let filtered = newValue.filter { "0123456789.".contains($0) }
                            if filtered != newValue {
                                text = filtered
                            }
                        }
                } else {
                    Text("Custom Amount")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(.gray)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 85)
            .background(Color.white)
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(
                        isActive 
                            ? Color(red: 0.2, green: 0.4, blue: 0.8)
                            : Color.gray.opacity(0.3),
                        lineWidth: isActive ? 3 : 2
                    )
            )
            .shadow(
                color: isActive 
                    ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.3)
                    : Color.black.opacity(0.08),
                radius: isActive ? 8 : 4,
                x: 0,
                y: isActive ? 4 : 2
            )
        }
        .scaleEffect(isActive ? 1.02 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
    }
}

// Animated category button
struct AnimatedCategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(category.name)
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(isSelected ? .white : Color(red: 0.1, green: 0.2, blue: 0.5))
                .padding(.horizontal, 26)
                .padding(.vertical, 16)
                .background(
                    Group {
                        if isSelected {
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        } else {
                            Color.white
                        }
                    }
                )
                .cornerRadius(28)
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .stroke(
                            isSelected 
                                ? Color.clear
                                : Color.gray.opacity(0.3),
                            lineWidth: 1.5
                        )
                )
                .shadow(
                    color: isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.3)
                        : Color.black.opacity(0.05),
                    radius: isSelected ? 6 : 2,
                    x: 0,
                    y: isSelected ? 3 : 1
                )
        }
        .scaleEffect(isSelected ? 1.08 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}
