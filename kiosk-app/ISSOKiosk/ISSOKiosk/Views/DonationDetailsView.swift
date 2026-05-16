import SwiftUI
import UIKit

/// Field indices match `DonorAllFieldsFullScreenCover` / UIKit focus order (0…4).
private enum DonorAllFieldsEditorFocus: Int {
    case firstName = 0
    case lastName = 1
    case phone = 2
    case email = 3
    case address = 4
}

private struct DonorFormSnapshot {
    let firstName: String
    let lastName: String
    let phone: String
    let email: String
    let address: String
}

struct ModernDonationDetailsView: View {
    @Binding var donationLines: [CheckoutDonationLine]
    let category: DonationCategory?
    /// When true, first/last/phone/email/mailing address are required unless Anonymous Seva is on.
    let requiresMandatoryDonorFields: Bool = false
    /// Show the Anonymous Seva toggle on the review card and in the full-screen editor (independent of mandatory fields).
    let showAnonymousSevaToggle: Bool = true
    let initialDonorName: String?
    let initialDonorPhone: String?
    let initialDonorEmail: String?
    let initialDonorAddress: String?
    /// Restores Anonymous Seva after returning from payment (cancel / failure).
    let initialAnonymousSeva: Bool
    let onConfirm: (String?, String?, String?, String?, Bool) -> Void // name, phone, email, address, anonymousSeva
    let onCancel: (() -> Void)? // Optional callback to return to home
    /// When set, shows “additional seva” under the donation line; tap returns to donation selection (e.g. to pick another category).
    let onAddAdditionalSeva: (() -> Void)?
    @ObservedObject private var languageManager = LanguageManager.shared
    
    @State private var donorFirstName = ""
    @State private var donorLastName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var donorAddress = ""
    @State private var anonymousSeva = false
    /// Skips `handleAnonymousSevaChange` once when applying `initialAnonymousSeva` from parent (avoids clobbering snapshot).
    @State private var skipNextAnonymousSevaChangeHandler = false
    @State private var donorSnapshotBeforeAnonymous: DonorFormSnapshot?
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @State private var isLookingUpDonor = false
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var addressSessionToken: String? = nil
    @State private var showDonorAllFieldsEditor = false
    @State private var donorEditorInitialFocusIndex = 0
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    private var totalDonationAmount: Double {
        donationLines.reduce(0) { $0 + $1.amount }
    }
    
    /// Donor contact rows must be filled (used for red borders on the review card).
    private var donorFieldsStrict: Bool {
        requiresMandatoryDonorFields && !anonymousSeva
    }
    
    private func presentDonorAllFieldsEditor(focusAt index: DonorAllFieldsEditorFocus) {
        donorEditorInitialFocusIndex = index.rawValue
        showDonorAllFieldsEditor = true
    }
    
    private var canProceed: Bool {
        if anonymousSeva { return true }
        if !requiresMandatoryDonorFields { return true }
        let firstOK = !donorFirstName.trimmingCharacters(in: .whitespaces).isEmpty
        let lastOK = !donorLastName.trimmingCharacters(in: .whitespaces).isEmpty
        let digitCount = donorPhone.filter(\.isNumber).count
        let phoneOK = digitCount == 10
        let emailOK = !donorEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let addressOK = !donorAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return firstOK && lastOK && phoneOK && emailOK && addressOK
    }

