import SwiftUI

/// Unified key button with subtle press animation. Kiosk-friendly touch target.
struct KeyboardKeyButton: View {
    var primaryLabel: String = ""
    var secondaryLabel: String = ""
    var systemImage: String? = nil
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            Group {
                if let img = systemImage {
                    Image(systemName: img)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                } else {
                    VStack(spacing: secondaryLabel.isEmpty ? 0 : 2) {
                        Text(primaryLabel)
                            .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.subsectionSize + 2))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        if !secondaryLabel.isEmpty {
                            Text(secondaryLabel)
                                .font(.custom(DesignSystem.Typography.captionFont, size: 10))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: DesignSystem.Components.keyboardKeyHeight)
            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
            .cornerRadius(DesignSystem.Components.buttonCornerRadius)
            .shadow(color: Color.black.opacity(isPressed ? 0.04 : 0.08), radius: isPressed ? 2 : 4, x: 0, y: isPressed ? 1 : 2)
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? DesignSystem.Components.keyPressScale : 1.0)
        .animation(.easeOut(duration: 0.12), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}
