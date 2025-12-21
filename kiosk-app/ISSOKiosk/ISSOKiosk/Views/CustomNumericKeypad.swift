import SwiftUI

struct CustomNumericKeypad: View {
    @Binding var amount: String
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Keypad header
            HStack {
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                }
                .padding(.trailing, 16)
                .padding(.top, 8)
            }
            .frame(height: 44)
            .background(Color(red: 0.95, green: 0.95, blue: 0.97))
            
            // Keypad grid
            VStack(spacing: 12) {
                // Row 1: 1, 2, 3
                HStack(spacing: 12) {
                    KeypadButton(number: "1", amount: $amount)
                    KeypadButton(number: "2", amount: $amount)
                    KeypadButton(number: "3", amount: $amount)
                }
                
                // Row 2: 4, 5, 6
                HStack(spacing: 12) {
                    KeypadButton(number: "4", amount: $amount)
                    KeypadButton(number: "5", amount: $amount)
                    KeypadButton(number: "6", amount: $amount)
                }
                
                // Row 3: 7, 8, 9
                HStack(spacing: 12) {
                    KeypadButton(number: "7", amount: $amount)
                    KeypadButton(number: "8", amount: $amount)
                    KeypadButton(number: "9", amount: $amount)
                }
                
                // Row 4: ., 0, Delete
                HStack(spacing: 12) {
                    KeypadButton(number: ".", amount: $amount, isDecimal: true)
                    KeypadButton(number: "0", amount: $amount)
                    KeypadDeleteButton(amount: $amount)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(Color(red: 0.95, green: 0.95, blue: 0.97))
        }
        .background(Color(red: 0.95, green: 0.95, blue: 0.97))
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: -5)
    }
}

struct KeypadButton: View {
    let number: String
    @Binding var amount: String
    var isDecimal: Bool = false
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
            Text(number)
                .font(.system(size: 36, weight: .semibold, design: .rounded))
                .foregroundColor(Color(red: 0.2, green: 0.2, blue: 0.3))
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white)
                        .shadow(color: isPressed ? Color.black.opacity(0.1) : Color.black.opacity(0.15), 
                               radius: isPressed ? 2 : 4, 
                               x: 0, 
                               y: isPressed ? 1 : 2)
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
                .font(.system(size: 32, weight: .semibold))
                .foregroundColor(Color(red: 0.9, green: 0.2, blue: 0.2))
                .frame(maxWidth: .infinity)
                .frame(height: 80)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white)
                        .shadow(color: isPressed ? Color.black.opacity(0.1) : Color.black.opacity(0.2), 
                               radius: isPressed ? 3 : 6, 
                               x: 0, 
                               y: isPressed ? 2 : 4)
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

// Extension for corner radius on specific corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

