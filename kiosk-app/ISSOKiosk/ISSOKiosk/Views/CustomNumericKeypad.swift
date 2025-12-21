import SwiftUI

struct CustomNumericKeypad: View {
    @Binding var amount: String
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Row 1: 1, 2, 3
            HStack(spacing: 12) {
                KeypadButton(number: "1", amount: $amount, showLetters: false)
                KeypadButton(number: "2", amount: $amount, showLetters: true, letters: "ABC")
                KeypadButton(number: "3", amount: $amount, showLetters: true, letters: "DEF")
            }
            
            // Row 2: 4, 5, 6
            HStack(spacing: 12) {
                KeypadButton(number: "4", amount: $amount, showLetters: true, letters: "GHI")
                KeypadButton(number: "5", amount: $amount, showLetters: true, letters: "JKL")
                KeypadButton(number: "6", amount: $amount, showLetters: true, letters: "MNO")
            }
            
            // Row 3: 7, 8, 9
            HStack(spacing: 12) {
                KeypadButton(number: "7", amount: $amount, showLetters: true, letters: "PQRS")
                KeypadButton(number: "8", amount: $amount, showLetters: true, letters: "TUV")
                KeypadButton(number: "9", amount: $amount, showLetters: true, letters: "WXYZ")
            }
            
            // Row 4: ., 0, Delete
            HStack(spacing: 12) {
                KeypadButton(number: ".", amount: $amount, isDecimal: true, showLetters: false)
                KeypadButton(number: "0", amount: $amount, showLetters: false)
                KeypadDeleteButton(amount: $amount)
            }
        }
        .padding(16)
        .frame(width: 320) // Shrunk width
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(red: 135/255.0, green: 81/255.0, blue: 43/255.0)) // rgba(135, 81, 43) - dark brown background
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0), lineWidth: 3) // rgba(244, 164, 78) - light orange border
                )
                .shadow(color: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0).opacity(0.6), radius: 15, x: 0, y: 0) // Glow effect
                .shadow(color: Color(red: 244/255.0, green: 164/255.0, blue: 78/255.0).opacity(0.4), radius: 25, x: 0, y: 0) // Outer glow
        )
        .allowsHitTesting(true)
        .contentShape(Rectangle())
    }
}

struct KeypadButton: View {
    let number: String
    @Binding var amount: String
    var isDecimal: Bool = false
    var showLetters: Bool = false
    var letters: String = ""
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
                    .font(.system(size: 32, weight: .semibold, design: .rounded))
                    .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                
                if showLetters && !letters.isEmpty {
                    Text(letters)
                        .font(.system(size: 10, weight: .regular))
                        .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 70)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 248/255.0, green: 216/255.0, blue: 161/255.0)) // rgba(248, 216, 161) - light beige/cream
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
                .font(.system(size: 24, weight: .semibold))
                .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                .frame(maxWidth: .infinity)
                .frame(height: 70)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 248/255.0, green: 216/255.0, blue: 161/255.0)) // rgba(248, 216, 161) - light beige/cream
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