    /// No contact info entered (optional mode uses this to submit as anonymous with placeholders).
    private var isDonorContactCompletelyEmpty: Bool {
        let first = donorFirstName.trimmingCharacters(in: .whitespaces)
        let last = donorLastName.trimmingCharacters(in: .whitespaces)
        if !first.isEmpty || !last.isEmpty { return false }
        if !donorPhone.filter(\.isNumber).isEmpty { return false }
        if !donorEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return false }
        if !donorAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return false }
        return true
    }

    /// Single-line name for payment / API (unchanged contract).
    private func combinedDonorNameForSubmit() -> String {
        let f = donorFirstName.trimmingCharacters(in: .whitespaces)
        let l = donorLastName.trimmingCharacters(in: .whitespaces)
        if f.isEmpty && l.isEmpty { return "" }
        if l.isEmpty { return f }
        if f.isEmpty { return l }
        return "\(f) \(l)"
    }

    /// Split stored full name for display: last space separates last name (e.g. "Ek Hari Bhagat" → "Ek Hari" + "Bhagat").
    private static func splitFullName(_ full: String) -> (first: String, last: String) {
        let t = full.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return ("", "") }
        guard let range = t.range(of: " ", options: .backwards) else { return (t, "") }
        let first = String(t[..<range.lowerBound]).trimmingCharacters(in: .whitespaces)
        let last = String(t[range.upperBound...]).trimmingCharacters(in: .whitespaces)
        return (first, last)
    }
    
    /// Placeholder donor record when Anonymous Seva is on (receipt / backend).
    private static let anonymousPlaceholderFirstName = "Ek Hari"
    private static let anonymousPlaceholderLastName = "Bhagat"
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
        let rowH = s(DesignSystem.Components.inputHeight)
        let corner = s(DesignSystem.Components.buttonCornerRadius)
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
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity)
                .frame(height: rowH)
                .padding(.horizontal, s(DesignSystem.Spacing.lg))
                .background(
                    RoundedRectangle(cornerRadius: corner)
                        .fill(Color.white.opacity(0.72))
                        .overlay(
                            RoundedRectangle(cornerRadius: corner)
                                .stroke(
                                    hasError ? Color.red.opacity(0.55) : Color.black.opacity(0.06),
                                    lineWidth: 1
                                )
                        )
                )
                .overlay(
                    DonationGoldRingBorder(cornerRadius: corner)
                        .allowsHitTesting(false)
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
                
                // Donor and summary columns share the same height; action buttons sit under the summary card only.
                VStack(spacing: 0) {
                    HStack(alignment: .top, spacing: columnSpacing) {
                        donorDetailsCard(geometry: geometry, cardCorner: cardCorner)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                        
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
                        if showAnonymousSevaToggle {
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
                firstName: donorFirstName,
                lastName: donorLastName,
                phone: donorPhone,
                email: donorEmail,
                address: donorAddress
            )
            donorFirstName = Self.anonymousPlaceholderFirstName
            donorLastName = Self.anonymousPlaceholderLastName
            donorPhone = Self.anonymousPlaceholderPhoneDigits
            donorEmail = ""
            donorAddress = Self.anonymousPlaceholderAddress
        } else {
            // Clear placeholder donor fields; keep only email the user had entered before turning anonymous on.
            let preservedEmail = donorSnapshotBeforeAnonymous?.email.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            donorFirstName = ""
            donorLastName = ""
            donorPhone = ""
            donorAddress = ""
            donorEmail = preservedEmail
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
        creamGoldCard(geometry: geometry, cornerRadius: cardCorner, expandVerticalFill: true) {
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
                    HStack(alignment: .top, spacing: s(12)) {
                        donorInputRow(
                            geometry: geometry,
                            label: "firstName".localized,
                            icon: "person.fill",
                            value: donorFirstName.isEmpty ? "enterYourFirstName".localized : donorFirstName,
                            isEmpty: donorFirstName.isEmpty,
                            hasError: donorFieldsStrict && donorFirstName.trimmingCharacters(in: .whitespaces).isEmpty,
                            onTap: { if !anonymousSeva { presentDonorAllFieldsEditor(focusAt: .firstName) } }
                        )
                        .frame(maxWidth: .infinity)
                        donorInputRow(
                            geometry: geometry,
                            label: "lastName".localized,
                            icon: "person.fill",
                            value: donorLastName.isEmpty ? "enterYourLastName".localized : donorLastName,
                            isEmpty: donorLastName.isEmpty,
                            hasError: donorFieldsStrict && donorLastName.trimmingCharacters(in: .whitespaces).isEmpty,
                            onTap: { if !anonymousSeva { presentDonorAllFieldsEditor(focusAt: .lastName) } }
                        )
                        .frame(maxWidth: .infinity)
                    }
                    donorInputRow(
                        geometry: geometry,
                        label: "phoneNumber".localized,
                        icon: "phone.fill",
                        value: donorPhone.isEmpty ? "enterYourPhone".localized : formatPhoneDisplay(donorPhone),
                        isEmpty: donorPhone.isEmpty,
                        hasError: donorFieldsStrict && donorPhone.filter(\.isNumber).count != 10,
                        onTap: { if !anonymousSeva { presentDonorAllFieldsEditor(focusAt: .phone) } }
                    )
                    donorInputRow(
                        geometry: geometry,
                        label: "emailAddress".localized,
                        icon: "envelope.fill",
                        value: donorEmail.isEmpty ? "enterYourEmail".localized : donorEmail,
                        isEmpty: donorEmail.isEmpty,
                        hasError: donorFieldsStrict && donorEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                        onTap: { if !anonymousSeva { presentDonorAllFieldsEditor(focusAt: .email) } }
                    )
                    donorInputRow(
                        geometry: geometry,
                        label: "mailingAddress".localized,
                        icon: "mappin.circle.fill",
                        value: donorAddress.isEmpty ? "enterYourAddress".localized : donorAddress,
                        isEmpty: donorAddress.isEmpty,
                        hasError: donorFieldsStrict && donorAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                        onTap: { if !anonymousSeva { presentDonorAllFieldsEditor(focusAt: .address) } }
                    )
                }
                
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
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
            let autoAnonymous = !requiresMandatoryDonorFields && isDonorContactCompletelyEmpty && !anonymousSeva
            let submitAsAnonymous = anonymousSeva || autoAnonymous
            let placeholderFullName = "\(Self.anonymousPlaceholderFirstName) \(Self.anonymousPlaceholderLastName)"
            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                if submitAsAnonymous {
                    if anonymousSeva {
                        let combinedName = combinedDonorNameForSubmit()
                        let digits = donorPhone.filter { $0.isNumber }
                        let phoneOut = digits.isEmpty ? Self.anonymousPlaceholderPhoneDigits : String(digits.prefix(10))
                        let emailTrim = donorEmail.trimmingCharacters(in: .whitespacesAndNewlines)
                        let addrTrim = donorAddress.trimmingCharacters(in: .whitespacesAndNewlines)
                        onConfirm(
                            combinedName.isEmpty ? placeholderFullName : combinedName,
                            phoneOut,
                            emailTrim.isEmpty ? nil : emailTrim,
                            addrTrim.isEmpty ? nil : addrTrim,
                            true
                        )
                    } else {
                        onConfirm(
                            placeholderFullName,
                            Self.anonymousPlaceholderPhoneDigits,
                            nil,
                            Self.anonymousPlaceholderAddress,
                            true
                        )
                    }
                } else {
                    let combinedName = combinedDonorNameForSubmit()
                    onConfirm(
                        combinedName.isEmpty ? nil : combinedName,
                        donorPhone.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorPhone.trimmingCharacters(in: .whitespaces),
                        donorEmail.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorEmail.trimmingCharacters(in: .whitespaces),
                        donorAddress.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorAddress.trimmingCharacters(in: .whitespaces),
                        false
                    )
                }
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
        .fullScreenCover(isPresented: $showDonorAllFieldsEditor) {
            DonorAllFieldsFullScreenCover(
                donorFirstName: $donorFirstName,
                donorLastName: $donorLastName,
                donorPhone: $donorPhone,
                donorEmail: $donorEmail,
                donorAddress: $donorAddress,
                anonymousSeva: $anonymousSeva,
                initialFocusedFieldIndex: donorEditorInitialFocusIndex,
                showAnonymousSevaToggle: showAnonymousSevaToggle,
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
                    showDonorAllFieldsEditor = false
                    addressSuggestions = []
                },
                onIdleTimeout: {
                    showDonorAllFieldsEditor = false
                    addressSuggestions = []
                    NotificationCenter.default.post(name: .idleTimeoutReached, object: nil)
                }
            )
        }
        .onChange(of: showDonorAllFieldsEditor) { isPresented in
            if isPresented {
                IdleTimer.shared.pause()
            } else {
                IdleTimer.shared.resume()
            }
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
            // Initialize fields when view appears (e.g. returning from cancelled/failed payment).
            if initialAnonymousSeva {
                skipNextAnonymousSevaChangeHandler = true
                donorSnapshotBeforeAnonymous = nil
                if let initialName = initialDonorName, !initialName.isEmpty {
                    let parts = Self.splitFullName(initialName)
                    donorFirstName = parts.first
                    donorLastName = parts.last
                } else {
                    donorFirstName = Self.anonymousPlaceholderFirstName
                    donorLastName = Self.anonymousPlaceholderLastName
                }
                if let initialPhone = initialDonorPhone, !initialPhone.isEmpty {
                    donorPhone = initialPhone
                } else {
                    donorPhone = Self.anonymousPlaceholderPhoneDigits
                }
                donorEmail = initialDonorEmail ?? ""
                if let initialAddress = initialDonorAddress, !initialAddress.isEmpty {
                    donorAddress = initialAddress
                } else {
                    donorAddress = Self.anonymousPlaceholderAddress
                }
                anonymousSeva = true
            } else {
                if let initialName = initialDonorName, !initialName.isEmpty {
                    let parts = Self.splitFullName(initialName)
                    donorFirstName = parts.first
                    donorLastName = parts.last
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
                anonymousSeva = false
            }

            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
        }
        .detectTouches() // Detect all user interactions to reset idle timer
        .onChange(of: donorFirstName) { _ in
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorLastName) { _ in
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
            if skipNextAnonymousSevaChangeHandler {
                skipNextAnonymousSevaChangeHandler = false
                return
            }
            handleAnonymousSevaChange(enabled: newValue)
        }
        .onChange(of: category?.id) { _ in
            if category == nil && anonymousSeva && !requiresMandatoryDonorFields {
                anonymousSeva = false
            }
        }
        .onChange(of: donorEmail) { _ in
            // User is typing in email field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorAddress) { _ in
            IdleTimer.shared.userDidInteract()
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
                    let firstEmpty = donorFirstName.trimmingCharacters(in: .whitespaces).isEmpty
                    let lastEmpty = donorLastName.trimmingCharacters(in: .whitespaces).isEmpty
                    if firstEmpty && lastEmpty, let name = donor.name {
                        let parts = Self.splitFullName(name)
                        donorFirstName = parts.first
                        donorLastName = parts.last
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
            }
        } catch {
            // Fallback to description if details fetch fails
            await MainActor.run {
                donorAddress = suggestion.description
                addressSuggestions = []
                addressSessionToken = nil
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

// MARK: - Themed keyboard accessory (matches kiosk cream / burgundy; avoids default white + blue bar)
private enum DonorFormAccessoryToolbar {
    static func applyAppearance(_ toolbar: UIToolbar, backgroundColor: UIColor) {
        toolbar.isTranslucent = false
        if #available(iOS 15.0, *) {
            let appearance = UIToolbarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = backgroundColor
            appearance.shadowColor = UIColor.black.withAlphaComponent(0.12)
            toolbar.standardAppearance = appearance
            toolbar.scrollEdgeAppearance = appearance
            toolbar.compactAppearance = appearance
        } else {
            toolbar.barTintColor = backgroundColor
        }
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
    /// Single-field editors auto-focus; multi-field forms set false and drive focus via `isFocused`.
    var autoFocusOnAppear: Bool = true
    var fieldIndex: Int = 0
    var isFocused: Bool = false
    var onFieldBecameActive: ((Int) -> Void)?
    var keyboardReturnKeyType: UIReturnKeyType = .done
    var onAdvanceToNextField: (() -> Void)?
    var accessoryNextTitle: String = "Next"
    /// Hides inline QuickType predictions (e.g. domain completions) for sensitive fields like email.
    var suppressKeyboardPredictions: Bool = false
    /// Shows an input accessory with Done (and Next when `accessoryShowsNext`) on keyboards that do not include one (e.g. default name keyboard).
    var addsDoneAccessoryBar: Bool = false
    /// When set with `accessoryTintUIColor`, the accessory uses kiosk styling instead of the default white/blue toolbar.
    var accessoryBackgroundUIColor: UIColor?
    var accessoryTintUIColor: UIColor?
    var accessoryDoneTitle: String = "Done"

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private var needsInputAccessoryToolbar: Bool {
        keyboardType == .phonePad || keyboardType == .emailAddress || addsDoneAccessoryBar
    }

    private var accessoryShowsNext: Bool {
        onAdvanceToNextField != nil && (keyboardType == .phonePad || keyboardType == .emailAddress)
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
        tf.spellCheckingType = suppressKeyboardPredictions ? .no : .default
        if #available(iOS 17.0, *) {
            tf.inlinePredictionType = suppressKeyboardPredictions ? .no : .default
        }
        tf.adjustsFontSizeToFitWidth = false
        tf.minimumFontSize = fontSize * 0.85
        tf.returnKeyType = keyboardReturnKeyType
        tf.text = isPhoneField ? DonorUSPhoneFormatting.displayDigits(text) : text
        if !isPhoneField {
            tf.addTarget(context.coordinator, action: #selector(Coordinator.textChanged), for: .editingChanged)
        }
        if needsInputAccessoryToolbar {
            let showNext = accessoryShowsNext
            context.coordinator.cachedAccessoryShowNext = showNext
            tf.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator, showNext: showNext)
        }
        if autoFocusOnAppear {
            context.coordinator.scheduleBecomeFirstResponder(for: tf)
        }
        return tf
    }

    private func makeAccessoryToolbar(coordinator: Coordinator, showNext: Bool) -> UIToolbar {
        let toolbar = UIToolbar()
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let themed = accessoryBackgroundUIColor != nil && accessoryTintUIColor != nil
        if themed, let bg = accessoryBackgroundUIColor {
            DonorFormAccessoryToolbar.applyAppearance(toolbar, backgroundColor: bg)
        }
        let tint = accessoryTintUIColor
        let done: UIBarButtonItem
        if themed, let t = tint {
            done = UIBarButtonItem(
                title: accessoryDoneTitle,
                style: .plain,
                target: coordinator,
                action: #selector(Coordinator.accessoryDoneTapped)
            )
            done.tintColor = t
        } else {
            done = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: coordinator,
                action: #selector(Coordinator.accessoryDoneTapped)
            )
        }
        if showNext {
            let next = UIBarButtonItem(title: accessoryNextTitle, style: .plain, target: coordinator, action: #selector(Coordinator.accessoryNextTapped))
            if let t = tint {
                next.tintColor = t
            }
            toolbar.items = [next, flex, done]
        } else {
            toolbar.items = [flex, done]
        }
        toolbar.sizeToFit()
        return toolbar
    }

    func updateUIView(_ uiView: UITextField, context: Context) {
        context.coordinator.parent = self
        context.coordinator.textField = uiView
        uiView.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        uiView.textColor = textUIColor
        uiView.returnKeyType = keyboardReturnKeyType
        uiView.spellCheckingType = suppressKeyboardPredictions ? .no : .default
        if #available(iOS 17.0, *) {
            uiView.inlinePredictionType = suppressKeyboardPredictions ? .no : .default
        }
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
        if needsInputAccessoryToolbar {
            let showNext = accessoryShowsNext
            if context.coordinator.cachedAccessoryShowNext != showNext || uiView.inputAccessoryView == nil {
                context.coordinator.cachedAccessoryShowNext = showNext
                uiView.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator, showNext: showNext)
            }
        } else {
            context.coordinator.cachedAccessoryShowNext = nil
            uiView.inputAccessoryView = nil
        }
        if isFocused, uiView.window != nil, !uiView.isFirstResponder {
            context.coordinator.scheduleBecomeFirstResponder(for: uiView)
        }
    }

    final class Coordinator: NSObject, UITextFieldDelegate {
        var parent: DonorSingleLineUIKitField
        weak var textField: UITextField?
        /// Avoid rebuilding the accessory view every SwiftUI frame (reduces keyboard chrome flicker).
        var cachedAccessoryShowNext: Bool?
        private var pendingFocusWorkItem: DispatchWorkItem?

        init(_ parent: DonorSingleLineUIKitField) {
            self.parent = parent
        }

        func scheduleBecomeFirstResponder(for field: UITextField) {
            pendingFocusWorkItem?.cancel()
            let item = DispatchWorkItem { [weak field] in
                guard let field, field.window != nil, !field.isFirstResponder else { return }
                field.becomeFirstResponder()
            }
            pendingFocusWorkItem = item
            DispatchQueue.main.async(execute: item)
        }

        deinit {
            pendingFocusWorkItem?.cancel()
        }

        @objc func textChanged(_ sender: UITextField) {
            guard !parent.isPhoneField else { return }
            parent.text = sender.text ?? ""
        }

        @objc func accessoryDoneTapped() {
            textField?.resignFirstResponder()
            parent.onEditingDone?()
        }

        @objc func accessoryNextTapped() {
            parent.onAdvanceToNextField?()
        }

        func textFieldDidBeginEditing(_ textField: UITextField) {
            parent.onFieldBecameActive?(parent.fieldIndex)
        }

        func textFieldShouldReturn(_ textField: UITextField) -> Bool {
            if parent.keyboardReturnKeyType == .next, parent.onAdvanceToNextField != nil {
                parent.onAdvanceToNextField?()
                return false
            }
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
    var autoFocusOnAppear: Bool = true
    var fieldIndex: Int = 0
    var isFocused: Bool = false
    var onFieldBecameActive: ((Int) -> Void)?
    var accessoryBackgroundUIColor: UIColor?
    var accessoryTintUIColor: UIColor?
    var accessoryDoneTitle: String = "Done"

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private func makeAccessoryToolbar(coordinator: Coordinator) -> UIToolbar {
        let toolbar = UIToolbar()
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let themed = accessoryBackgroundUIColor != nil && accessoryTintUIColor != nil
        if themed, let bg = accessoryBackgroundUIColor {
            DonorFormAccessoryToolbar.applyAppearance(toolbar, backgroundColor: bg)
        }
        let done: UIBarButtonItem
        if themed, let t = accessoryTintUIColor {
            done = UIBarButtonItem(
                title: accessoryDoneTitle,
                style: .plain,
                target: coordinator,
                action: #selector(Coordinator.accessoryDoneTapped)
            )
            done.tintColor = t
        } else {
            done = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: coordinator,
                action: #selector(Coordinator.accessoryDoneTapped)
            )
        }
        toolbar.items = [flex, done]
        toolbar.sizeToFit()
        return toolbar
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
        tv.spellCheckingType = .no
        if #available(iOS 17.0, *) {
            tv.inlinePredictionType = .no
        }
        tv.keyboardType = .default
        tv.textContentType = .fullStreetAddress
        tv.text = text
        tv.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator)
        if autoFocusOnAppear {
            context.coordinator.scheduleBecomeFirstResponder(for: tv)
        }
        return tv
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.textView = uiView
        uiView.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        uiView.textColor = textUIColor
        uiView.spellCheckingType = .no
        if #available(iOS 17.0, *) {
            uiView.inlinePredictionType = .no
        }
        if uiView.text != text {
            uiView.text = text
        }
        if isFocused, uiView.window != nil, !uiView.isFirstResponder {
            context.coordinator.scheduleBecomeFirstResponder(for: uiView)
        }
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: DonorMultilineUIKitTextView
        weak var textView: UITextView?
        private var pendingFocusWorkItem: DispatchWorkItem?

        init(_ parent: DonorMultilineUIKitTextView) {
            self.parent = parent
        }

        func scheduleBecomeFirstResponder(for view: UITextView) {
            pendingFocusWorkItem?.cancel()
            let item = DispatchWorkItem { [weak view] in
                guard let view, view.window != nil, !view.isFirstResponder else { return }
                view.becomeFirstResponder()
            }
            pendingFocusWorkItem = item
            DispatchQueue.main.async(execute: item)
        }

        deinit {
            pendingFocusWorkItem?.cancel()
        }

        @objc func accessoryDoneTapped() {
            textView?.resignFirstResponder()
            parent.onEditingDone?()
        }

        func textViewDidBeginEditing(_ textView: UITextView) {
            parent.onFieldBecameActive?(parent.fieldIndex)
        }

        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text ?? ""
        }
    }
}

