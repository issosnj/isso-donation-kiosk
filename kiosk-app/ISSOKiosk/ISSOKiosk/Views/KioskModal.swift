import SwiftUI
import UIKit

/// Shared modal wrapper — overlay, card, header, fade+scale animation.
/// Use for WhatsApp, Observances, Events, and other content modals.
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
        .cornerRadius(DesignSystem.Components.modalCornerRadius)
        .shadow(
            color: Color.black.opacity(DesignSystem.Components.modalShadowOpacity),
            radius: DesignSystem.Components.modalShadowRadius,
            x: 0,
            y: DesignSystem.Components.modalShadowY
        )
        .padding(DesignSystem.Components.modalContentPadding)
        .scaleEffect(isDismissing ? 0.95 : (isVisible ? 1 : 0.95))
        .opacity(isDismissing ? 0 : (isVisible ? 1 : 0))
        .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration), value: isVisible)
        .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.85), value: isDismissing)
    }

    private var header: some View {
        HStack {
            Spacer()
            Text(title)
                .font(.custom(DesignSystem.Typography.sectionTitleFont, size: DesignSystem.Typography.sectionTitleSize))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
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
        withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration)) {
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
