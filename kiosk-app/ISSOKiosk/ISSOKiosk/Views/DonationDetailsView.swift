import SwiftUI
import UIKit

private enum DonorFieldEditor: String, Identifiable, Hashable {
    case name, phone, email, address
    var id: String { rawValue }
}

private struct DonorFormSnapshot {
    let name: String
    let phone: String
    let email: String
    let address: String
}

struct ModernDonationDetailsView: View {
    @Binding var donationLines: [CheckoutDonationLine]
    let category: DonationCategory?
    let initialDonorName: String?
    let initialDonorPhone: String?
    let initialDonorEmail: String?
    let initialDonorAddress: String?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    let onCancel: (() -> Void)? // Optional callback to return to home
    /// When set, shows “additional seva” under the donation line; tap returns to donation selection (e.g. to pick another category).
    let onAddAdditionalSeva: (() -> Void)?
    @ObservedObject private var languageManager = LanguageManager.shared
    
    @State private var donorName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var donorAddress = ""
    @State private var anonymousSeva = false
    @State private var donorSnapshotBeforeAnonymous: DonorFormSnapshot?
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @State private var isLookingUpDonor = false
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var addressSessionToken: String? = nil
    @State private var activeDonorFieldEditor: DonorFieldEditor?
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    private var totalDonationAmount: Double {
        donationLines.reduce(0) { $0 + $1.amount }
    }
    
    private var isNameRequired: Bool {
        category != nil && !anonymousSeva
    }
    
    private var isPhoneRequired: Bool {
        category != nil && !anonymousSeva
    }
    
    private var canProceed: Bool {
        if anonymousSeva { return true }
        if category != nil {
            return !donorName.trimmingCharacters(in: .whitespaces).isEmpty &&
                   !donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
        }
        return true
    }
    
    /// Placeholder donor record when Anonymous Seva is on (receipt / backend).
    private static let anonymousPlaceholderName = "Ek Hari Bhagat"
    private static let anonymousPlaceholderPhoneDigits = "8568294776"
    private static let anonymousPlaceholderAddress = "2101 Garry Rd, Cinnaminson, NJ 08077"
    
    // Theme layout helpers
    private var theme: KioskTheme? {
        appState.temple?.kioskTheme
    }
    
    /// Matches home screen header / DonationHomeView.
    private var headingColor: Color {
        colorFromHex(theme?.colors?.headingColor, defaultColor: Color(red: 0.22, green: 0.18, blue: 0.16))
    }
    
    private var creamFill: Color { Color(red: 242.0/255.0, green: 235.0/255.0, blue: 224.0/255.0) }
    private var burgundyBrand: Color { Color(red: 147.0/255.0, green: 22.0/255.0, blue: 19.0/255.0) }
    private var goldAccent: Color { Color(red: 0.78, green: 0.58, blue: 0.16) }
    private var stepLineBrown: Color { Color(red: 0.42, green: 0.32, blue: 0.32) }
    private let glassPanelCorner: CGFloat = 28
    
    /// Matches `DonationHomeView` / Step 2 donation selection glass panel metrics.
    private let glassPanelMaxWidthFraction: CGFloat = 0.94
    private let glassPanelMaxWidthPoints: CGFloat = 1400
    private let glassPanelHorizontalPadding: CGFloat = 56
    private let glassPanelVerticalPadding: CGFloat = 8
    private let glassPanelColumnSpacing: CGFloat = 64
    private let glassPanelInternalPadding: CGFloat = 44
    /// Extra inset below the glass panel’s top padding so Step 3 content sits lower than Step 2’s first row.
    private let step3PanelContentTopInset: CGFloat = 20
    
