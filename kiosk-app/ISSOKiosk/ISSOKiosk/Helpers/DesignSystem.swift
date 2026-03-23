import SwiftUI

/**
 * Unified Design System
 *
 * Single source of truth for spacing, typography, and component sizing
 * across all kiosk screens. Use with geometry.scale() for responsive scaling.
 *
 * DO NOT change colors — only structure, spacing, and hierarchy.
 */
enum DesignSystem {

    // MARK: - Spacing Scale (points)
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Typography
    enum Typography {
        /// Page title (e.g. "Welcome to...", "Select Amount")
        static let pageTitleSize: CGFloat = 32
        static let pageTitleFont = "Inter-SemiBold"

        /// Large hero / welcome text
        static let heroSize: CGFloat = 42
        static let heroFont = "Inter-Bold"

        /// Section title (e.g. "Review Donation", "Select Category")
        static let sectionTitleSize: CGFloat = 24
        static let sectionTitleFont = "Inter-SemiBold"

        /// Subsection / card title
        static let subsectionSize: CGFloat = 20
        static let subsectionFont = "Inter-SemiBold"

        /// Body text
        static let bodySize: CGFloat = 16
        static let bodyFont = "Inter-Regular"

        /// Secondary / caption text
        static let secondarySize: CGFloat = 14
        static let secondaryFont = "Inter-Regular"

        /// Button text
        static let buttonSize: CGFloat = 18
        static let buttonFont = "Inter-Medium"

        /// Large amount display
        static let amountDisplaySize: CGFloat = 32
        static let amountDisplayFont = "Inter-SemiBold"

        /// Input field text
        static let inputSize: CGFloat = 18
        static let inputFont = "Inter-Regular"

        /// Label text (above inputs)
        static let labelSize: CGFloat = 14
        static let labelFont = "Inter-Regular"

        /// Icon-adjacent text
        static let captionSize: CGFloat = 12
        static let captionFont = "Inter-Regular"
    }

    // MARK: - Components
    enum Components {
        /// Standard border radius for cards, panels
        static let cardCornerRadius: CGFloat = 16

        /// Border radius for buttons, inputs, small elements
        static let buttonCornerRadius: CGFloat = 12

        /// Border radius for small chips, badges
        static let chipCornerRadius: CGFloat = 8

        /// Primary action button height
        static let buttonHeight: CGFloat = 56

        /// Compact button height (e.g. amount buttons in grid)
        static let compactButtonHeight: CGFloat = 56

        /// Quick action button size (e.g. Events calendar)
        static let quickActionSize: CGFloat = 110

        /// Input field height
        static let inputHeight: CGFloat = 56

        /// Modal / sheet horizontal padding
        static let modalPaddingHorizontal: CGFloat = 24

        /// Modal / sheet vertical padding
        static let modalPaddingVertical: CGFloat = 24

        /// Section spacing (between major sections)
        static let sectionSpacing: CGFloat = 24

        /// Inline spacing (between related elements)
        static let inlineSpacing: CGFloat = 12

        /// Icon size (standard)
        static let iconSize: CGFloat = 24

        /// Icon size for prominent buttons (e.g. WhatsApp, Observances)
        static let iconSizeLarge: CGFloat = 32

        /// Icon frame for alignment (icon + label)
        static let iconFrameWidth: CGFloat = 24

        // MARK: - Keyboard Modal
        /// Modal max width (kiosk-friendly)
        static let keyboardModalMaxWidth: CGFloat = 900
        /// Key height (large touch targets)
        static let keyboardKeyHeight: CGFloat = 60
        /// Spacing between keys (equal horizontal and vertical)
        static let keyboardKeySpacing: CGFloat = 10
        /// Modal corner radius
        static let keyboardModalCornerRadius: CGFloat = 24
        /// Modal content horizontal padding
        static let keyboardModalPaddingH: CGFloat = 28
        /// Modal content vertical padding
        static let keyboardModalPaddingV: CGFloat = 20

        // MARK: - Modal (shared across all modals)
        /// Overlay opacity (0–1), slight dim
        static let modalOverlayOpacity: CGFloat = 0.35
        /// Modal card corner radius
        static let modalCornerRadius: CGFloat = 24
        /// Modal shadow radius
        static let modalShadowRadius: CGFloat = 24
        /// Modal shadow y offset
        static let modalShadowY: CGFloat = 12
        /// Modal shadow opacity
        static let modalShadowOpacity: Double = 0.22
        /// Modal content padding
        static let modalContentPadding: CGFloat = 24
        /// Animation duration (seconds)
        static let modalAnimationDuration: Double = 0.28
        /// Spring response for modal/button transitions
        static let modalSpringResponse: Double = 0.35
        static let modalSpringDamping: Double = 0.85
        /// Modal max width
        static let modalMaxWidth: CGFloat = 900
    }

    // MARK: - Layout
    enum Layout {
        /// Screen edge padding (status bar, corners)
        static let screenPadding: CGFloat = 20

        /// Page content horizontal padding (donation selection, etc.)
        static let pageHorizontalPadding: CGFloat = 40

        /// Top padding for page content (below status bar)
        static let pageTopPadding: CGFloat = 60

        /// Bottom padding for primary actions
        static let actionBottomPadding: CGFloat = 32

        /// Bottom padding for corner actions (e.g. WhatsApp buttons)
        static let bottomCornerPadding: CGFloat = 48

        /// Spacing between stacked buttons
        static let buttonStackSpacing: CGFloat = 16

        /// Card internal padding
        static let cardPadding: CGFloat = 24
    }
}

// MARK: - GeometryProxy Helpers
extension GeometryProxy {
    /// Scale a design system spacing value
    func spacing(_ value: CGFloat) -> CGFloat { scale(value) }
}
