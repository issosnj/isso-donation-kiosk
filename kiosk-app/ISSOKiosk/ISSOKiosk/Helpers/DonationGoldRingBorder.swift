import SwiftUI

/// Gold ring: saturated at the outer edge, fading toward the center (donation flow buttons & cards).
struct DonationGoldRingBorder: View {
    var cornerRadius: CGFloat = DesignSystem.Components.buttonCornerRadius
    var lineWidth: CGFloat = 2.5

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let endR = sqrt(w * w + h * h) / 2 + lineWidth * 0.5
            RoundedRectangle(cornerRadius: cornerRadius)
                .strokeBorder(
                    RadialGradient(
                        colors: [
                            Color(red: 0.97, green: 0.91, blue: 0.74).opacity(0.35),
                            Color(red: 0.93, green: 0.80, blue: 0.42),
                            Color(red: 0.86, green: 0.66, blue: 0.20),
                            Color(red: 0.72, green: 0.50, blue: 0.08)
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: endR
                    ),
                    lineWidth: lineWidth
                )
        }
        .allowsHitTesting(false)
    }
}