    private var categoryAmountSectionSpacing: CGFloat {
        CGFloat(theme?.layout?.categoryAmountSectionSpacing ?? DesignSystem.Layout.donationSelectionSectionSpacing)
    }
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
        guard let hex = hex, !hex.isEmpty else {
            return defaultColor
        }
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6 else {
            return defaultColor
        }
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return defaultColor
        }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
    
    private var detailsPageHorizontalSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsPageHorizontalSpacing ?? DesignSystem.Spacing.xl)
    }
    
    private var detailsPageBottomPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageBottomPadding ?? DesignSystem.Spacing.xl)
    }
    
    private var detailsCardPadding: CGFloat {
        CGFloat(theme?.layout?.detailsCardPadding ?? DesignSystem.Layout.cardPadding)
    }
    
    // Font sizes
    private var detailsAmountFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsAmountFontSize ?? 56)
    }
    
    private var detailsInputFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsInputFontSize ?? DesignSystem.Typography.inputSize)
    }
    
    @ViewBuilder
    private func donorInputRow(
        geometry: GeometryProxy,
        label: String,
        icon: String,
        value: String,
        isEmpty: Bool,
        hasError: Bool,
        onTap: @escaping () -> Void
    ) -> some View {
        let s = geometry.scale
        VStack(alignment: .leading, spacing: s(6)) {
            Text(label)
                .font(.custom("Georgia", size: s(16)))
                .foregroundColor(goldAccent)
            Button(action: onTap) {
                HStack(alignment: .center, spacing: s(DesignSystem.Components.inlineSpacing)) {
                    Image(systemName: icon)
                        .font(.system(size: s(18)))
                        .foregroundColor(goldAccent.opacity(isEmpty ? 0.5 : 0.9))
                        .frame(width: s(28), alignment: .center)
                    Text(value)
                        .font(.system(size: s(detailsInputFontSize), weight: .regular, design: .serif))
                        .foregroundColor(isEmpty ? headingColor.opacity(0.48) : headingColor)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(minHeight: s(DesignSystem.Components.inputHeight))
                .padding(.horizontal, s(DesignSystem.Spacing.lg))
                .padding(.vertical, s(DesignSystem.Spacing.md))
                .background(
                    RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                        .fill(Color.white.opacity(0.72))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignSystem.Components.buttonCornerRadius)
                                .stroke(
                                    hasError ? Color.red.opacity(0.55) : Color.black.opacity(0.06),
                                    lineWidth: 1
                                )
                        )
                )
            }
            .buttonStyle(.plain)
        }
    }
    
    @ViewBuilder
    private func step3Header(geometry: GeometryProxy) -> some View {
        // Same layout as `stepHeaderView` on DonationHomeView (Step 2).
        let lineColor = stepLineBrown.opacity(0.4)
        HStack(spacing: geometry.scale(16)) {
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
            Text("step3ReviewPayment".localized)
                .font(.custom("Georgia", size: geometry.scale(20)))
                .foregroundColor(stepLineBrown)
            Rectangle()
                .fill(lineColor)
                .frame(height: 1)
        }
        .padding(.horizontal, geometry.scale(40))
    }
    
    // Helper view for background
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
        } else {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white,
                    Color(red: 0.95, green: 0.97, blue: 1.0)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }
    
    @ViewBuilder
    private func mainContentView(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        // Match `DonationHomeView.mainContent` / Step 2 donation selection.
        let panelMaxWidth = min(geometry.size.width * glassPanelMaxWidthFraction, glassPanelMaxWidthPoints)
        let columnSpacing = s(max(glassPanelColumnSpacing, categoryAmountSectionSpacing))
        let cardCorner = s(DesignSystem.Components.cardCornerRadius)
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                step3Header(geometry: geometry)
                    .padding(.top, s(78))
                    .padding(.bottom, s(20))
                
                // Summary column stretches to donor height; actions sit under the summary card only.
                VStack(spacing: 0) {
                    HStack(alignment: .top, spacing: columnSpacing) {
                        donorDetailsCard(geometry: geometry, cardCorner: cardCorner)
                            .frame(maxWidth: .infinity, alignment: .top)
                        
                        Rectangle()
                            .fill(Color.black.opacity(0.06))
                            .frame(width: 1)
                            .frame(maxHeight: .infinity)
                        
                        VStack(alignment: .center, spacing: s(12)) {
                            donationSummaryCard(geometry: geometry, cardCorner: cardCorner)
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                            
                            summaryActionButtonsRow(geometry: geometry)
                                .frame(maxWidth: .infinity)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.horizontal, s(glassPanelInternalPadding))
                    .padding(.top, s(glassPanelVerticalPadding + step3PanelContentTopInset))
                    .padding(.bottom, s(28))
                }
                .frame(maxWidth: panelMaxWidth, maxHeight: geometry.size.height * 0.76, alignment: .top)
                .background(
                    RoundedRectangle(cornerRadius: s(glassPanelCorner))
                        .fill(Color.white.opacity(0.15))
                        .overlay(
                            RoundedRectangle(cornerRadius: s(glassPanelCorner))
                                .stroke(Color.black.opacity(0.06), lineWidth: 1)
                        )
                )
                .shadow(color: Color.black.opacity(0.09), radius: s(40), x: 0, y: s(16))
                .padding(.horizontal, s(glassPanelHorizontalPadding))
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
    
    @ViewBuilder
    private func creamGoldCard<Content: View>(geometry: GeometryProxy, cornerRadius: CGFloat, expandVerticalFill: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        let s = geometry.scale
        let padded = content()
            .padding(s(detailsCardPadding))
            .frame(maxWidth: .infinity, alignment: .leading)
        Group {
            if expandVerticalFill {
                padded.frame(maxHeight: .infinity, alignment: .top)
            } else {
                padded
            }
        }
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(creamFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(Color.white.opacity(0.15))
                    )
                    .shadow(color: Color.black.opacity(0.08), radius: s(12), x: 0, y: s(6))
            )
            .cornerRadius(cornerRadius)
            .overlay(
                DonationGoldRingBorder(cornerRadius: cornerRadius)
                    .allowsHitTesting(false)
            )
    }
    
    private func removeDonationLine(id: UUID) {
        guard donationLines.count > 1 else { return }
        var next = donationLines
        next.removeAll { $0.id == id }
        donationLines = next
    }
    
    @ViewBuilder
    private func donationSummaryLineRow(geometry: GeometryProxy, line: CheckoutDonationLine, showDelete: Bool) -> some View {
        let s = geometry.scale
        let trashRed = Color(red: 0.85, green: 0.18, blue: 0.14)
        HStack(alignment: .center, spacing: s(10)) {
            VStack(alignment: .leading, spacing: s(4)) {
                Text(line.label)
                    .font(.system(size: s(17), weight: .medium, design: .serif))
                    .foregroundColor(headingColor.opacity(0.92))
                    .multilineTextAlignment(.leading)
                if line.quantity > 1 {
                    Text("\("qtyLabel".localized): \(line.quantity)")
                        .font(.system(size: s(14), weight: .regular, design: .serif))
                        .foregroundColor(headingColor.opacity(0.78))
                        .monospacedDigit()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            HStack(spacing: s(8)) {
                Text(line.amount.formattedCurrency())
                    .font(.system(size: s(17), weight: .semibold, design: .serif))
                    .foregroundColor(headingColor)
                    .monospacedDigit()
                    .frame(minWidth: s(92), alignment: .trailing)
                
                if showDelete {
                    Button {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        removeDonationLine(id: line.id)
                    } label: {
                        Image(systemName: "trash.fill")
                            .font(.system(size: s(15), weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: s(40), height: s(36))
                            .background(
                                RoundedRectangle(cornerRadius: s(8))
                                    .fill(trashRed)
                            )
                    }
                    .buttonStyle(.plain)
                    .contentShape(Rectangle())
                }
            }
        }
    }
    
    @ViewBuilder
    private func donationSummaryCard(geometry: GeometryProxy, cardCorner: CGFloat) -> some View {
        let s = geometry.scale
        creamGoldCard(geometry: geometry, cornerRadius: cardCorner, expandVerticalFill: true) {
            VStack(alignment: .center, spacing: 0) {
                // Match `categorySection` / `amountSection` on DonationHomeView (Select Category / Select Amount).
                VStack(alignment: .center, spacing: s(6)) {
                    Text("donationSummary".localized)
                        .font(.custom("Georgia", size: s(28)))
                        .foregroundColor(headingColor)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, s(8))
                .padding(.bottom, s(21))
                
                VStack(alignment: .leading, spacing: s(10)) {
                    ForEach(donationLines) { line in
                        donationSummaryLineRow(geometry: geometry, line: line, showDelete: donationLines.count > 1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                Spacer(minLength: s(16))
                
                VStack(alignment: .center, spacing: s(12)) {
                    VStack(alignment: .leading, spacing: s(10)) {
                        if category != nil {
                            anonymousSevaToggleRow(geometry: geometry)
                        }
                        
                        Rectangle()
                            .fill(stepLineBrown.opacity(0.28))
                            .frame(height: 2)
                        
                        HStack(alignment: .firstTextBaseline, spacing: s(12)) {
                            Text("total".localized)
                                .font(.system(size: s(24), weight: .semibold, design: .serif))
                                .foregroundColor(headingColor)
                            Spacer(minLength: s(8))
                            Text(totalDonationAmount.formattedCurrency())
                                .font(.system(size: s(30), weight: .bold, design: .serif))
                                .foregroundColor(burgundyBrand)
                                .monospacedDigit()
                        }
                        .padding(.top, s(4))
                        .padding(.bottom, s(2))
                    }
                    .frame(maxWidth: .infinity)
                    
                    if onAddAdditionalSeva != nil {
                        additionalSevaButton(geometry: geometry)
                            .zIndex(2)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
    }
    
    /// Back + Proceed under the donation summary column only.
    @ViewBuilder
    private func summaryActionButtonsRow(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        HStack(alignment: .center, spacing: s(8)) {
            backToDonationButton(geometry: geometry, compact: true)
                .frame(maxWidth: .infinity)
            proceedToPaymentButton(geometry: geometry, compact: true)
                .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, s(4))
    }
    
    @ViewBuilder
    private func anonymousSevaToggleRow(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        Toggle(isOn: $anonymousSeva) {
            Text("anonymousSeva".localized)
                .font(.custom("Georgia", size: s(18)))
                .foregroundColor(headingColor)
                .multilineTextAlignment(.leading)
        }
        .tint(burgundyBrand)
        .padding(.vertical, s(4))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func handleAnonymousSevaChange(enabled: Bool) {
        if enabled {
            donorSnapshotBeforeAnonymous = DonorFormSnapshot(
                name: donorName,
                phone: donorPhone,
                email: donorEmail,
                address: donorAddress
            )
            donorName = Self.anonymousPlaceholderName
            donorPhone = Self.anonymousPlaceholderPhoneDigits
            donorEmail = ""
            donorAddress = Self.anonymousPlaceholderAddress
        } else {
            if let snap = donorSnapshotBeforeAnonymous {
                donorName = snap.name
                donorPhone = snap.phone
                donorEmail = snap.email
                donorAddress = snap.address
            }
            donorSnapshotBeforeAnonymous = nil
        }
    }
    
    @ViewBuilder
    private func additionalSevaButton(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let corner = s(DesignSystem.Components.buttonCornerRadius)
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onAddAdditionalSeva?()
        } label: {
            Text("clickToDoAdditionalSeva".localized)
                .font(.custom("Georgia", size: s(15)))
                .multilineTextAlignment(.center)
                .foregroundColor(burgundyBrand)
                .frame(maxWidth: .infinity)
                .padding(.vertical, s(14))
                .padding(.horizontal, s(10))
                .background(
                    RoundedRectangle(cornerRadius: corner)
                        .fill(Color.white.opacity(0.55))
                        .overlay(
                            RoundedRectangle(cornerRadius: corner)
                                .stroke(goldAccent.opacity(0.75), lineWidth: 1.5)
                        )
                )
        }
        .buttonStyle(.plain)
        .contentShape(Rectangle())
    }
    
    @ViewBuilder
    private func donorDetailsCard(geometry: GeometryProxy, cardCorner: CGFloat) -> some View {
        let s = geometry.scale
        creamGoldCard(geometry: geometry, cornerRadius: cardCorner) {
            VStack(alignment: .leading, spacing: 0) {
                // Match `categorySection` / `amountSection` on DonationHomeView (Select Category / Select Amount).
                VStack(alignment: .center, spacing: s(6)) {
                    Text("donorInfo".localized)
                        .font(.custom("Georgia", size: s(28)))
                        .foregroundColor(headingColor)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, s(8))
                .padding(.bottom, s(21))
                
                VStack(alignment: .leading, spacing: geometry.scale(DesignSystem.Components.inlineSpacing)) {
                    donorInputRow(
                        geometry: geometry,
                        label: "name".localized,
                        icon: "person.fill",
                        value: donorName.isEmpty ? "enterYourName".localized : donorName,
                        isEmpty: donorName.isEmpty,
                        hasError: isNameRequired && donorName.trimmingCharacters(in: .whitespaces).isEmpty,
                        onTap: { if !anonymousSeva { activeDonorFieldEditor = .name } }
                    )
                    donorInputRow(
                        geometry: geometry,
                        label: "phoneNumber".localized,
                        icon: "phone.fill",
                        value: donorPhone.isEmpty ? "enterYourPhone".localized : formatPhoneDisplay(donorPhone),
                        isEmpty: donorPhone.isEmpty,
                        hasError: isPhoneRequired && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty,
                        onTap: { if !anonymousSeva { activeDonorFieldEditor = .phone } }
                    )
                    donorInputRow(
                        geometry: geometry,
                        label: "emailForReceipt".localized,
                        icon: "envelope.fill",
                        value: donorEmail.isEmpty ? "enterYourEmail".localized : donorEmail,
                        isEmpty: donorEmail.isEmpty,
                        hasError: false,
                        onTap: { if !anonymousSeva { activeDonorFieldEditor = .email } }
                    )
                    donorInputRow(
                        geometry: geometry,
                        label: "mailingAddress".localized,
                        icon: "mappin.circle.fill",
                        value: donorAddress.isEmpty ? "enterYourAddress".localized : donorAddress,
                        isEmpty: donorAddress.isEmpty,
                        hasError: false,
                        onTap: { if !anonymousSeva { activeDonorFieldEditor = .address } }
                    )
                }
            }
        }
    }
    
    @ViewBuilder
    private func backToDonationButton(geometry: GeometryProxy, compact: Bool = false) -> some View {
        let s = geometry.scale
        let actionCorner = s(DesignSystem.Components.buttonCornerRadius)
        let actionButtonHeight = compact ? s(58) : s(72)
        let iconSize = compact ? s(15) : s(18)
        let titleSize = compact ? s(13) : s(16)
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                if let onCancel = onCancel {
                    onCancel()
                } else {
                    dismiss()
                }
            }
        }) {
            HStack(spacing: compact ? s(4) : s(DesignSystem.Spacing.sm)) {
                Image(systemName: "arrow.left")
                    .font(.system(size: iconSize, weight: .medium))
                Text("backToDonation".localized)
                    .font(.custom("Georgia", size: titleSize))
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
                    .multilineTextAlignment(.center)
            }
            .foregroundColor(headingColor)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, compact ? s(4) : s(8))
            .background(
                RoundedRectangle(cornerRadius: actionCorner)
                    .fill(creamFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: actionCorner)
                            .fill(Color.white.opacity(0.15))
                    )
            )
            .cornerRadius(actionCorner)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, minHeight: actionButtonHeight, maxHeight: actionButtonHeight)
        .overlay(
            DonationGoldRingBorder(cornerRadius: actionCorner)
                .allowsHitTesting(false)
        )
    }
    
    @ViewBuilder
    private func proceedToPaymentButton(geometry: GeometryProxy, compact: Bool = false) -> some View {
        let s = geometry.scale
        let actionCorner = s(DesignSystem.Components.buttonCornerRadius)
        let actionButtonHeight = compact ? s(58) : s(72)
        let titleFont = compact ? s(13) : s(17)
        let arrowSize = compact ? s(13) : s(16)
        Button(action: {
            guard canProceed else { return }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                onConfirm(
                    donorName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorName.trimmingCharacters(in: .whitespaces),
                    donorPhone.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorPhone.trimmingCharacters(in: .whitespaces),
                    donorEmail.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorEmail.trimmingCharacters(in: .whitespaces),
                    donorAddress.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorAddress.trimmingCharacters(in: .whitespaces)
                )
            }
        }) {
            HStack(spacing: compact ? s(4) : s(6)) {
                Text("proceedToPayment".localized)
                    .font(.custom("Georgia", size: titleFont))
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
                    .multilineTextAlignment(.center)
                Image(systemName: "arrow.right")
                    .font(.system(size: arrowSize, weight: .semibold))
            }
            .foregroundColor(headingColor.opacity(canProceed ? 1 : 0.45))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, compact ? s(4) : s(8))
            .padding(.vertical, compact ? s(4) : s(6))
            .background(
                RoundedRectangle(cornerRadius: actionCorner)
                    .fill(creamFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: actionCorner)
                            .fill(Color.white.opacity(0.15))
                    )
            )
            .cornerRadius(actionCorner)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, minHeight: actionButtonHeight, maxHeight: actionButtonHeight)
        .overlay(
            DonationGoldRingBorder(cornerRadius: actionCorner)
                .allowsHitTesting(false)
        )
        .allowsHitTesting(canProceed)
    }
    
    var body: some View {
        // Match `DonationHomeView.body`: one GeometryReader + ignore safe area so Step 3 shares the same coordinate space as Step 2.
        GeometryReader { geometry in
            ZStack {
                backgroundView(geometry: geometry)
                
                mainContentView(geometry: geometry)
                
                VStack {
                    HStack {
                        ReaderBatteryStatusView()
                            .padding(.leading, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                        Spacer()
                    }
                    Spacer()
                }
                
                VStack {
                    HStack {
                        Spacer()
                        TimeAndNetworkStatusView()
                            .padding(.trailing, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                    }
                    Spacer()
                }
            }
        }
        .ignoresSafeArea(.all, edges: .all)
        .fullScreenCover(item: $activeDonorFieldEditor) { field in
            DonorFieldFullScreenCover(
                field: field,
                text: bindingForDonorField(field),
                navTitle: navTitle(for: field),
                prompt: promptForDonorField(field),
                headingColor: headingColor,
                creamFill: creamFill,
                burgundyBrand: burgundyBrand,
                goldAccent: goldAccent,
                addressSuggestions: $addressSuggestions,
                onAddressQuery: { input in
                    await searchAddresses(input: input)
                },
                onPickAddress: { prediction in
                    await selectAddress(suggestion: prediction)
                },
                onDone: {
                    activeDonorFieldEditor = nil
                    addressSuggestions = []
                }
            )
        }
        .sheet(isPresented: $showingYajmanOpportunities) {
            if let category = category, let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                YajmanOpportunitiesView(
                    category: category,
                    opportunities: opportunities,
                    onDismiss: {
                        showingYajmanOpportunities = false
                    }
                )
            }
        }
        .onAppear {
            // Initialize fields with saved donor details if available
            // Always restore from initial values when view appears (preserves data when returning from payment)
            if let initialName = initialDonorName, !initialName.isEmpty {
                donorName = initialName
            }
            if let initialPhone = initialDonorPhone, !initialPhone.isEmpty {
                donorPhone = initialPhone
            }
            if let initialEmail = initialDonorEmail, !initialEmail.isEmpty {
                donorEmail = initialEmail
            }
            if let initialAddress = initialDonorAddress, !initialAddress.isEmpty {
                donorAddress = initialAddress
            }
            
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
        }
        .detectTouches() // Detect all user interactions to reset idle timer
        .onChange(of: donorName) { _ in
            // User is typing in name field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorPhone) { newPhone in
            IdleTimer.shared.userDidInteract()
            guard !anonymousSeva else { return }
            let digitsOnly = newPhone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
            if digitsOnly.count >= 10 && !isLookingUpDonor {
                Task {
                    await lookupDonorInfo(phone: digitsOnly)
                }
            }
        }
        .onChange(of: anonymousSeva) { newValue in
            handleAnonymousSevaChange(enabled: newValue)
        }
        .onChange(of: category?.id) { _ in
            if category == nil && anonymousSeva {
                anonymousSeva = false
            }
        }
        .onChange(of: donorEmail) { _ in
            // User is typing in email field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorAddress) { _ in
            // Address autocomplete runs from `DonorFieldFullScreenCover` on text change (avoids double API calls).
            IdleTimer.shared.userDidInteract()
        }
    }
    
    private func bindingForDonorField(_ field: DonorFieldEditor) -> Binding<String> {
        switch field {
        case .name: return $donorName
        case .phone: return $donorPhone
        case .email: return $donorEmail
        case .address: return $donorAddress
        }
    }
    
    private func navTitle(for field: DonorFieldEditor) -> String {
        switch field {
        case .name:
            return "name".localized
        case .phone:
            return "phoneNumber".localized
        case .email:
            return "emailForReceipt".localized
        case .address:
            return "mailingAddress".localized
        }
    }
    
    private func promptForDonorField(_ field: DonorFieldEditor) -> String {
        switch field {
        case .name: return "enterYourName".localized
        case .phone: return "enterYourPhone".localized
        case .email: return "enterYourEmail".localized
        case .address: return "enterYourAddress".localized
        }
    }
    
    private func formatPhoneDisplay(_ phone: String) -> String {
        DonorUSPhoneFormatting.display(phone)
    }
    
    private func lookupDonorInfo(phone: String) async {
        guard !phone.isEmpty, phone.count >= 10 else {
            return
        }
        
        isLookingUpDonor = true
        defer { isLookingUpDonor = false }
        
        do {
            let response = try await APIService.shared.lookupDonor(phone: phone)
            if response.found, let donor = response.donor {
                await MainActor.run {
                    // Only auto-populate if fields are empty (don't overwrite user input)
                    if donorName.trimmingCharacters(in: .whitespaces).isEmpty, let name = donor.name {
                        donorName = name
                    }
                    if donorEmail.trimmingCharacters(in: .whitespaces).isEmpty, let email = donor.email {
                        donorEmail = email
                    }
                    if donorAddress.trimmingCharacters(in: .whitespaces).isEmpty, let address = donor.address {
                        donorAddress = address
                    }
                }
            }
        } catch {
            // Silently fail - don't show error for lookup failures
            print("[DonationDetailsView] Failed to lookup donor: \(error.localizedDescription)")
        }
    }
    
    private func searchAddresses(input: String) async {
        guard input.count >= 3 else {
            await MainActor.run {
                addressSuggestions = []
            }
            return
        }
        
        // Generate session token if not exists
        if addressSessionToken == nil {
            addressSessionToken = UUID().uuidString
        }
        
        do {
            let response = try await APIService.shared.autocompleteAddress(
                input: input,
                sessionToken: addressSessionToken
            )
            await MainActor.run {
                addressSuggestions = response.predictions
            }
        } catch {
            // Silently fail - don't show error for autocomplete failures
            print("[DonationDetailsView] Failed to autocomplete address: \(error.localizedDescription)")
            await MainActor.run {
                addressSuggestions = []
            }
        }
    }
    
    private func selectAddress(suggestion: AddressPrediction) async {
        do {
            let details = try await APIService.shared.getPlaceDetails(
                placeId: suggestion.place_id,
                sessionToken: addressSessionToken
            )
            
            await MainActor.run {
                if let formattedAddress = details.formatted_address {
                    donorAddress = formattedAddress
                } else {
                    donorAddress = suggestion.description
                }
                addressSuggestions = []
                addressSessionToken = nil
                activeDonorFieldEditor = nil
            }
        } catch {
            // Fallback to description if details fetch fails
            await MainActor.run {
                donorAddress = suggestion.description
                addressSuggestions = []
                addressSessionToken = nil
                activeDonorFieldEditor = nil
            }
        }
    }
}

// MARK: - US phone display: (215) - 520 - 0565 (binding stores digits only)
private enum DonorUSPhoneFormatting {
    static func digitsOnly(_ string: String) -> String {
        String(string.filter { $0.isNumber }.prefix(10))
    }

    static func display(_ raw: String) -> String {
        displayDigits(digitsOnly(raw))
    }

    static func displayDigits(_ digits: String) -> String {
        let d = String(digits.prefix(10))
        guard !d.isEmpty else { return "" }
        if d.count <= 3 { return "(\(d)" }
        if d.count <= 6 {
            return "(\(String(d.prefix(3)))) - \(String(d.dropFirst(3)))"
        }
        let a = String(d.prefix(3))
        let m = String(d.dropFirst(3).prefix(3))
        let l = String(d.dropFirst(6))
        return "(\(a)) - \(m) - \(l)"
    }
}

// MARK: - UIKit-backed Georgia input (SwiftUI TextField ignores custom font sizes)
private struct DonorSingleLineUIKitField: UIViewRepresentable {
    @Binding var text: String
    var placeholder: String
    var fontSize: CGFloat
    var textUIColor: UIColor
    var placeholderUIColor: UIColor
    var keyboardType: UIKeyboardType
    var textContentType: UITextContentType?
    var autocapitalization: UITextAutocapitalizationType
    var disableAutocorrect: Bool
    /// Called when the user taps Return/Done on the keyboard or the accessory Done button (same as nav Done).
    var onEditingDone: (() -> Void)?
    /// When true, `text` binding holds digits only; the field shows formatted `(###) - ### - ####`.
    var isPhoneField: Bool = false

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> UITextField {
        let tf = UITextField()
        context.coordinator.parent = self
        context.coordinator.textField = tf
        tf.delegate = context.coordinator
        tf.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        tf.textColor = textUIColor
        tf.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [
                .foregroundColor: placeholderUIColor,
                .font: UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
            ]
        )
        tf.keyboardType = keyboardType
        tf.textContentType = textContentType
        tf.autocapitalizationType = autocapitalization
        tf.autocorrectionType = disableAutocorrect ? .no : .yes
        tf.adjustsFontSizeToFitWidth = false
        tf.minimumFontSize = fontSize * 0.85
        tf.returnKeyType = .done
        tf.text = isPhoneField ? DonorUSPhoneFormatting.displayDigits(text) : text
        if !isPhoneField {
            tf.addTarget(context.coordinator, action: #selector(Coordinator.textChanged), for: .editingChanged)
        }
        if keyboardType == .phonePad || keyboardType == .emailAddress {
            tf.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator)
        }
        DispatchQueue.main.async {
            tf.becomeFirstResponder()
        }
        return tf
    }

    private func makeAccessoryToolbar(coordinator: Coordinator) -> UIToolbar {
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let done = UIBarButtonItem(
            barButtonSystemItem: .done,
            target: coordinator,
            action: #selector(Coordinator.accessoryDoneTapped)
        )
        toolbar.items = [flex, done]
        return toolbar
    }

    func updateUIView(_ uiView: UITextField, context: Context) {
        context.coordinator.parent = self
        context.coordinator.textField = uiView
        uiView.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        uiView.textColor = textUIColor
        uiView.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [
                .foregroundColor: placeholderUIColor,
                .font: UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
            ]
        )
        let displayText = isPhoneField ? DonorUSPhoneFormatting.displayDigits(text) : text
        if uiView.text != displayText {
            uiView.text = displayText
        }
        if keyboardType == .phonePad || keyboardType == .emailAddress {
            if uiView.inputAccessoryView == nil {
                uiView.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator)
            }
        } else {
            uiView.inputAccessoryView = nil
        }
    }

    final class Coordinator: NSObject, UITextFieldDelegate {
        var parent: DonorSingleLineUIKitField
        weak var textField: UITextField?

        init(_ parent: DonorSingleLineUIKitField) {
            self.parent = parent
        }

        @objc func textChanged(_ sender: UITextField) {
            guard !parent.isPhoneField else { return }
            parent.text = sender.text ?? ""
        }

        @objc func accessoryDoneTapped() {
            textField?.resignFirstResponder()
            parent.onEditingDone?()
        }

        func textFieldShouldReturn(_ textField: UITextField) -> Bool {
            textField.resignFirstResponder()
            parent.onEditingDone?()
            return true
        }

        func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
            guard parent.isPhoneField else { return true }
            let current = textField.text ?? ""
            guard let swiftRange = Range(range, in: current) else { return false }
            let updated = current.replacingCharacters(in: swiftRange, with: string)
            let digits = DonorUSPhoneFormatting.digitsOnly(updated)
            parent.text = digits
            let formatted = DonorUSPhoneFormatting.displayDigits(digits)
            textField.text = formatted
            if let end = textField.position(from: textField.beginningOfDocument, offset: formatted.count) {
                textField.selectedTextRange = textField.textRange(from: end, to: end)
            }
            return false
        }
    }
}

