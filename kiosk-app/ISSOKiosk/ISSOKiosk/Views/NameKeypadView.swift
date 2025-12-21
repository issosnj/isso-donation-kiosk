import SwiftUI

struct NameKeypadView: View {
    @Binding var name: String
    let onDismiss: () -> Void
    @FocusState private var isNameFocused: Bool
    @State private var enteredName: String = ""
    
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
                        Text("Enter Your Name")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text("Please enter your full name")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 40)
                    
                    // Name input field
                    VStack(spacing: 16) {
                        TextField("Enter your name", text: $enteredName)
                            .font(.custom("Inter-SemiBold", size: 36))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            .focused($isNameFocused)
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
                                TextKeypadButton(character: "Q", enteredText: $enteredName)
                                TextKeypadButton(character: "W", enteredText: $enteredName)
                                TextKeypadButton(character: "E", enteredText: $enteredName)
                                TextKeypadButton(character: "R", enteredText: $enteredName)
                                TextKeypadButton(character: "T", enteredText: $enteredName)
                                TextKeypadButton(character: "Y", enteredText: $enteredName)
                                TextKeypadButton(character: "U", enteredText: $enteredName)
                                TextKeypadButton(character: "I", enteredText: $enteredName)
                                TextKeypadButton(character: "O", enteredText: $enteredName)
                                TextKeypadButton(character: "P", enteredText: $enteredName)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "A", enteredText: $enteredName)
                                TextKeypadButton(character: "S", enteredText: $enteredName)
                                TextKeypadButton(character: "D", enteredText: $enteredName)
                                TextKeypadButton(character: "F", enteredText: $enteredName)
                                TextKeypadButton(character: "G", enteredText: $enteredName)
                                TextKeypadButton(character: "H", enteredText: $enteredName)
                                TextKeypadButton(character: "J", enteredText: $enteredName)
                                TextKeypadButton(character: "K", enteredText: $enteredName)
                                TextKeypadButton(character: "L", enteredText: $enteredName)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "Z", enteredText: $enteredName)
                                TextKeypadButton(character: "X", enteredText: $enteredName)
                                TextKeypadButton(character: "C", enteredText: $enteredName)
                                TextKeypadButton(character: "V", enteredText: $enteredName)
                                TextKeypadButton(character: "B", enteredText: $enteredName)
                                TextKeypadButton(character: "N", enteredText: $enteredName)
                                TextKeypadButton(character: "M", enteredText: $enteredName)
                            }
                            HStack(spacing: 12) {
                                // Space button
                                Button(action: {
                                    enteredName += " "
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
                                    if !enteredName.isEmpty {
                                        enteredName.removeLast()
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
                        name = enteredName
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
                    .disabled(enteredName.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(enteredName.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1.0)
                }
            }
            .navigationTitle("Your Name")
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
                enteredName = name
                // Focus the text field after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    isNameFocused = true
                }
            }
        }
    }
}

struct TextKeypadButton: View {
    let character: String
    @Binding var enteredText: String
    
    var body: some View {
        Button(action: {
            // For names, capitalize first letter of each word
            if enteredText.isEmpty || enteredText.last == " " {
                enteredText += character.uppercased()
            } else {
                enteredText += character.lowercased()
            }
        }) {
            Text(character)
                .font(.custom("Inter-SemiBold", size: 20))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                .frame(width: 50, height: 50)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

