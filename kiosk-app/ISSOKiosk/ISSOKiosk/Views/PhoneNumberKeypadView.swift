import SwiftUI

struct PhoneNumberKeypadView: View {
    @Binding var phoneNumber: String
    let onDismiss: () -> Void
    @State private var enteredPhone: String = ""
    @EnvironmentObject var appState: AppState
    
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
                        
                        Text("Phone Number")
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
                
                // Phone input display
                HStack {
                    Text(enteredPhone.isEmpty ? "(000) 000-0000" : enteredPhone)
                        .font(.custom("Inter-SemiBold", size: 36))
                        .foregroundColor(enteredPhone.isEmpty ? Color(red: 0.7, green: 0.7, blue: 0.7) : Color(red: 0.26, green: 0.20, blue: 0.20))
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 18)
                .frame(maxWidth: .infinity)
                .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
                
                // Numeric keypad
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        PhoneKeypadButton(number: "1", letters: "", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "2", letters: "ABC", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "3", letters: "DEF", enteredPhone: $enteredPhone)
                    }
                    HStack(spacing: 12) {
                        PhoneKeypadButton(number: "4", letters: "GHI", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "5", letters: "JKL", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "6", letters: "MNO", enteredPhone: $enteredPhone)
                    }
                    HStack(spacing: 12) {
                        PhoneKeypadButton(number: "7", letters: "PQRS", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "8", letters: "TUV", enteredPhone: $enteredPhone)
                        PhoneKeypadButton(number: "9", letters: "WXYZ", enteredPhone: $enteredPhone)
                    }
                    HStack(spacing: 12) {
                        PhoneKeypadButton(number: "0", letters: "+", enteredPhone: $enteredPhone)
                        // Backspace button
                        Button(action: {
                            if !enteredPhone.isEmpty {
                                let digits = enteredPhone.filter { $0.isNumber }
                                if !digits.isEmpty {
                                    enteredPhone = formatPhoneNumber(String(digits.dropLast()))
                                }
                            }
                        }) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color(red: 0.4, green: 0.25, blue: 0.15))
                                
                                Image(systemName: "xmark")
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 60)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 24)
                
                // Continue button - using theme properties
                Button(action: {
                    // Extract only digits
                    let digits = enteredPhone.filter { $0.isNumber }
                    phoneNumber = digits
                    onDismiss()
                }) {
                    HStack(spacing: 12) {
                        Text("Continue")
                            .font(.custom("Inter-Medium", size: 20))
                            .foregroundColor(enteredPhone.filter { $0.isNumber }.count >= 10 ? Color.white : Color.gray)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(enteredPhone.filter { $0.isNumber }.count >= 10 ? Color.white : Color.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        Group {
                            let isValid = enteredPhone.filter { $0.isNumber }.count >= 10
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
                    .shadow(color: enteredPhone.filter { $0.isNumber }.count >= 10 ? Color.black.opacity(0.2) : Color.clear, radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
                .disabled(enteredPhone.filter { $0.isNumber }.count < 10)
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
            // Format existing phone number
            let digits = phoneNumber.filter { $0.isNumber }
            enteredPhone = formatPhoneNumber(digits)
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
    
    private func formatPhoneNumber(_ digits: String) -> String {
        if digits.isEmpty {
            return ""
        }
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3))
            return "(\(areaCode)) \(firstPart)"
        } else {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3).prefix(3))
            let lastPart = String(digits.dropFirst(6))
            return "(\(areaCode)) \(firstPart)-\(lastPart)"
        }
    }
}

struct PhoneKeypadButton: View {
    let number: String
    let letters: String
    @Binding var enteredPhone: String
    
    var body: some View {
        Button(action: {
            let digits = enteredPhone.filter { $0.isNumber }
            if digits.count < 10 {
                enteredPhone = formatPhoneNumber(digits + number)
            }
        }) {
            VStack(spacing: 4) {
                Text(number)
                    .font(.custom("Inter-SemiBold", size: 30))
                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                
                if !letters.isEmpty {
                    Text(letters)
                        .font(.custom("Inter-Regular", size: 10))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
        }
    }
    
    private func formatPhoneNumber(_ digits: String) -> String {
        if digits.isEmpty {
            return ""
        }
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3))
            return "(\(areaCode)) \(firstPart)"
        } else {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3).prefix(3))
            let lastPart = String(digits.dropFirst(6))
            return "(\(areaCode)) \(firstPart)-\(lastPart)"
        }
    }
}