private struct DonorMultilineUIKitTextView: UIViewRepresentable {
    @Binding var text: String
    var fontSize: CGFloat
    var textUIColor: UIColor
    var autocapitalization: UITextAutocapitalizationType
    var disableAutocorrect: Bool
    var onEditingDone: (() -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> UITextView {
        let tv = UITextView()
        context.coordinator.parent = self
        context.coordinator.textView = tv
        tv.delegate = context.coordinator
        tv.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        tv.textColor = textUIColor
        tv.backgroundColor = .clear
        tv.textContainerInset = UIEdgeInsets(top: 6, left: 4, bottom: 6, right: 4)
        tv.autocapitalizationType = autocapitalization
        tv.autocorrectionType = disableAutocorrect ? .no : .yes
        tv.keyboardType = .default
        tv.textContentType = .fullStreetAddress
        tv.text = text
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let done = UIBarButtonItem(
            barButtonSystemItem: .done,
            target: context.coordinator,
            action: #selector(Coordinator.accessoryDoneTapped)
        )
        toolbar.items = [flex, done]
        tv.inputAccessoryView = toolbar
        DispatchQueue.main.async {
            tv.becomeFirstResponder()
        }
        return tv
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.textView = uiView
        uiView.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        uiView.textColor = textUIColor
        if uiView.text != text {
            uiView.text = text
        }
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: DonorMultilineUIKitTextView
        weak var textView: UITextView?

        init(_ parent: DonorMultilineUIKitTextView) {
            self.parent = parent
        }

        @objc func accessoryDoneTapped() {
            textView?.resignFirstResponder()
            parent.onEditingDone?()
        }

        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text ?? ""
        }
    }
}

