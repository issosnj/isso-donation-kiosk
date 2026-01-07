import SwiftUI

struct CustomAmountView: View {
    @Binding var customAmount: String
    let onDismiss: () -> Void
    @FocusState private var isAmountFocused: Bool
    @State private var enteredAmount: String = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white,
                        Color(red: 0.95, green: 0.97, blue: 1.0)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 12) {
                        Text("Enter Custom Amount")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text("Please enter the amount you would like to donate")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 40)
                    
                    // Amount input field
                    VStack(spacing: 16) {
                        HStack {
                            Text("$")
                                .font(.custom("Inter-SemiBold", size: 48))
                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            
                            TextField("0.00", text: $enteredAmount)
                                .keyboardType(.decimalPad)
                                .font(.custom("Inter-SemiBold", size: 48))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .focused($isAmountFocused)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                        .padding(.horizontal, 20)
                        
                        // Quick amount buttons
                        VStack(spacing: 12) {
                            Text("Quick Amounts")
                                .font(.custom("Inter-Regular", size: 14))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            
                            HStack(spacing: 12) {
                                QuickAmountButton(amount: 25, enteredAmount: $enteredAmount)
                                QuickAmountButton(amount: 50, enteredAmount: $enteredAmount)
                                QuickAmountButton(amount: 100, enteredAmount: $enteredAmount)
                                QuickAmountButton(amount: 250, enteredAmount: $enteredAmount)
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                    
                    Spacer()
                    
                    // Continue button
                    Button(action: {
                        customAmount = enteredAmount
                        onDismiss()
                    }) {
                        Text("Continue")
                            .font(.custom("Inter-Medium", size: 20))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
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
                            .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                    .disabled(enteredAmount.isEmpty || Double(enteredAmount) == nil || Double(enteredAmount)! <= 0)
                    .opacity((enteredAmount.isEmpty || Double(enteredAmount) == nil || Double(enteredAmount)! <= 0) ? 0.5 : 1.0)
                }
            }
            .navigationTitle("Custom Amount")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onDismiss()
                    }
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                }
            }
            .onAppear {
                enteredAmount = customAmount
                // Focus the text field after a short delay to ensure the view is fully rendered
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    isAmountFocused = true
                }
            }
        }
    }
}

struct QuickAmountButton: View {
    let amount: Double
    @Binding var enteredAmount: String
    
    var body: some View {
        Button(action: {
            enteredAmount = String(format: "%.2f", amount)
        }) {
            Text(amount.formattedCurrencyWhole())
                .font(.custom("Inter-Medium", size: 16))
                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.white)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(red: 0.2, green: 0.4, blue: 0.8), lineWidth: 1.5)
                )
        }
    }
}

