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
    
    // Modern preset amounts similar to reference
    let presetAmounts: [Double] = [5, 10, 25, 100]
    
    var body: some View {
        ZStack {
            // Modern light blue background
            Color(red: 0.9, green: 0.95, blue: 1.0)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Top section with logo and title
                    VStack(spacing: 20) {
                        // Logo/Icon at top
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
                            } else {
                                Image(systemName: "building.2.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            }
                        }
                        
                        // Main title
                        Text("Make a Donation")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            .multilineTextAlignment(.center)
                        
                        // Descriptive text
                        VStack(spacing: 8) {
                            Text("Help us continue what we do best.")
                                .font(.system(size: 20, weight: .regular))
                                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            Text("Your gift will go a long way.")
                                .font(.system(size: 20, weight: .regular))
                                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        }
                        .multilineTextAlignment(.center)
                    }
                    .padding(.top, 60)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 50)
                    
                    // Preset amount buttons - 4 in a row
                    VStack(spacing: 20) {
                        HStack(spacing: 20) {
                            ForEach(presetAmounts, id: \.self) { amount in
                                ModernAmountButton(
                                    amount: amount,
                                    isSelected: selectedAmount == amount,
                                    action: {
                                        selectedAmount = amount
                                        customAmount = ""
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, 40)
                        
                        // Custom amount input
                        ModernCustomAmountField(
                            text: $customAmount,
                            isActive: selectedAmount == nil,
                            onTap: {
                                selectedAmount = nil
                            }
                        )
                        .padding(.horizontal, 40)
                    }
                    .padding(.bottom, 40)
                    
                    // Categories (if available)
                    if !appState.categories.isEmpty {
                        VStack(spacing: 15) {
                            Text("Category (Optional)")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 15) {
                                    ForEach(appState.categories) { category in
                                        ModernCategoryButton(
                                            category: category,
                                            isSelected: selectedCategory?.id == category.id,
                                            action: {
                                                selectedCategory = selectedCategory?.id == category.id ? nil : category
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal, 40)
                            }
                        }
                        .padding(.bottom, 30)
                    }
                    
                    // Continue button
                    Button(action: {
                        showingDetails = true
                    }) {
                        Text("Continue")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .background(
                                hasValidAmount 
                                    ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                    : Color.gray.opacity(0.5)
                            )
                            .cornerRadius(16)
                    }
                    .disabled(!hasValidAmount)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 60)
                }
            }
            
            // Home button in top left
            VStack {
                HStack {
                    Button(action: {
                        onDismiss()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "house.fill")
                            Text("Home")
                        }
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                        .cornerRadius(12)
                    }
                    .padding()
                    Spacer()
                }
                Spacer()
            }
        }
        .sheet(isPresented: $showingDetails) {
            DonationDetailsView(
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
            PaymentView(
                amount: currentAmount,
                category: selectedCategory,
                donorName: donorName,
                donorEmail: donorEmail,
                onComplete: {
                    showingPayment = false
                    selectedAmount = nil
                    customAmount = ""
                    selectedCategory = nil
                    donorName = nil
                    donorEmail = nil
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

// Modern amount button matching reference design
struct ModernAmountButton: View {
    let amount: Double
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("$\(Int(amount))")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .background(
                    isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8)
                        : Color(red: 0.2, green: 0.4, blue: 0.8)
                )
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            isSelected 
                                ? Color.white.opacity(0.5)
                                : Color.clear,
                            lineWidth: 3
                        )
                )
                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

// Modern custom amount field
struct ModernCustomAmountField: View {
    @Binding var text: String
    let isActive: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                Text("$")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.gray)
                
                if isActive {
                    TextField("Custom Amount", text: $text)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                } else {
                    Text("Custom Amount")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.gray)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(Color.white)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        isActive 
                            ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.5)
                            : Color.gray.opacity(0.3),
                        lineWidth: 2
                    )
            )
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
    }
}

// Modern category button
struct ModernCategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(category.name)
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(isSelected ? .white : Color(red: 0.1, green: 0.2, blue: 0.5))
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(
                    isSelected 
                        ? Color(red: 0.2, green: 0.4, blue: 0.8)
                        : Color.white
                )
                .cornerRadius(25)
                .overlay(
                    RoundedRectangle(cornerRadius: 25)
                        .stroke(
                            isSelected 
                                ? Color.clear
                                : Color.gray.opacity(0.3),
                            lineWidth: 1.5
                        )
                )
                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
    }
}