/// Keyboard overlap with the key window so scroll padding matches the visible keyboard (avoids a dead gap above it).
private enum DonorFormKeyboardInsets {
    static func overlapHeight(notification: Notification) -> CGFloat {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return 0 }
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap(\.windows)
            .first(where: { $0.isKeyWindow }) else {
            return max(0, UIScreen.main.bounds.height - frame.minY)
        }
        let converted = window.convert(frame, from: UIScreen.main.coordinateSpace)
        return max(0, window.bounds.maxY - converted.minY)
    }

    static func animationDuration(notification: Notification) -> Double {
        (notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0.25
    }
}

// MARK: - Full-screen donor editor: all fields + one Done (tap between fields without dismissing keyboard)
private struct DonorAllFieldsFullScreenCover: View {
    @Binding var donorFirstName: String
    @Binding var donorLastName: String
    @Binding var donorPhone: String
    @Binding var donorEmail: String
    @Binding var donorAddress: String
    @Binding var anonymousSeva: Bool
    let initialFocusedFieldIndex: Int
    let showAnonymousSevaToggle: Bool
    let headingColor: Color
    let creamFill: Color
    let burgundyBrand: Color
    let goldAccent: Color
    @Binding var addressSuggestions: [AddressPrediction]
    let onAddressQuery: (String) async -> Void
    let onPickAddress: (AddressPrediction) async -> Void
    let onDone: () -> Void
    let onIdleTimeout: () -> Void

