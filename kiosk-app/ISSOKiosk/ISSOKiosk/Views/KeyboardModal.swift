import SwiftUI
import UIKit

/// Shared keyboard modal wrapper — Header, input display, keyboard grid, footer.
/// Provides smooth animations and consistent layout for all keypad views.
struct KeyboardModal<KeyboardContent: View>: View {
    let title: String
    let inputDisplay: String
    let placeholder: String
    let canContinue: Bool
    let onCancel: () -> Void
    let onContinue: () -> Void
    @ViewBuilder let keyboardContent: () -> KeyboardContent

    @State private var isVisible = false
    @State private var isDismissing = false
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.black.opacity(DesignSystem.Components.modalOverlayOpacity)
                .ignoresSafeArea()
                .opacity(isVisible && !isDismissing ? 1 : 0)
                .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration), value: isVisible)
                .onTapGesture { dismissWithAnimation() }

            ScrollView {
                VStack(spacing: 0) {
                    header
                    inputArea
                    keyboardContent()
                    footer
                }
                .frame(maxWidth: DesignSystem.Components.keyboardModalMaxWidth)
                .padding(.vertical, DesignSystem.Components.keyboardModalPaddingV)
            }
            .frame(maxWidth: DesignSystem.Components.keyboardModalMaxWidth)
            .background(Color.white)
            .cornerRadius(DesignSystem.Components.modalCornerRadius)
            .shadow(
                color: Color.black.opacity(DesignSystem.Components.modalShadowOpacity),
                radius: DesignSystem.Components.modalShadowRadius,
                x: 0,
                y: DesignSystem.Components.modalShadowY
            )
            .scaleEffect(isDismissing ? 0.95 : (isVisible ? 1 : 0.95))
            .opacity(isDismissing ? 0 : (isVisible ? 1 : 0))
            .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration), value: isVisible)
            .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.85), value: isDismissing)
        }
        .onAppear {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration)) {
                isVisible = true
            }
        }
    }

    private func dismissWithAnimation() {
        guard !isDismissing else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.85)) {
            isDismissing = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignSystem.Components.modalAnimationDuration * 0.9) {
            onCancel()
        }
    }

    private var header: some View {
        HStack {
            Button(action: dismissWithAnimation) {
                Text("Cancel")
                    .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                    .padding(.horizontal, DesignSystem.Spacing.md)
                    .padding(.vertical, DesignSystem.Spacing.sm)
            }
            Spacer()
            Text(title)
                .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.sectionTitleSize))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
            Spacer()
            Text("Cancel")
                .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                .foregroundColor(.clear)
                .padding(.horizontal, DesignSystem.Spacing.md)
                .padding(.vertical, DesignSystem.Spacing.sm)
        }
        .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
        .padding(.bottom, DesignSystem.Spacing.md)
    }

    private var inputArea: some View {
        Text(inputDisplay.isEmpty ? placeholder : inputDisplay)
            .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.amountDisplaySize))
            .foregroundColor(inputDisplay.isEmpty ? Color(red: 0.7, green: 0.7, blue: 0.7) : Color(red: 0.26, green: 0.20, blue: 0.20))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignSystem.Components.modalPaddingHorizontal)
            .padding(.vertical, DesignSystem.Spacing.lg)
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .cornerRadius(DesignSystem.Components.cardCornerRadius)
            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
            .padding(.bottom, DesignSystem.Spacing.md)
            .animation(.easeOut(duration: 0.15), value: inputDisplay)
    }

    private var footer: some View {
        Button(action: onContinue) {
            HStack(spacing: DesignSystem.Components.inlineSpacing) {
                Text("Continue")
                    .font(.custom("Inter-Medium", size: DesignSystem.Typography.buttonSize + 2))
                Image(systemName: "arrow.right")
                    .font(.system(size: DesignSystem.Typography.bodySize, weight: .semibold))
            }
            .foregroundColor(canContinue ? .white : Color(white: 0.45))
            .frame(maxWidth: .infinity)
            .frame(height: DesignSystem.Components.buttonHeight)
            .background(
                Group {
                    if canContinue {
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
                        Color(white: 0.78)
                    }
                }
            )
            .cornerRadius(DesignSystem.Components.buttonCornerRadius)
            .shadow(color: canContinue ? Color.black.opacity(0.2) : .clear, radius: 8, x: 0, y: 4)
        }
        .disabled(!canContinue)
        .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
        .padding(.top, DesignSystem.Spacing.md)
        .padding(.bottom, DesignSystem.Spacing.lg)
        .animation(.easeInOut(duration: 0.2), value: canContinue)
    }

    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
        guard let hex = hex, !hex.isEmpty else { return defaultColor }
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") { hexSanitized.removeFirst() }
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        guard hexSanitized.count == 6,
              let rgb = UInt64(hexSanitized, radix: 16) else { return defaultColor }
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }

    private func gradientFromColor(_ color: Color) -> LinearGradient {
        let uiColor = UIColor(color)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        let lighter = Color(
            red: min(1.0, Double(r) * 1.15),
            green: min(1.0, Double(g) * 1.15),
            blue: min(1.0, Double(b) * 1.15)
        )
        return LinearGradient(
            gradient: Gradient(colors: [color, lighter]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