// MARK: - Quick email domain chips (full-screen email editor)
private enum DonorEmailQuickDomains {
    /// Common consumer / ISP domains shown under the email field while typing.
    static let domains: [String] = [
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "icloud.com",
        "aol.com",
        "live.com",
        "msn.com",
        "protonmail.com",
        "me.com",
        "comcast.net",
        "verizon.net",
        "att.net",
    ]

    /// Preset chip row: `local` + tap `@domain`, or replace domain if `@` already present.
    static func applyPresetDomain(_ raw: String, domain: String) -> String {
        let d = domain.lowercased()
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let atIdx = trimmed.firstIndex(of: "@") {
            let local = String(trimmed[..<atIdx])
            return local + "@" + d
        }
        if trimmed.isEmpty {
            return "@" + d
        }
        return trimmed + "@" + d
    }
}

// MARK: - Full-screen donor field editor (system keyboard)
private struct DonorFieldFullScreenCover: View {
    let field: DonorFieldEditor
    @Binding var text: String
    let navTitle: String
    let prompt: String
    let headingColor: Color
    let creamFill: Color
    let burgundyBrand: Color
    let goldAccent: Color
    @Binding var addressSuggestions: [AddressPrediction]
    let onAddressQuery: (String) async -> Void
    let onPickAddress: (AddressPrediction) async -> Void
    let onDone: () -> Void

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                let sc = geo.scaleWidthStable
                // Readable but not oversized in the gold-bordered field (was ~+10pt too large).
                let inputFont = max(sc(22), min(sc(30), geo.size.width * 0.018 + sc(16)))
                ZStack {
                    Group {
                        if UIImage(named: "KioskBackground") != nil {
                            Image("KioskBackground")
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: geo.size.width, height: geo.size.height)
                                .clipped()
                                .blur(radius: 4)
                        } else {
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.white,
                                    Color(red: 0.95, green: 0.97, blue: 1.0)
                                ]),
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        }
                    }
                    .ignoresSafeArea()
                    
                    creamFill.opacity(0.15)
                        .ignoresSafeArea()
                    
                    VStack(spacing: 0) {
                        Spacer(minLength: sc(28))
                        
                        VStack(alignment: .leading, spacing: 0) {
                            if field == .address {
                                ZStack(alignment: .topLeading) {
                                    if text.isEmpty {
                                        Text(prompt)
                                            .font(.custom("Georgia", size: inputFont * 0.88))
                                            .foregroundColor(headingColor.opacity(0.38))
                                            .padding(.horizontal, sc(20))
                                            .padding(.vertical, sc(10))
                                            .allowsHitTesting(false)
                                    }
                                    DonorMultilineUIKitTextView(
                                        text: $text,
                                        fontSize: inputFont,
                                        textUIColor: UIColor(headingColor),
                                        autocapitalization: .words,
                                        disableAutocorrect: false,
                                        onEditingDone: onDone
                                    )
                                    .frame(minHeight: sc(132))
                                }
                            } else if field == .email {
                                VStack(alignment: .leading, spacing: sc(10)) {
                                    DonorSingleLineUIKitField(
                                        text: $text,
                                        placeholder: prompt,
                                        fontSize: inputFont,
                                        textUIColor: UIColor(headingColor),
                                        placeholderUIColor: UIColor(headingColor.opacity(0.38)),
                                        keyboardType: keyboardType,
                                        textContentType: textContentType,
                                        autocapitalization: uiAutocapitalization,
                                        disableAutocorrect: true,
                                        onEditingDone: onDone,
                                        isPhoneField: false
                                    )
                                    .frame(minHeight: sc(56))
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: sc(10)) {
                                            ForEach(DonorEmailQuickDomains.domains, id: \.self) { domain in
                                                Button {
                                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                    text = DonorEmailQuickDomains.applyPresetDomain(text, domain: domain)
                                                } label: {
                                                    Text("@\(domain)")
                                                        .font(.custom("Georgia", size: sc(15)))
                                                        .foregroundColor(headingColor)
                                                        .padding(.horizontal, sc(12))
                                                        .padding(.vertical, sc(8))
                                                        .background(
                                                            Capsule()
                                                                .fill(Color.white.opacity(0.65))
                                                                .overlay(
                                                                    Capsule()
                                                                        .stroke(goldAccent.opacity(0.9), lineWidth: 1)
                                                                )
                                                        )
                                                }
                                                .buttonStyle(.plain)
                                            }
                                        }
                                        .padding(.vertical, sc(2))
                                        .padding(.trailing, sc(4))
                                    }
                                }
                            } else {
                                DonorSingleLineUIKitField(
                                    text: $text,
                                    placeholder: prompt,
                                    fontSize: inputFont,
                                    textUIColor: UIColor(headingColor),
                                    placeholderUIColor: UIColor(headingColor.opacity(0.38)),
                                    keyboardType: keyboardType,
                                    textContentType: textContentType,
                                    autocapitalization: uiAutocapitalization,
                                    disableAutocorrect: field == .phone,
                                    onEditingDone: onDone,
                                    isPhoneField: field == .phone
                                )
                                .frame(minHeight: sc(56))
                            }
                        }
                        .padding(.horizontal, sc(20))
                        .padding(.vertical, sc(12))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: sc(20))
                                .fill(Color.white.opacity(0.55))
                                .overlay(
                                    RoundedRectangle(cornerRadius: sc(20))
                                        .fill(creamFill.opacity(0.45))
                                )
                                .shadow(color: Color.black.opacity(0.06), radius: sc(16), x: 0, y: sc(8))
                        )
                        .overlay(
                            DonationGoldRingBorder(cornerRadius: sc(20))
                                .allowsHitTesting(false)
                        )
                        .padding(.horizontal, sc(36))
                        
                        if field == .address && !addressSuggestions.isEmpty {
                            ScrollView {
                                VStack(spacing: 0) {
                                    ForEach(Array(addressSuggestions.prefix(8).enumerated()), id: \.element.id) { index, suggestion in
                                        Button {
                                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                            Task {
                                                await onPickAddress(suggestion)
                                            }
                                        } label: {
                                            HStack(alignment: .top, spacing: sc(12)) {
                                                Image(systemName: "mappin.circle.fill")
                                                    .font(.system(size: sc(20)))
                                                    .foregroundColor(goldAccent)
                                                    .padding(.top, sc(2))
                                                VStack(alignment: .leading, spacing: sc(4)) {
                                                    Text(suggestion.structured_formatting.main_text)
                                                        .font(.custom("Georgia", size: sc(17)))
                                                        .foregroundColor(headingColor)
                                                        .lineLimit(2)
                                                        .multilineTextAlignment(.leading)
                                                    Text(suggestion.structured_formatting.secondary_text)
                                                        .font(.custom("Georgia", size: sc(14)))
                                                        .foregroundColor(headingColor.opacity(0.55))
                                                        .lineLimit(2)
                                                        .multilineTextAlignment(.leading)
                                                }
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                            }
                                            .padding(.horizontal, sc(16))
                                            .padding(.vertical, sc(12))
                                            .background(Color.white)
                                        }
                                        .buttonStyle(.plain)
                                        if index < min(addressSuggestions.count, 8) - 1 {
                                            Divider().padding(.leading, sc(48))
                                        }
                                    }
                                }
                            }
                            .frame(maxHeight: sc(280))
                            .background(Color.white)
                            .cornerRadius(DesignSystem.Components.buttonCornerRadius)
                            .shadow(color: Color.black.opacity(0.12), radius: 10, x: 0, y: 4)
                            .padding(.horizontal, sc(36))
                            .padding(.top, sc(16))
                        }

                        Spacer(minLength: sc(100))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text(navTitle)
                        .font(.custom("Georgia", size: 18))
                        .foregroundColor(headingColor)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .multilineTextAlignment(.center)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: onDone) {
                        Text("done".localized)
                            .font(.custom("Georgia", size: 18))
                            .foregroundColor(burgundyBrand)
                    }
                }
            }
            .toolbarBackground(creamFill.opacity(0.98), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .onChange(of: text) { newValue in
            if field == .address {
                Task {
                    await onAddressQuery(newValue)
                }
            }
        }
        .onAppear {
            if field == .address, text.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3 {
                Task {
                    await onAddressQuery(text)
                }
            }
        }
    }
    
    private var keyboardType: UIKeyboardType {
        switch field {
        case .phone: return .phonePad
        case .email: return .emailAddress
        case .name, .address: return .default
        }
    }
    
    private var textContentType: UITextContentType {
        switch field {
        case .name: return .name
        case .phone: return .telephoneNumber
        case .email: return .emailAddress
        case .address: return .fullStreetAddress
        }
    }
    
    private var uiAutocapitalization: UITextAutocapitalizationType {
        switch field {
        case .email, .phone: return .none
        case .name, .address: return .words
        }
    }
}

// Keep old view for compatibility
struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    @State private var donationLines: [CheckoutDonationLine] = []
    
    var body: some View {
        ModernDonationDetailsView(
            donationLines: $donationLines,
            category: category,
            initialDonorName: nil,
            initialDonorPhone: nil,
            initialDonorEmail: nil,
            initialDonorAddress: nil,
            onConfirm: onConfirm,
            onCancel: nil,
            onAddAdditionalSeva: nil
        )
        .onAppear {
            if donationLines.isEmpty {
                donationLines = [CheckoutDonationLine.primary(amount: amount, category: category)]
            }
        }
    }
}