    @State private var focusedFieldIndex: Int = 0
    @State private var donorFormIdleTimer: Timer?
    @State private var keyboardBottomInset: CGFloat = 0
    @State private var addressAutocompleteTask: Task<Void, Never>?

    private static let donorFormIdleSeconds: TimeInterval = 120

    private func scheduleDonorFormIdleTimer() {
        donorFormIdleTimer?.invalidate()
        donorFormIdleTimer = nil
        donorFormIdleTimer = Timer.scheduledTimer(withTimeInterval: Self.donorFormIdleSeconds, repeats: false) { _ in
            DispatchQueue.main.async {
                onIdleTimeout()
            }
        }
    }

    private func recordDonorFormActivity() {
        scheduleDonorFormIdleTimer()
    }

    private func focusNext(after index: Int) {
        focusedFieldIndex = min(index + 1, 4)
    }

    /// Matches navigation Done: dismiss sheet (keyboard Return/Done and accessory Done).
    private func finishFromKeyboard() {
        recordDonorFormActivity()
        onDone()
    }

    /// Precomputed layout so `body` stays small enough for the Swift type checker.
    private struct EditorLayout {
        let width: CGFloat
        let height: CGFloat
        let inputFont: CGFloat
        let horizontalPad: CGFloat
        let contentW: CGFloat
        let colGap: CGFloat
        let colW: CGFloat
        let cellCorner: CGFloat
        let singleLineInnerHeight: CGFloat
        let singleLineFieldOuterHeight: CGFloat
        let addressFieldOuterMinHeight: CGFloat
        let labelFont: CGFloat
        let labelBottomPadding: CGFloat
        let toggleFont: CGFloat
        let toggleBottomPadding: CGFloat
        let nameRowBottomPadding: CGFloat
        let emailSectionBottomPadding: CGFloat
        let fieldHorizontalPadding: CGFloat
        let fieldVerticalPadding: CGFloat
        let formTopPadding: CGFloat
        let formBottomPadding: CGFloat
        /// Height available for the form below the nav bar and above the keyboard (no scrolling).
        let maxFormContentHeight: CGFloat
        let suggestionMaxHeight: CGFloat
        /// Taller than `height` when the keyboard is up so the temple/gradient fills the gap above the keys (GeometryReader height shrinks).
        let backgroundImageHeight: CGFloat

