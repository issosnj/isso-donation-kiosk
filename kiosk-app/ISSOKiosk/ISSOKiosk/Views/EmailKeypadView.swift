import SwiftUI

struct EmailKeypadView: View {
    @Binding var email: String
    let onDismiss: () -> Void
    @State private var enteredEmail: String = ""
    @State private var selectedDomain: String? = nil
    @EnvironmentObject var appState: AppState
    
    let emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
    
    var body: some View {
        ZStack {
            // Semi-transparent background overlay
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            // Single smooth popup - wider and more appealing
            ScrollView {
                VStack(spacing: 0) {
                    // Header with Cancel button
                    HStack {
                        Button(action: {
                            onDismiss()
                        }) {
                            Text("Cancel")
                                .font(.custom("Inter-Medium", size: 16))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        }
                        
                    Spacer()
                    
                    Text("Email Address")
                        .font(.custom("Inter-SemiBold", size: 24))
                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                    
                    Spacer()
                        
                        // Invisible spacer to balance Cancel button
                        Text("Cancel")
                            .font(.custom("Inter-Medium", size: 16))
                            .foregroundColor(.clear)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                    }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 16)
                
                // Email input display
                Text(enteredEmail.isEmpty ? "username@domain.com" : enteredEmail)
                    .font(.custom("Inter-SemiBold", size: 32))
                    .foregroundColor(enteredEmail.isEmpty ? Color(red: 0.7, green: 0.7, blue: 0.7) : Color(red: 0.26, green: 0.20, blue: 0.20))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)
                    .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 16)
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
                        .padding(.horizontal, 32)
                    }
                    .padding(.bottom, 16)
                    
                    // Text keypad
                    VStack(spacing: 12) {
                        // Number row (0-9) - at the top like address keypad
                        HStack(spacing: 12) {
                            TextKeypadButton(character: "1", enteredText: $enteredEmail)
                            TextKeypadButton(character: "2", enteredText: $enteredEmail)
                            TextKeypadButton(character: "3", enteredText: $enteredEmail)
                            TextKeypadButton(character: "4", enteredText: $enteredEmail)
                            TextKeypadButton(character: "5", enteredText: $enteredEmail)
                            TextKeypadButton(character: "6", enteredText: $enteredEmail)
                            TextKeypadButton(character: "7", enteredText: $enteredEmail)
                            TextKeypadButton(character: "8", enteredText: $enteredEmail)
                            TextKeypadButton(character: "9", enteredText: $enteredEmail)
                            TextKeypadButton(character: "0", enteredText: $enteredEmail)
                        }
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
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                            }
                            .frame(maxWidth: .infinity)
                            
                            // Backspace button
                            Button(action: {
                                if !enteredEmail.isEmpty {
                                    enteredEmail.removeLast()
                                }
                            }) {
                                        Image(systemName: "delete.left.fill")
                                            .font(.system(size: 20, weight: .semibold))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 16)
                    
                    // Continue button - using theme properties
                    Button(action: {
                        email = enteredEmail
                        onDismiss()
                    }) {
                        HStack(spacing: 12) {
                            Text("Continue")
                                .font(.custom("Inter-Medium", size: 20))
                                .foregroundColor((enteredEmail.isEmpty || !isValidEmail(enteredEmail)) ? Color.gray : Color.white)
                            Image(systemName: "arrow.right")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor((enteredEmail.isEmpty || !isValidEmail(enteredEmail)) ? Color.gray : Color.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(
                            Group {
                                let isValid = !enteredEmail.isEmpty && isValidEmail(enteredEmail)
                                if isValid {
                                    let buttonColor = colorFromHex(
                                        appState.temple?.kioskTheme?.colors?.continueButtonColor,
                                        defaultColor: Color(red: 0.85, green: 0.75, blue: 0.5)
                                    )
                                    if appState.temple?.kioskTheme?.colors?.continueButtonGradient == true {
                                        gradientFromColor(buttonColor)
                                    } else {
                                        buttonColor
                                    }
                                } else {
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.gray.opacity(0.5), Color.gray.opacity(0.3)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                }
                            }
                        )
                        .cornerRadius(12)
                        .shadow(color: (enteredEmail.isEmpty || !isValidEmail(enteredEmail)) ? Color.clear : Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 16)
                    .disabled(enteredEmail.isEmpty || !isValidEmail(enteredEmail))
                }
                .frame(maxWidth: 900) // Wider popup
                .padding(.vertical, 16)
            }
            .frame(maxWidth: 900)
            .background(Color.white)
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.25), radius: 30, x: 0, y: 15)
        }
        .onAppear {
            enteredEmail = email
            // Hide system keyboard when view appears
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
    }
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
        guard let hex = hex, !hex.isEmpty else {
            return defaultColor
        }
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6 else {
            return defaultColor
        }
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return defaultColor
        }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
    
    // Helper to create a gradient from a color
    private func gradientFromColor(_ color: Color) -> LinearGradient {
        let uiColor = UIColor(color)
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        
        let lighterColor = Color(
            red: min(1.0, Double(r) * 1.15),
            green: min(1.0, Double(g) * 1.15),
            blue: min(1.0, Double(b) * 1.15)
        )
        return LinearGradient(
            gradient: Gradient(colors: [color, lighterColor]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}
