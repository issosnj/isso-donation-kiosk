import SwiftUI

struct EmailKeypadView: View {
    @Binding var email: String
    let onDismiss: () -> Void
    @FocusState private var isEmailFocused: Bool
    @State private var enteredEmail: String = ""
    @State private var selectedDomain: String? = nil
    
    let emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
    
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
                        Text("Enter Email Address")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text("Enter your email address for receipt")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 40)
                    
                    // Email input field
                    VStack(spacing: 16) {
                        HStack {
                            TextField("username@domain.com", text: $enteredEmail)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .font(.custom("Inter-SemiBold", size: 36))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .focused($isEmailFocused)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .onChange(of: selectedDomain) { domain in
                                    if let domain = domain {
                                        // Split current email at @ if it exists
                                        let parts = enteredEmail.split(separator: "@")
                                        if let username = parts.first {
                                            enteredEmail = "\(username)@\(domain)"
                                        } else {
                                            enteredEmail = "\(enteredEmail)@\(domain)"
                                        }
                                        selectedDomain = nil
                                    }
                                }
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                        .padding(.horizontal, 20)
                        
                        // Email domain presets
                        VStack(spacing: 12) {
                            Text("Quick Add Domain")
                                .font(.custom("Inter-Regular", size: 14))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            
                            HStack(spacing: 12) {
                                ForEach(emailDomains, id: \.self) { domain in
                                    Button(action: {
                                        selectedDomain = domain
                                    }) {
                                        Text("@\(domain)")
                                            .font(.custom("Inter-Medium", size: 14))
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
                            .padding(.horizontal, 20)
                        }
                        
                        // Text keypad
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "Q", enteredText: $enteredEmail)
                                TextKeypadButton(character: "W", enteredText: $enteredEmail)
                                TextKeypadButton(character: "E", enteredText: $enteredEmail)
                                TextKeypadButton(character: "R", enteredText: $enteredEmail)
                                TextKeypadButton(character: "T", enteredText: $enteredEmail)
                                TextKeypadButton(character: "Y", enteredText: $enteredEmail)
                                TextKeypadButton(character: "U", enteredText: $enteredEmail)
                                TextKeypadButton(character: "I", enteredText: $enteredEmail)
                                TextKeypadButton(character: "O", enteredText: $enteredEmail)
                                TextKeypadButton(character: "P", enteredText: $enteredEmail)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "A", enteredText: $enteredEmail)
                                TextKeypadButton(character: "S", enteredText: $enteredEmail)
                                TextKeypadButton(character: "D", enteredText: $enteredEmail)
                                TextKeypadButton(character: "F", enteredText: $enteredEmail)
                                TextKeypadButton(character: "G", enteredText: $enteredEmail)
                                TextKeypadButton(character: "H", enteredText: $enteredEmail)
                                TextKeypadButton(character: "J", enteredText: $enteredEmail)
                                TextKeypadButton(character: "K", enteredText: $enteredEmail)
                                TextKeypadButton(character: "L", enteredText: $enteredEmail)
                            }
                            HStack(spacing: 12) {
                                TextKeypadButton(character: "Z", enteredText: $enteredEmail)
                                TextKeypadButton(character: "X", enteredText: $enteredEmail)
                                TextKeypadButton(character: "C", enteredText: $enteredEmail)
                                TextKeypadButton(character: "V", enteredText: $enteredEmail)
                                TextKeypadButton(character: "B", enteredText: $enteredEmail)
                                TextKeypadButton(character: "N", enteredText: $enteredEmail)
                                TextKeypadButton(character: "M", enteredText: $enteredEmail)
                                TextKeypadButton(character: "@", enteredText: $enteredEmail)
                                TextKeypadButton(character: ".", enteredText: $enteredEmail)
                            }
                            HStack(spacing: 12) {
                                // Space button
                                Button(action: {
                                    enteredEmail += " "
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
                                    if !enteredEmail.isEmpty {
                                        enteredEmail.removeLast()
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
                        email = enteredEmail
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
                    .disabled(enteredEmail.isEmpty || !isValidEmail(enteredEmail))
                    .opacity((enteredEmail.isEmpty || !isValidEmail(enteredEmail)) ? 0.5 : 1.0)
                }
            }
            .navigationTitle("Email Address")
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
                enteredEmail = email
                // Focus the text field after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    isEmailFocused = true
                }
            }
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}