        static func make(geo: GeometryProxy, keyboardBottomInset: CGFloat, showAnonymousToggle: Bool) -> (EditorLayout, (CGFloat) -> CGFloat) {
            let sc = geo.scaleWidthStable
            let horizontalPad = sc(28)
            let contentW = max(geo.size.width - horizontalPad * 2, sc(200))
            let colGap = sc(12)
            let colW = (contentW - 2 * colGap) / 3
            let cellCorner = sc(DesignSystem.Components.buttonCornerRadius)

            let navReserve = geo.safeAreaInsets.top + sc(52)
            let keyboardUp = keyboardBottomInset > 1
            /// Input accessory sits above keys; overlap height usually includes it, keep a little margin.
            let maxFormH = max(sc(120), geo.size.height - navReserve - keyboardBottomInset - sc(4))
            let suggestionMax = keyboardUp ? sc(72) : sc(220)
            let backgroundPaintH = geo.size.height + max(CGFloat(0), keyboardBottomInset)

            let baseInputFont = max(sc(16), min(sc(24), geo.size.width * 0.012 + sc(13)))
            var inputFont = baseInputFont
            /// Extra touch height on all single-line fields (and drives address band via `singleOuter`).
            let fieldBoost = CGFloat(15)
            var innerH = sc(DesignSystem.Components.inputHeight) + fieldBoost
            var fieldHPad = sc(10)
            var fieldVPad = sc(10)
            var labelFont = sc(14)
            var labelBottom = sc(4)
            var toggleFont = sc(16)
            var toggleBottom = sc(12)
            var nameRowBottom = sc(10)
            var emailSectionBottom = sc(10)
            var formTop = sc(4)
            var formBottom = sc(8)

            if keyboardUp {
                innerH = sc(40) + fieldBoost
                fieldHPad = sc(8)
                fieldVPad = sc(6)
                inputFont = max(sc(14), baseInputFont - sc(2.5))
                labelFont = sc(13)
                labelBottom = sc(3)
                toggleFont = sc(15)
                toggleBottom = sc(8)
                nameRowBottom = sc(8)
                emailSectionBottom = sc(8)
                formTop = sc(2)
                formBottom = sc(6)
            }

            let singleOuter = fieldVPad * 2 + innerH
            /// One compact multiline band (~2 short lines), not a tall text panel.
            let addressOuter = keyboardUp
                ? max(sc(48), min(singleOuter + sc(28), singleOuter * 1.35))
                : max(sc(56), singleOuter + sc(36))

            var layout = EditorLayout(
                width: geo.size.width,
                height: geo.size.height,
                inputFont: inputFont,
                horizontalPad: horizontalPad,
                contentW: contentW,
                colGap: colGap,
                colW: colW,
                cellCorner: cellCorner,
                singleLineInnerHeight: innerH,
                singleLineFieldOuterHeight: singleOuter,
                addressFieldOuterMinHeight: addressOuter,
                labelFont: labelFont,
                labelBottomPadding: labelBottom,
                toggleFont: toggleFont,
                toggleBottomPadding: toggleBottom,
                nameRowBottomPadding: nameRowBottom,
                emailSectionBottomPadding: emailSectionBottom,
                fieldHorizontalPadding: fieldHPad,
                fieldVerticalPadding: fieldVPad,
                formTopPadding: formTop,
                formBottomPadding: formBottom,
                maxFormContentHeight: maxFormH,
                suggestionMaxHeight: suggestionMax,
                backgroundImageHeight: backgroundPaintH
            )

            // If still too tall, shrink address band and inner height one more step.
            let est = layout.estimatedFormHeight(showAnonymousToggle: showAnonymousToggle)
            if est > maxFormH && keyboardUp {
                let delta = est - maxFormH + sc(8)
                let newAddr = max(sc(44), layout.addressFieldOuterMinHeight - min(delta * 0.55, sc(36)))
                let minInner = sc(34) + fieldBoost
                let newInner = max(minInner, layout.singleLineInnerHeight - sc(4))
                let newOuter = layout.fieldVerticalPadding * 2 + newInner
                layout = EditorLayout(
                    width: layout.width,
                    height: layout.height,
                    inputFont: max(sc(13), layout.inputFont - 1),
                    horizontalPad: layout.horizontalPad,
                    contentW: layout.contentW,
                    colGap: layout.colGap,
                    colW: layout.colW,
                    cellCorner: layout.cellCorner,
                    singleLineInnerHeight: newInner,
                    singleLineFieldOuterHeight: newOuter,
                    addressFieldOuterMinHeight: newAddr,
                    labelFont: layout.labelFont,
                    labelBottomPadding: layout.labelBottomPadding,
                    toggleFont: layout.toggleFont,
                    toggleBottomPadding: layout.toggleBottomPadding,
                    nameRowBottomPadding: layout.nameRowBottomPadding,
                    emailSectionBottomPadding: layout.emailSectionBottomPadding,
                    fieldHorizontalPadding: layout.fieldHorizontalPadding,
                    fieldVerticalPadding: layout.fieldVerticalPadding,
                    formTopPadding: layout.formTopPadding,
                    formBottomPadding: layout.formBottomPadding,
                    maxFormContentHeight: maxFormH,
                    suggestionMaxHeight: layout.suggestionMaxHeight,
                    backgroundImageHeight: backgroundPaintH
                )
            }

            return (layout, sc)
        }

