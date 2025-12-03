import SwiftUI

struct DonationHomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedAmount: Double?
    @State private var customAmount: String = ""
    @State private var selectedCategory: DonationCategory?
    @State private var showingDetails = false
    @State private var showingPayment = false
    
    let presetAmounts: [Double] = [11, 21, 51, 101, 251]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Temple Logo/Name
                if let temple = appState.temple {
                    VStack(spacing: 10) {
                        if let logoUrl = temple.logoUrl, !logoUrl.isEmpty {
                            AsyncImage(url: URL(string: logoUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                            } placeholder: {
                                Image(systemName: "building.2")
                                    .font(.system(size: 60))
                            }
                            .frame(height: 100)
                        } else {
                            Image(systemName: "building.2")
                                .font(.system(size: 60))
                        }
                        
                        Text(temple.name)
                            .font(.title)
                            .fontWeight(.bold)
                    }
                    .padding(.top)
                }
                
                // Preset Amounts
                Text("Select Amount")
                    .font(.headline)
                
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
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
                        VStack {
                            Text("Other")
                                .font(.headline)
                            Text("Enter Amount")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(selectedAmount == nil ? Color.blue : Color.gray.opacity(0.2))
                        .foregroundColor(selectedAmount == nil ? .white : .primary)
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
                
                // Custom Amount Input
                if selectedAmount == nil {
                    TextField("Enter Amount", text: $customAmount)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                        .font(.title2)
                        .frame(maxWidth: 300)
                }
                
                // Categories
                if !appState.categories.isEmpty {
                    Text("Category (Optional)")
                        .font(.headline)
                    
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
                        .padding(.horizontal)
                    }
                }
                
                Spacer()
                
                // Continue Button
                Button(action: {
                    showingDetails = true
                }) {
                    Text("Continue")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(hasValidAmount ? Color.blue : Color.gray)
                        .cornerRadius(12)
                }
                .disabled(!hasValidAmount)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingDetails) {
                DonationDetailsView(
                    amount: currentAmount,
                    category: selectedCategory,
                    onConfirm: {
                        showingDetails = false
                        showingPayment = true
                    }
                )
            }
            .fullScreenCover(isPresented: $showingPayment) {
                PaymentView(
                    amount: currentAmount,
                    category: selectedCategory,
                    onComplete: {
                        showingPayment = false
                        // Reset form
                        selectedAmount = nil
                        customAmount = ""
                        selectedCategory = nil
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
                    .font(.title2)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
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
                .font(.headline)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

