import SwiftUI

struct DonationHomeView: View {
    @EnvironmentObject var appState: AppState
    let onDismiss: () -> Void
    @State private var selectedAmount: Double?
    @State private var customAmount: String = ""
    @State private var selectedCategory: DonationCategory?
    @State private var showingDetails = false
    @State private var showingPayment = false
    @State private var donorName: String = ""
    @State private var donorEmail: String = ""
    
    let presetAmounts: [Double] = [11, 21, 51, 101, 251]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 40) {
                    // Temple Logo/Name
                    if let temple = appState.temple {
                        VStack(spacing: 15) {
                            if let logoUrl = temple.logoUrl, !logoUrl.isEmpty {
                                AsyncImage(url: URL(string: logoUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Image(systemName: "building.2")
                                        .font(.system(size: 80))
                                        .foregroundColor(.gray)
                                }
                                .frame(height: 120)
                                .cornerRadius(12)
                            } else {
                                Image(systemName: "building.2")
                                    .font(.system(size: 80))
                                    .foregroundColor(.gray)
                            }
                            
                            Text(temple.name)
                                .font(.system(size: 36, weight: .bold))
                                .foregroundColor(.primary)
                        }
                        .padding(.top, 40)
                    }
                
                    // Preset Amounts
                    Text("Select Amount")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 20),
                        GridItem(.flexible(), spacing: 20),
                        GridItem(.flexible(), spacing: 20)
                    ], spacing: 20) {
                        ForEach(presetAmounts, id: \.self) { amount in
                            AmountButton(
                                amount: amount,
                                isSelected: selectedAmount == amount,
                                action: {
                                    selectedAmount = amount
                                    customAmount = ""
                                }
                            )
                        }
                        
                        // Custom Amount Button
                        Button(action: {
                            selectedAmount = nil
                        }) {
                            VStack(spacing: 8) {
                                Text("Other")
                                    .font(.system(size: 20, weight: .semibold))
                                Text("Enter Amount")
                                    .font(.system(size: 14))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 100)
                            .background(selectedAmount == nil ? Color.blue : Color.gray.opacity(0.2))
                            .foregroundColor(selectedAmount == nil ? .white : .primary)
                            .cornerRadius(16)
                        }
                    }
                    .padding(.horizontal, 40)
                
                    // Custom Amount Input
                    if selectedAmount == nil {
                        VStack(spacing: 10) {
                            Text("Enter Custom Amount")
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            TextField("$0.00", text: $customAmount)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(size: 32, weight: .semibold))
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: 400)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(hasValidAmount ? Color.blue : Color.gray, lineWidth: 2)
                                )
                        }
                        .padding(.vertical, 20)
                    }
                    
                    // Categories
                    if !appState.categories.isEmpty {
                        VStack(spacing: 15) {
                            Text("Category (Optional)")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 15) {
                                    ForEach(appState.categories) { category in
                                        CategoryButton(
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
                    }
                    
                    Spacer()
                        .frame(height: 40)
                    
                    // Continue Button
                    Button(action: {
                        showingDetails = true
                    }) {
                        Text("Continue")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .background(hasValidAmount ? Color.blue : Color.gray)
                            .cornerRadius(16)
                    }
                    .disabled(!hasValidAmount)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 40)
                }
                .padding(.vertical, 20)
            }
            .navigationBarHidden(true)
            .overlay(
                // Back button to return to home
                VStack {
                    HStack {
                        Button(action: {
                            onDismiss()
                        }) {
                            HStack {
                                Image(systemName: "house.fill")
                                Text("Home")
                            }
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .padding()
                        Spacer()
                    }
                    Spacer()
                }
            )
            .sheet(isPresented: $showingDetails) {
                DonationDetailsView(
                    amount: currentAmount,
                    category: selectedCategory,
                    onConfirm: { name, email in
                        showingDetails = false
                        showingPayment = true
                        // Store donor info for payment view
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
                        // Reset form
                        selectedAmount = nil
                        customAmount = ""
                        selectedCategory = nil
                        donorName = ""
                        donorEmail = ""
                    }
                )
            }
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

struct AmountButton: View {
    let amount: Double
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack {
                Text("$\(Int(amount))")
                    .font(.system(size: 32, weight: .bold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 100)
            .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 3)
            )
        }
    }
}

struct CategoryButton: View {
    let category: DonationCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(category.name)
                .font(.system(size: 18, weight: .medium))
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(25)
                .overlay(
                    RoundedRectangle(cornerRadius: 25)
                        .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                )
        }
    }
}

