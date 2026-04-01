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
        width: 340,
        buttonHeight: 64,
        buttonSpacing: 12,
        buttonCornerRadius: DesignSystem.Components.buttonCornerRadius,
        backgroundColor: Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0),
        borderColor: Color(red: 0.72, green: 0.50, blue: 0.08).opacity(0.42),
        borderWidth: 1.5,
        glowColor: Color.black.opacity(0.07),
        glowRadius: 14,
        buttonColor: Color.white.opacity(0.42),
        buttonTextColor: Color(red: 0.22, green: 0.18, blue: 0.16),
        numberFontSize: 28,
        letterFontSize: 9,
        padding: DesignSystem.Spacing.md,
        cornerRadius: DesignSystem.Components.cardCornerRadius
    )
    
    /// Outer height of `CustomNumericKeypad` (4 rows + padding).
    var totalKeypadOuterHeight: CGFloat {
        let rows: CGFloat = 4
        return rows * buttonHeight + CGFloat(rows - 1) * buttonSpacing + 2 * padding
    }
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
                        .fill(Color.white.opacity(0.15))
                )
                .shadow(color: theme.glowColor, radius: theme.glowRadius, x: 0, y: theme.glowRadius * 0.5)
        )
        .overlay(
            DonationGoldRingBorder(cornerRadius: theme.cornerRadius)
                .allowsHitTesting(false)
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
            VStack(spacing: 3) {
                Text(number)
                    .font(.system(size: theme.numberFontSize, weight: .medium, design: .serif))
                    .foregroundColor(theme.buttonTextColor)
                    .monospacedDigit()
                
                if showLetters && !letters.isEmpty {
                    Text(letters)
                        .font(.system(size: theme.letterFontSize, weight: .regular, design: .default))
                        .foregroundColor(theme.buttonTextColor.opacity(0.62))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: theme.buttonHeight)
            .background(
                RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                    .fill(theme.buttonColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                            .fill(Color.white.opacity(0.15))
                    )
                    .shadow(color: Color.black.opacity(0.08), radius: isPressed ? 3 : 6, x: 0, y: isPressed ? 1 : 3)
            )
            .cornerRadius(theme.buttonCornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
        .overlay(
            DonationGoldRingBorder(cornerRadius: theme.buttonCornerRadius)
                .allowsHitTesting(false)
        )
        .scaleEffect(isPressed ? DesignSystem.Components.keyPressScale : 1.0)
        .animation(.easeOut(duration: 0.12), value: isPressed)
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
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            
            if !amount.isEmpty {
                amount.removeLast()
            }
        }) {
            Image(systemName: "delete.backward.fill")
                .font(.system(size: theme.numberFontSize * 0.72, weight: .medium))
                .foregroundColor(theme.buttonTextColor.opacity(0.9))
                .frame(maxWidth: .infinity)
                .frame(height: theme.buttonHeight)
                .background(
                    RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                        .fill(theme.buttonColor)
                        .overlay(
                            RoundedRectangle(cornerRadius: theme.buttonCornerRadius)
                                .fill(Color.white.opacity(0.15))
                        )
                        .shadow(color: Color.black.opacity(0.08), radius: isPressed ? 3 : 6, x: 0, y: isPressed ? 1 : 3)
                )
                .cornerRadius(theme.buttonCornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
        .overlay(
            DonationGoldRingBorder(cornerRadius: theme.buttonCornerRadius)
                .allowsHitTesting(false)
        )
        .scaleEffect(isPressed ? DesignSystem.Components.keyPressScale : 1.0)
        .animation(.easeOut(duration: 0.12), value: isPressed)
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
