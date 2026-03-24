import SwiftUI
import UIKit

private enum PremiumModalLayout {
    static let cardBackground = Color.white
    static let cornerRadius: CGFloat = 28
    static let contentPadding: CGFloat = 36
    static let modalMaxWidth: CGFloat = 560
    static let modalWidthFraction: CGFloat = 0.78
    static let shadowRadius: CGFloat = 40
    static let shadowOpacity: Double = 0.08
    static let shadowY: CGFloat = 16
    static let overlayOpacity: Double = 0.32
}

/// Premium modal for WhatsApp/Observance — matches reference mockup.
struct PremiumKioskModal<Content: View>: View {
    var showTopRightClose: Bool = true
    var showBottomCloseButton: Bool = true
    @ViewBuilder let content: () -> Content

    @Environment(\.dismiss) private var dismiss
    @State private var isVisible = false
    @State private var isDismissing = false

    private var modalWidth: CGFloat {
        min(PremiumModalLayout.modalMaxWidth, UIScreen.main.bounds.width * PremiumModalLayout.modalWidthFraction)
    }

    var body: some View {
        ZStack {
            Color.clear
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture { dismissWithAnimation() }

            VStack(spacing: 0) {
                if showTopRightClose {
                    HStack {
                        Spacer()
                        Button(action: dismissWithAnimation) {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(Color(red: 0.68, green: 0.7, blue: 0.74))
                                .frame(width: 28, height: 28)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(PremiumCloseIconStyle())
                        .padding(.top, 14)
                        .padding(.trailing, 14)
                    }
                }

                content()
                    .padding(.horizontal, PremiumModalLayout.contentPadding)
                    .padding(.top, showTopRightClose ? 14 : 28)
                    .padding(.bottom, 20)

                if showBottomCloseButton {
                    closeButton
                        .padding(.horizontal, PremiumModalLayout.contentPadding)
                        .padding(.bottom, PremiumModalLayout.contentPadding)
                }
            }
            .frame(
                minWidth: modalWidth,
                maxWidth: modalWidth
            )
            .background(PremiumModalLayout.cardBackground)
            .cornerRadius(PremiumModalLayout.cornerRadius)
            .shadow(color: Color.black.opacity(PremiumModalLayout.shadowOpacity), radius: PremiumModalLayout.shadowRadius, x: 0, y: PremiumModalLayout.shadowY)
            .scaleEffect(isDismissing ? 0.96 : (isVisible ? 1 : 0.96))
            .opacity(isDismissing ? 0 : (isVisible ? 1 : 0))
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isVisible)
            .animation(.easeOut(duration: 0.2), value: isDismissing)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .presentationBackground(.clear)
        .onAppear {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { isVisible = true }
        }
    }

    private var closeButton: some View {
        Button(action: dismissWithAnimation) {
            Text("close".localized)
                .font(.custom("Inter-SemiBold", size: 15))
                .foregroundColor(Color(red: 0.18, green: 0.2, blue: 0.26))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
        }
        .buttonStyle(PremiumCloseButtonStyle())
    }

    private func dismissWithAnimation() {
        guard !isDismissing else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeOut(duration: 0.2)) { isDismissing = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) { dismiss() }
    }
}

private struct PremiumCloseIconStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(configuration.isPressed ? Color(red: 0.45, green: 0.47, blue: 0.52) : Color(red: 0.68, green: 0.7, blue: 0.74))
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct PremiumCloseButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(configuration.isPressed ? Color(red: 0.87, green: 0.88, blue: 0.905) : Color(red: 0.94, green: 0.945, blue: 0.96))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.6), lineWidth: 0.5)
            )
            .shadow(color: Color.black.opacity(0.035), radius: 3, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Shared modal wrapper — overlay, card, header, fade+scale animation.
/// Use for Events and other content modals.
struct KioskModal<Content: View>: View {
    let title: String
    let dismissButtonTitle: String
    var tapOverlayToDismiss: Bool = true
    @ViewBuilder let content: () -> Content

    @Environment(\.dismiss) private var dismiss
    @State private var isVisible = false
    @State private var isDismissing = false
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            overlay
            modalCard
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .presentationBackground(.clear)
        .onAppear { animateIn() }
    }

    private var overlay: some View {
        Color.black.opacity(DesignSystem.Components.modalOverlayOpacity)
            .ignoresSafeArea()
        .opacity(isVisible && !isDismissing ? 1 : 0)
        .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration), value: isVisible)
        .onTapGesture {
            if tapOverlayToDismiss {
                dismissWithAnimation()
            }
        }
    }

    private var modalCard: some View {
        VStack(spacing: 0) {
            header
            content()
        }
        .frame(maxWidth: DesignSystem.Components.modalMaxWidth)
        .background(Color.white)
        .cornerRadius(DesignSystem.Components.cardCornerRadius)
        .shadow(
            color: Color.black.opacity(DesignSystem.Components.modalShadowOpacity),
            radius: DesignSystem.Components.modalShadowRadius,
            x: 0,
            y: DesignSystem.Components.modalShadowY
        )
        .padding(DesignSystem.Components.modalContentPadding)
        .scaleEffect(isDismissing ? 0.96 : (isVisible ? 1 : 0.96))
        .opacity(isDismissing ? 0 : (isVisible ? 1 : 0))
        .animation(.spring(response: DesignSystem.Components.modalSpringResponse, dampingFraction: DesignSystem.Components.modalSpringDamping), value: isVisible)
        .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.9), value: isDismissing)
    }

    private var header: some View {
        HStack {
            Spacer()
            Text(title)
                .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.sectionTitleSize))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                .multilineTextAlignment(.center)
            Spacer()
            Button(action: dismissWithAnimation) {
                Text(dismissButtonTitle)
                    .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                    .foregroundColor(doneButtonColor)
            }
        }
        .padding(.horizontal, DesignSystem.Spacing.md)
        .padding(.vertical, DesignSystem.Spacing.sm)
        .padding(.bottom, DesignSystem.Spacing.md)
    }

    private var doneButtonColor: Color {
        colorFromHex(
            appState.temple?.kioskTheme?.colors?.doneButtonColor,
            defaultColor: Color(red: 0.2, green: 0.4, blue: 0.8)
        )
    }

    private func animateIn() {
        withAnimation(.spring(response: DesignSystem.Components.modalSpringResponse, dampingFraction: DesignSystem.Components.modalSpringDamping)) {
            isVisible = true
        }
    }

    private func dismissWithAnimation() {
        guard !isDismissing else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.85)) {
            isDismissing = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignSystem.Components.modalAnimationDuration * 0.9) {
            dismiss()
        }
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
}
