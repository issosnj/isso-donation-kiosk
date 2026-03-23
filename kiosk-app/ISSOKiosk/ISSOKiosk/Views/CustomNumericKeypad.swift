import SwiftUI

struct KeypadTheme {
    let width: CGFloat
    let buttonHeight: CGFloat
    let buttonSpacing: CGFloat
    let buttonCornerRadius: CGFloat
    let backgroundColor: Color
    let borderColor: Color
    let borderWidth: CGFloat
    let glowColor: Color
    let glowRadius: CGFloat
    let buttonColor: Color
    let buttonTextColor: Color
    let numberFontSize: CGFloat
    let letterFontSize: CGFloat
    let padding: CGFloat
    let cornerRadius: CGFloat
    
    static let `default` = KeypadTheme(
        width: 320,
        buttonHeight: DesignSystem.Components.buttonHeight,
        buttonSpacing: DesignSystem.Components.inlineSpacing,
        buttonCornerRadius: DesignSystem.Components.buttonCornerRadius,
        backgroundColor: Color(red: 135/255.0, green: 81/255.0, blue: 43/255.0),
        borderColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0),
        borderWidth: 3,
        glowColor: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0),
        glowRadius: 15,
        buttonColor: Color(red: 248/255.0, green: 216/255.0, blue: 161/255.0),
        buttonTextColor: Color(red: 0.2, green: 0.2, blue: 0.3),
        numberFontSize: 32,
        letterFontSize: 10,
        padding: DesignSystem.Spacing.md,
        cornerRadius: DesignSystem.Components.cardCornerRadius
    )
}

struct CustomNumericKeypad: View {
    @Binding var amount: String
    let onDismiss: () -> Void
    let theme: KeypadTheme
    
    init(amount: Binding<String>, onDismiss: @escaping () -> Void, theme: KeypadTheme = .default) {
        self._amount = amount
        self.onDismiss = onDismiss
        self.theme = theme
    }
    
    var body: some View {
        VStack(spacing: theme.buttonSpacing) {
            // Row 1: 1, 2, 3
            HStack(spacing: theme.buttonSpacing) {
                KeypadButton(number: "1", amount: $amount, showLetters: false, theme: theme)
                KeypadButton(number: "2", amount: $amount, showLetters: true, letters: "ABC", theme: theme)
                KeypadButton(number: "3", amount: $amount, showLetters: true, letters: "DEF", theme: theme)
            }
            
            // Row 2: 4, 5, 6
            HStack(spacing: theme.buttonSpacing) {
                KeypadButton(number: "4", amount: $amount, showLetters: true, letters: "GHI", theme: theme)
                KeypadButton(number: "5", amount: $amount, showLetters: true, letters: "JKL", theme: theme)
                KeypadButton(number: "6", amount: $amount, showLetters: true, letters: "MNO", theme: theme)
            }
            
            // Row 3: 7, 8, 9
            HStack(spacing: theme.buttonSpacing) {
                KeypadButton(number: "7", amount: $amount, showLetters: true, letters: "PQRS", theme: theme)
                KeypadButton(number: "8", amount: $amount, showLetters: true, letters: "TUV", theme: theme)
                KeypadButton(number: "9", amount: $amount, showLetters: true, letters: "WXYZ", theme: theme)
            }
            
            // Row 4: ., 0, Delete
            HStack(spacing: theme.buttonSpacing) {
                KeypadButton(number: ".", amount: $amount, isDecimal: true, showLetters: false, theme: theme)
                KeypadButton(number: "0", amount: $amount, showLetters: false, theme: theme)
                KeypadDeleteButton(amount: $amount, theme: theme)
            }
        }
        .padding(theme.padding)
        .frame(width: theme.width)
        .background(
            RoundedRectangle(cornerRadius: theme.cornerRadius)
                .fill(theme.backgroundColor)
                .overlay(
                    RoundedRectangle(cornerRadius: theme.cornerRadius)
                        .stroke(theme.borderColor, lineWidth: theme.borderWidth)
                )
                .shadow(color: theme.glowColor.opacity(0.6), radius: theme.glowRadius, x: 0, y: 0)
                .shadow(color: theme.glowColor.opacity(0.4), radius: theme.glowRadius * 1.67, x: 0, y: 0)
        )
        .allowsHitTesting(true)
        .contentShape(Rectangle())
    }
}

// Helper to convert hex string to Color
private func colorFromHex(_ hex: String?) -> Color {
    guard let hex = hex, !hex.isEmpty else {
        return Color(red: 0.2, green: 0.2, blue: 0.3)
    }
    
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if hexSanitized.hasPrefix("#") {
        hexSanitized.removeFirst()
    }
    
    if hexSanitized.count == 3 {
        hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
    }
    
    guard hexSanitized.count == 6,
          let rgb = UInt32(hexSanitized, radix: 16) else {
        return Color(red: 0.2, green: 0.2, blue: 0.3)
    }
    
    let red = Double((rgb >> 16) & 0xFF) / 255.0
    let green = Double((rgb >> 8) & 0xFF) / 255.0
    let blue = Double(rgb & 0xFF) / 255.0
    
    return Color(red: red, green: green, blue: blue)
}

struct KeypadButton: View {
    let number: String
    @Binding var amount: String
    var isDecimal: Bool = false
    var showLetters: Bool = false
    var letters: String = ""
    let theme: KeypadTheme
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
            
            if isDecimal {
                // Only allow one decimal point
                if !amount.contains(".") {
                    amount += "."
                }
            } else {
                amount += number
            }
        }) {
            VStack(spacing: 4) {
                Text(number)
                    .font(.system(size: theme.numberFontSize, weight: .semibold, design: .rounded))
                    .foregroundColor(theme.buttonTextColor)
                
                if showLetters && !letters.isEmpty {
                    Text(letters)
                        .font(.system(size: theme.letterFontSize, weight: .regular))
                        .foregroundColor(theme.buttonTextColor.opacity(0.7))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: theme.buttonHeight)
            .background(
                RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                    .fill(theme.buttonColor)
                    .shadow(color: isPressed ? Color.black.opacity(0.1) : Color.black.opacity(0.2), 
                           radius: isPressed ? 2 : 4, 
                           x: 0, 
                           y: isPressed ? 1 : 3)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    isPressed = true
                }
                .onEnded { _ in
                    isPressed = false
                }
        )
    }
}

struct KeypadDeleteButton: View {
    @Binding var amount: String
    let theme: KeypadTheme
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()
            
            if !amount.isEmpty {
                amount.removeLast()
            }
        }) {
            Image(systemName: "delete.backward.fill")
                .font(.system(size: theme.numberFontSize * 0.75, weight: .semibold))
                .foregroundColor(theme.buttonTextColor)
                .frame(maxWidth: .infinity)
                .frame(height: theme.buttonHeight)
                .background(
                    RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                        .fill(theme.buttonColor)
                        .shadow(color: isPressed ? Color.black.opacity(0.1) : Color.black.opacity(0.2), 
                               radius: isPressed ? 2 : 4, 
                               x: 0, 
                               y: isPressed ? 1 : 3)
                )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    isPressed = true
                }
                .onEnded { _ in
                    isPressed = false
                }
        )
    }
}
