import SwiftUI

struct AddressKeypadView: View {
    @Binding var address: String
    let onDismiss: () -> Void
    @FocusState private var isAddressFocused: Bool
    @State private var enteredAddress: String = ""
    
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
                        Text("Enter Mailing Address")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text("Please enter your mailing address")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 40)
                    
                    // Address input field
                    VStack(spacing: 16) {
                        TextField("Enter your mailing address", text: $enteredAddress)
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            .focused($isAddressFocused)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .padding(.horizontal, 24)
                            .padding(.vertical, 20)
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                            .padding(.horizontal, 20)
                        
                        // Text keypad
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "Q", enteredText: $enteredAddress)
                                TextKeypadButton(character: "W", enteredText: $enteredAddress)
                                TextKeypadButton(character: "E", enteredText: $enteredAddress)
                                TextKeypadButton(character: "R", enteredText: $enteredAddress)
                                TextKeypadButton(character: "T", enteredText: $enteredAddress)
                                TextKeypadButton(character: "Y", enteredText: $enteredAddress)
                                TextKeypadButton(character: "U", enteredText: $enteredAddress)
                                TextKeypadButton(character: "I", enteredText: $enteredAddress)
                                TextKeypadButton(character: "O", enteredText: $enteredAddress)
                                TextKeypadButton(character: "P", enteredText: $enteredAddress)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "A", enteredText: $enteredAddress)
                                TextKeypadButton(character: "S", enteredText: $enteredAddress)
                                TextKeypadButton(character: "D", enteredText: $enteredAddress)
                                TextKeypadButton(character: "F", enteredText: $enteredAddress)
                                TextKeypadButton(character: "G", enteredText: $enteredAddress)
                                TextKeypadButton(character: "H", enteredText: $enteredAddress)
                                TextKeypadButton(character: "J", enteredText: $enteredAddress)
                                TextKeypadButton(character: "K", enteredText: $enteredAddress)
                                TextKeypadButton(character: "L", enteredText: $enteredAddress)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "Z", enteredText: $enteredAddress)
                                TextKeypadButton(character: "X", enteredText: $enteredAddress)
                                TextKeypadButton(character: "C", enteredText: $enteredAddress)
                                TextKeypadButton(character: "V", enteredText: $enteredAddress)
                                TextKeypadButton(character: "B", enteredText: $enteredAddress)
                                TextKeypadButton(character: "N", enteredText: $enteredAddress)
                                TextKeypadButton(character: "M", enteredText: $enteredAddress)
                                TextKeypadButton(character: ".", enteredText: $enteredAddress)
                                TextKeypadButton(character: ",", enteredText: $enteredAddress)
                            }
                            HStack(spacing: 12) {
                                // Space button
                                Button(action: {
                                    enteredAddress += " "
                                }) {
                                    Text("Space")
                                        .font(.custom("Inter-Medium", size: 16))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 50)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                                }
                                .frame(maxWidth: .infinity)
                                
                                // Backspace button
                                Button(action: {
                                    if !enteredAddress.isEmpty {
                                        enteredAddress.removeLast()
                                    }
                                }) {
                                    Image(systemName: "delete.left.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 50)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer()
                    
                    // Continue button
                    Button(action: {
                        address = enteredAddress
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
                }
            }
            .navigationTitle("Mailing Address")
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
                enteredAddress = address
                // Focus the text field after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    isAddressFocused = true
                }
            }
        }
    }
}