        func estimatedFormHeight(showAnonymousToggle: Bool) -> CGFloat {
            var h = formTopPadding + formBottomPadding
            if showAnonymousToggle {
                h += 36 + toggleBottomPadding
            }
            h += singleLineFieldOuterHeight + nameRowBottomPadding
            h += labelFont + 4 + labelBottomPadding + singleLineFieldOuterHeight + emailSectionBottomPadding
            h += labelFont + 4 + labelBottomPadding + addressFieldOuterMinHeight
            return h
        }
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                let pair = EditorLayout.make(
                    geo: geo,
                    keyboardBottomInset: keyboardBottomInset,
                    showAnonymousToggle: showAnonymousSevaToggle
                )
                donorEditorRoot(layout: pair.0, sc: pair.1)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("donorInfo".localized)
                        .font(.custom("Georgia", size: 18))
                        .foregroundColor(headingColor)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .multilineTextAlignment(.center)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        finishFromKeyboard()
                    } label: {
                        Text("done".localized)
                            .font(.custom("Georgia", size: 18))
                            .foregroundColor(burgundyBrand)
                    }
                }
            }
            .toolbarBackground(creamFill.opacity(0.98), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)) { note in
                let h = DonorFormKeyboardInsets.overlapHeight(notification: note)
                let d = DonorFormKeyboardInsets.animationDuration(notification: note)
                withAnimation(.easeOut(duration: d)) {
                    keyboardBottomInset = h
                }
            }
            .background(creamFill.opacity(0.35).ignoresSafeArea())
        }
        .onAppear {
            focusedFieldIndex = min(max(initialFocusedFieldIndex, 0), 4)
            scheduleDonorFormIdleTimer()
            let trimmed = donorAddress.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.count >= 3 {
                Task {
                    await onAddressQuery(trimmed)
                }
            }
        }
        .onDisappear {
            donorFormIdleTimer?.invalidate()
            donorFormIdleTimer = nil
            addressAutocompleteTask?.cancel()
            addressAutocompleteTask = nil
            keyboardBottomInset = 0
        }
        .onChange(of: donorFirstName) { _ in recordDonorFormActivity() }
        .onChange(of: donorLastName) { _ in recordDonorFormActivity() }
        .onChange(of: donorPhone) { _ in recordDonorFormActivity() }
        .onChange(of: donorEmail) { _ in recordDonorFormActivity() }
        .onChange(of: anonymousSeva) { _ in recordDonorFormActivity() }
        .onChange(of: donorAddress) { newValue in
            recordDonorFormActivity()
            addressAutocompleteTask?.cancel()
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.count >= 3 else {
                addressSuggestions = []
                return
            }
            addressAutocompleteTask = Task {
                try? await Task.sleep(nanoseconds: 380_000_000)
                guard !Task.isCancelled else { return }
                await onAddressQuery(trimmed)
            }
        }
    }

    @ViewBuilder
    private func donorEditorRoot(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        ZStack(alignment: .top) {
            donorEditorBackgroundLayer(layout: layout)
            creamFill.opacity(0.15)
                .frame(maxWidth: .infinity, minHeight: layout.backgroundImageHeight, alignment: .top)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .ignoresSafeArea()
                .ignoresSafeArea(.keyboard, edges: .bottom)
            donorEditorFormContainer(layout: layout, sc: sc)
        }
    }

    @ViewBuilder
    private func donorEditorBackgroundLayer(layout: EditorLayout) -> some View {
        Group {
            if UIImage(named: "KioskBackground") != nil {
                Image("KioskBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity, minHeight: layout.backgroundImageHeight)
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
                .frame(maxWidth: .infinity, minHeight: layout.backgroundImageHeight)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .ignoresSafeArea()
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }

    /// Fixed-height column: no scrolling; metrics shrink when the keyboard is up so every field stays visible.
    @ViewBuilder
    private func donorEditorFormContainer(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        VStack(spacing: 0) {
            donorEditorFormStack(layout: layout, sc: sc)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: layout.maxFormContentHeight, alignment: .top)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .simultaneousGesture(
            DragGesture(minimumDistance: 24)
                .onChanged { _ in recordDonorFormActivity() }
        )
    }

    @ViewBuilder
    private func donorEditorFormStack(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if showAnonymousSevaToggle {
                Toggle(isOn: $anonymousSeva) {
                    Text("anonymousSeva".localized)
                        .font(.custom("Georgia", size: layout.toggleFont))
                        .foregroundColor(headingColor)
                }
                .tint(burgundyBrand)
                .padding(.bottom, layout.toggleBottomPadding)
            }
            donorEditorNameRow(layout: layout, sc: sc)
            donorEditorEmailAddressRow(layout: layout, sc: sc)
        }
        .frame(width: layout.contentW, alignment: .leading)
        .padding(.horizontal, layout.horizontalPad)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, layout.formTopPadding)
        .padding(.bottom, layout.formBottomPadding)
    }

    @ViewBuilder
    private func donorEditorNameRow(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        HStack(alignment: .top, spacing: layout.colGap) {
            donorNamedCell(
                sc: sc,
                inputFont: layout.inputFont,
                cellCorner: layout.cellCorner,
                singleLineInnerHeight: layout.singleLineInnerHeight,
                singleLineOuterHeight: layout.singleLineFieldOuterHeight,
                fieldHorizontalPadding: layout.fieldHorizontalPadding,
                fieldVerticalPadding: layout.fieldVerticalPadding,
                placeholder: "firstName".localized,
                binding: $donorFirstName,
                fieldIndex: 0,
                keyboard: .default,
                textContent: .givenName,
                autocap: .words,
                disableCorrect: false,
                isPhone: false,
                fieldWidth: layout.colW,
                addsDoneAccessoryBar: true,
                onKeyboardDone: { finishFromKeyboard() },
                recordActivity: { recordDonorFormActivity() },
                accessoryBackground: UIColor(creamFill),
                accessoryTint: UIColor(burgundyBrand),
                accessoryDoneTitle: "done".localized
            )
            donorNamedCell(
                sc: sc,
                inputFont: layout.inputFont,
                cellCorner: layout.cellCorner,
                singleLineInnerHeight: layout.singleLineInnerHeight,
                singleLineOuterHeight: layout.singleLineFieldOuterHeight,
                fieldHorizontalPadding: layout.fieldHorizontalPadding,
                fieldVerticalPadding: layout.fieldVerticalPadding,
                placeholder: "lastName".localized,
                binding: $donorLastName,
                fieldIndex: 1,
                keyboard: .default,
                textContent: .familyName,
                autocap: .words,
                disableCorrect: false,
                isPhone: false,
                fieldWidth: layout.colW,
                addsDoneAccessoryBar: true,
                onKeyboardDone: { finishFromKeyboard() },
                recordActivity: { recordDonorFormActivity() },
                accessoryBackground: UIColor(creamFill),
                accessoryTint: UIColor(burgundyBrand),
                accessoryDoneTitle: "done".localized
            )
            donorNamedCell(
                sc: sc,
                inputFont: layout.inputFont,
                cellCorner: layout.cellCorner,
                singleLineInnerHeight: layout.singleLineInnerHeight,
                singleLineOuterHeight: layout.singleLineFieldOuterHeight,
                fieldHorizontalPadding: layout.fieldHorizontalPadding,
                fieldVerticalPadding: layout.fieldVerticalPadding,
                placeholder: "enterYourPhone".localized,
                binding: $donorPhone,
                fieldIndex: 2,
                keyboard: .phonePad,
                textContent: .telephoneNumber,
                autocap: .none,
                disableCorrect: true,
                isPhone: true,
                fieldWidth: layout.colW,
                addsDoneAccessoryBar: false,
                onKeyboardDone: { finishFromKeyboard() },
                recordActivity: { recordDonorFormActivity() },
                accessoryBackground: UIColor(creamFill),
                accessoryTint: UIColor(burgundyBrand),
                accessoryDoneTitle: "done".localized
            )
        }
        .frame(width: layout.contentW, alignment: .leading)
        .padding(.bottom, layout.nameRowBottomPadding)
    }

    @ViewBuilder
    private func donorEditorEmailAddressRow(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            editorFieldLabel("emailAddress".localized, layout: layout)
            donorEditorEmailField(layout: layout, sc: sc)
                .padding(.bottom, layout.emailSectionBottomPadding)
            editorFieldLabel("mailingAddress".localized, layout: layout)
            donorEditorAddressColumn(layout: layout, sc: sc)
        }
        .frame(width: layout.contentW, alignment: .leading)
    }

    @ViewBuilder
    private func editorFieldLabel(_ title: String, layout: EditorLayout) -> some View {
        Text(title)
            .font(.custom("Georgia", size: layout.labelFont))
            .foregroundColor(goldAccent)
            .padding(.bottom, layout.labelBottomPadding)
    }

    @ViewBuilder
    private func donorEditorEmailField(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        let cellCorner = layout.cellCorner
        DonorSingleLineUIKitField(
            text: $donorEmail,
            placeholder: "enterYourEmail".localized,
            fontSize: layout.inputFont,
            textUIColor: UIColor(headingColor),
            placeholderUIColor: UIColor(headingColor.opacity(0.38)),
            keyboardType: .emailAddress,
            textContentType: .emailAddress,
            autocapitalization: .none,
            disableAutocorrect: true,
            onEditingDone: { finishFromKeyboard() },
            isPhoneField: false,
            autoFocusOnAppear: false,
            fieldIndex: 3,
            isFocused: focusedFieldIndex == 3,
            onFieldBecameActive: { idx in
                focusedFieldIndex = idx
                recordDonorFormActivity()
            },
            keyboardReturnKeyType: .next,
            onAdvanceToNextField: {
                focusNext(after: 3)
                recordDonorFormActivity()
            },
            accessoryNextTitle: "next".localized,
            suppressKeyboardPredictions: true,
            accessoryBackgroundUIColor: UIColor(creamFill),
            accessoryTintUIColor: UIColor(burgundyBrand),
            accessoryDoneTitle: "done".localized
        )
        .frame(height: layout.singleLineInnerHeight)
        .padding(.horizontal, layout.fieldHorizontalPadding)
        .padding(.vertical, layout.fieldVerticalPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(minHeight: layout.singleLineFieldOuterHeight, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: cellCorner)
                .fill(Color.white.opacity(0.72))
                .overlay(
                    RoundedRectangle(cornerRadius: cellCorner)
                        .stroke(Color.black.opacity(0.06), lineWidth: 1)
                )
        )
        .overlay(DonationGoldRingBorder(cornerRadius: cellCorner).allowsHitTesting(false))
    }

    @ViewBuilder
    private func donorEditorAddressColumn(layout: EditorLayout, sc: @escaping (CGFloat) -> CGFloat) -> some View {
        let cellCorner = layout.cellCorner
        let inputFont = layout.inputFont
        let innerMinH = max(sc(36), layout.addressFieldOuterMinHeight - layout.fieldVerticalPadding * 2)
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                if donorAddress.isEmpty {
                    Text("enterYourAddress".localized)
                        .font(.custom("Georgia", size: inputFont * 0.88))
                        .foregroundColor(headingColor.opacity(0.38))
                        .padding(.horizontal, layout.fieldHorizontalPadding + sc(2))
                        .padding(.vertical, layout.fieldVerticalPadding)
                        .allowsHitTesting(false)
                }
                DonorMultilineUIKitTextView(
                    text: $donorAddress,
                    fontSize: inputFont,
                    textUIColor: UIColor(headingColor),
                    autocapitalization: .words,
                    disableAutocorrect: false,
                    onEditingDone: { finishFromKeyboard() },
                    autoFocusOnAppear: false,
                    fieldIndex: 4,
                    isFocused: focusedFieldIndex == 4,
                    onFieldBecameActive: { idx in
                        focusedFieldIndex = idx
                        recordDonorFormActivity()
                    },
                    accessoryBackgroundUIColor: UIColor(creamFill),
                    accessoryTintUIColor: UIColor(burgundyBrand),
                    accessoryDoneTitle: "done".localized
                )
                .frame(minHeight: innerMinH)
            }
            .padding(.horizontal, layout.fieldHorizontalPadding)
            .padding(.vertical, layout.fieldVerticalPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: layout.addressFieldOuterMinHeight, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: cellCorner)
                    .fill(Color.white.opacity(0.72))
                    .overlay(
                        RoundedRectangle(cornerRadius: cellCorner)
                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                    )
            )
            .overlay(DonationGoldRingBorder(cornerRadius: cellCorner).allowsHitTesting(false))

            if !addressSuggestions.isEmpty {
                addressSuggestionList(sc: sc, inputFont: inputFont, maxHeight: layout.suggestionMaxHeight)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func donorNamedCell(
        sc: @escaping (CGFloat) -> CGFloat,
        inputFont: CGFloat,
        cellCorner: CGFloat,
        singleLineInnerHeight: CGFloat,
        singleLineOuterHeight: CGFloat,
        fieldHorizontalPadding: CGFloat,
        fieldVerticalPadding: CGFloat,
        placeholder: String,
        binding: Binding<String>,
        fieldIndex: Int,
        keyboard: UIKeyboardType,
        textContent: UITextContentType?,
        autocap: UITextAutocapitalizationType,
        disableCorrect: Bool,
        isPhone: Bool,
        fieldWidth: CGFloat,
        addsDoneAccessoryBar: Bool,
        onKeyboardDone: @escaping () -> Void,
        recordActivity: @escaping () -> Void,
        accessoryBackground: UIColor,
        accessoryTint: UIColor,
        accessoryDoneTitle: String
    ) -> some View {
        DonorSingleLineUIKitField(
            text: binding,
            placeholder: placeholder,
            fontSize: inputFont,
            textUIColor: UIColor(headingColor),
            placeholderUIColor: UIColor(headingColor.opacity(0.38)),
            keyboardType: keyboard,
            textContentType: textContent,
            autocapitalization: autocap,
            disableAutocorrect: disableCorrect,
            onEditingDone: onKeyboardDone,
            isPhoneField: isPhone,
            autoFocusOnAppear: false,
            fieldIndex: fieldIndex,
            isFocused: focusedFieldIndex == fieldIndex,
            onFieldBecameActive: { idx in
                focusedFieldIndex = idx
                recordActivity()
            },
            keyboardReturnKeyType: isPhone ? .default : .next,
            onAdvanceToNextField: {
                focusNext(after: fieldIndex)
                recordActivity()
            },
            accessoryNextTitle: "next".localized,
            addsDoneAccessoryBar: addsDoneAccessoryBar,
            accessoryBackgroundUIColor: accessoryBackground,
            accessoryTintUIColor: accessoryTint,
            accessoryDoneTitle: accessoryDoneTitle
        )
        .frame(height: singleLineInnerHeight)
        .padding(.horizontal, fieldHorizontalPadding)
        .padding(.vertical, fieldVerticalPadding)
        .frame(width: fieldWidth, height: singleLineOuterHeight, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: cellCorner)
                .fill(Color.white.opacity(0.72))
                .overlay(
                    RoundedRectangle(cornerRadius: cellCorner)
                        .stroke(Color.black.opacity(0.06), lineWidth: 1)
                )
        )
        .overlay(DonationGoldRingBorder(cornerRadius: cellCorner).allowsHitTesting(false))
    }

    @ViewBuilder
    private func addressSuggestionList(sc: @escaping (CGFloat) -> CGFloat, inputFont: CGFloat, maxHeight: CGFloat) -> some View {
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
                                .font(.system(size: sc(18)))
                                .foregroundColor(goldAccent)
                                .padding(.top, sc(2))
                            VStack(alignment: .leading, spacing: sc(4)) {
                                Text(suggestion.structured_formatting.main_text)
                                    .font(.custom("Georgia", size: inputFont * 0.72))
                                    .foregroundColor(headingColor)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                Text(suggestion.structured_formatting.secondary_text)
                                    .font(.custom("Georgia", size: inputFont * 0.58))
                                    .foregroundColor(headingColor.opacity(0.55))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.horizontal, sc(12))
                        .padding(.vertical, sc(10))
                        .background(creamFill.opacity(0.55))
                    }
                    .buttonStyle(.plain)
                    if index < min(addressSuggestions.count, 8) - 1 {
                        Divider()
                            .background(Color.black.opacity(0.06))
                            .padding(.leading, sc(40))
                    }
                }
            }
        }
        .frame(maxHeight: maxHeight)
        .background(
            RoundedRectangle(cornerRadius: sc(DesignSystem.Components.buttonCornerRadius))
                .fill(Color.white.opacity(0.72))
                .overlay(
                    RoundedRectangle(cornerRadius: sc(DesignSystem.Components.buttonCornerRadius))
                        .stroke(Color.black.opacity(0.06), lineWidth: 1)
                )
        )
        .overlay(
            DonationGoldRingBorder(cornerRadius: sc(DesignSystem.Components.buttonCornerRadius))
                .allowsHitTesting(false)
        )
        .shadow(color: Color.black.opacity(0.1), radius: sc(8), x: 0, y: sc(3))
        .padding(.top, sc(8))
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
            initialAnonymousSeva: false,
            onConfirm: { name, phone, email, address, _ in
                onConfirm(name, phone, email, address)
            },
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
