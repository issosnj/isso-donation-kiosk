import SwiftUI
import UIKit

/// Keeps one UIKit responder per donor field so Next can move the keyboard without waiting on SwiftUI.
final class DonorFieldRegistry {
    private final class Box {
        weak var responder: UIResponder?
    }

    private var boxes: [Int: Box] = [:]

    func register(index: Int, responder: UIResponder) {
        let box = boxes[index] ?? Box()
        box.responder = responder
        boxes[index] = box
    }

    @discardableResult
    func focus(index: Int) -> Bool {
        guard let responder = boxes[index]?.responder else { return false }
        if responder.isFirstResponder { return true }
        return responder.becomeFirstResponder()
    }
}

enum DonorInlineFocus: Int, CaseIterable {
    case none = -1
    case firstName = 0
    case lastName = 1
    case phone = 2
    case email = 3
    case address = 4

    var nextField: DonorInlineFocus? {
        switch self {
        case .firstName: return .lastName
        case .lastName: return .phone
        case .phone: return .email
        case .email: return .address
        case .address, .none: return nil
        }
    }
}

struct ModernDonationDetailsView: View {
    @Binding var donationLines: [CheckoutDonationLine]
    let category: DonationCategory?
    /// Retained so existing call sites keep compiling. Identified donations always require name and phone.
    let requiresMandatoryDonorFields: Bool = false
    /// Show the Anonymous Seva toggle on the review card.
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
    @State private var donorSnapshotBeforeAnonymous: DonorCheckoutRules.Draft?
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var addressSessionToken: String? = nil
    @State private var addressAutocompleteTask: Task<Void, Never>?
    @State private var addressQueryGeneration = 0
    @State private var suppressNextAddressSearch = false
    @State private var inlineFocus: DonorInlineFocus = .none
    @State private var fieldRegistry = DonorFieldRegistry()
    @State private var showValidation = false
    @State private var lookupSession = DonorLookupSession()
    @State private var lookupTask: Task<Void, Never>?
    @State private var savedDonorPrompt = false
    @State private var pendingSavedDonor: DonorCheckoutRules.SavedDonor?
    @State private var donorRestingFieldFrames: [DonorInlineFocus: CGRect] = [:]
    @State private var donorViewport: CGRect = .zero
    @State private var keyboardFrame: CGRect = .zero
    @State private var keyboardAnimationDuration: Double = 0.25
    /// Scroll applied inside the donor card. Positive moves the fields up; the card clips them.
    @State private var donorScrollOffset: CGFloat = 0
    #if DEBUG
    var debugInitialFocus: DonorInlineFocus = .none
    var debugSeedSuggestions: Bool = false
    #endif
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    private var totalDonationAmount: Double {
        donationLines.reduce(0) { $0 + $1.amount }
    }
    
    private var donorDraft: DonorCheckoutRules.Draft {
        DonorCheckoutRules.Draft(
            firstName: donorFirstName,
            lastName: donorLastName,
            phoneDigits: donorPhone,
            email: donorEmail,
            address: donorAddress
        )
    }

    private var checkoutIssues: [DonorCheckoutRules.Issue] {
        _ = requiresMandatoryDonorFields
        return DonorCheckoutRules.issues(draft: donorDraft, anonymous: anonymousSeva)
    }

    private func shows(_ issue: DonorCheckoutRules.Issue) -> Bool {
        showValidation && checkoutIssues.contains(issue)
    }

    private func dismissInlineInput() {
        inlineFocus = .none
        addressSuggestions = []
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    private func focus(_ field: DonorInlineFocus) {
        guard !anonymousSeva else { return }
        inlineFocus = field
        if field != .address {
            addressSuggestions = []
        }
    }

    private func advance(from field: DonorInlineFocus) {
        guard let next = field.nextField else {
            dismissInlineInput()
            return
        }
        // Move the real first responder immediately so the keyboard stays up.
        // SwiftUI focus state follows in the same turn.
        focus(next)
        fieldRegistry.focus(index: next.rawValue)
    }

    private func refreshDonorScroll(animated: Bool) {
        let field = donorRestingFieldFrames[inlineFocus] ?? .zero
        let suggestionReserve: CGFloat = (inlineFocus == .address && !addressSuggestions.isEmpty) ? 200 : 0
        var next = DonorKeyboardAvoidance.scrollOffset(
            fieldInContent: field,
            viewport: donorViewport,
            keyboard: keyboardFrame,
            padding: 16,
            reservedAboveField: suggestionReserve
        )
        if abs(next) < 0.5 {
            let contentBottom = donorRestingFieldFrames.values.map(\.maxY).max() ?? 0
            next = DonorKeyboardAvoidance.floatingPadClearance(
                fieldInContent: field,
                viewport: donorViewport,
                keyboard: keyboardFrame,
                contentBottom: contentBottom,
                coveredTop: 140
            )
        }
        guard abs(next - donorScrollOffset) > 0.5 else { return }
        let apply = { donorScrollOffset = next }
        if animated {
            withAnimation(.easeOut(duration: max(0.15, keyboardAnimationDuration))) {
                apply()
            }
        } else {
            apply()
        }
    }
    
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
    private func fieldLabel(_ title: String, geometry: GeometryProxy) -> some View {
        Text(title)
            .font(.custom("Georgia", size: geometry.scale(16)))
            .foregroundColor(goldAccent)
    }

    @ViewBuilder
    private func fieldError(_ message: String?, geometry: GeometryProxy) -> some View {
        if let message {
            Text(message)
                .font(.custom("Georgia", size: geometry.scale(13)))
                .foregroundColor(Color.red.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func fieldChrome<Content: View>(geometry: GeometryProxy, focused: Bool, hasError: Bool, @ViewBuilder content: () -> Content) -> some View {
        let s = geometry.scale
        let corner = s(DesignSystem.Components.buttonCornerRadius)
        return content()
            .frame(maxWidth: .infinity)
            .frame(height: s(DesignSystem.Components.inputHeight))
            .padding(.horizontal, s(DesignSystem.Spacing.lg))
            .background(
                RoundedRectangle(cornerRadius: corner)
                    .fill(Color.white.opacity(0.72))
                    .overlay(
                        RoundedRectangle(cornerRadius: corner)
                            .stroke(hasError ? Color.red.opacity(0.55) : Color.black.opacity(0.06), lineWidth: 1)
                    )
            )
            .overlay(
                DonationGoldRingBorder(cornerRadius: corner)
                    .allowsHitTesting(false)
            )
            .overlay(
                RoundedRectangle(cornerRadius: corner)
                    .stroke(goldAccent.opacity(focused ? 0.95 : 0), lineWidth: focused ? 2 : 0)
                    .allowsHitTesting(false)
            )
    }

    @ViewBuilder
    private func inlineNameField(
        geometry: GeometryProxy,
        label: String,
        icon: String,
        placeholder: String,
        text: Binding<String>,
        field: DonorInlineFocus,
        contentType: UITextContentType,
        error: String?
    ) -> some View {
        let s = geometry.scale
        VStack(alignment: .leading, spacing: s(6)) {
            fieldLabel(label, geometry: geometry)
            fieldChrome(geometry: geometry, focused: inlineFocus == field, hasError: error != nil) {
                HStack(spacing: s(DesignSystem.Components.inlineSpacing)) {
                    Image(systemName: icon)
                        .font(.system(size: s(18)))
                        .foregroundColor(goldAccent.opacity(text.wrappedValue.isEmpty ? 0.5 : 0.9))
                        .frame(width: s(28))
                    DonorSingleLineUIKitField(
                        text: text,
                        placeholder: placeholder,
                        fontSize: s(detailsInputFontSize),
                        textUIColor: UIColor(headingColor),
                        placeholderUIColor: UIColor(headingColor.opacity(0.48)),
                        keyboardType: .default,
                        textContentType: contentType,
                        autocapitalization: .words,
                        disableAutocorrect: true,
                        onEditingDone: { dismissInlineInput() },
                        autoFocusOnAppear: false,
                        fieldRegistry: fieldRegistry,
                        fieldIndex: field.rawValue,
                        isFocused: inlineFocus == field,
                        onFieldBecameActive: { _ in focus(field) },
                        keyboardReturnKeyType: .next,
                        onAdvanceToNextField: { advance(from: field) },
                        accessoryNextTitle: "next".localized,
                        suppressKeyboardPredictions: true,
                        addsDoneAccessoryBar: true,
                        accessoryBackgroundUIColor: UIColor(creamFill),
                        accessoryTintUIColor: UIColor(burgundyBrand),
                        accessoryDoneTitle: "done".localized
                    )
                }
            }
            fieldError(error, geometry: geometry)
        }
    }

    @ViewBuilder
    private func inlinePhoneField(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let error = shows(.phoneRequired) ? "phoneNumberRequired".localized : nil
        VStack(alignment: .leading, spacing: s(6)) {
            fieldLabel("phoneNumber".localized, geometry: geometry)
            fieldChrome(geometry: geometry, focused: inlineFocus == .phone, hasError: error != nil) {
                HStack(spacing: s(DesignSystem.Components.inlineSpacing)) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: s(18)))
                        .foregroundColor(goldAccent.opacity(donorPhone.isEmpty ? 0.5 : 0.9))
                        .frame(width: s(28))
                    DonorSingleLineUIKitField(
                        text: $donorPhone,
                        placeholder: "enterYourPhone".localized,
                        fontSize: s(detailsInputFontSize),
                        textUIColor: UIColor(headingColor),
                        placeholderUIColor: UIColor(headingColor.opacity(0.48)),
                        keyboardType: .phonePad,
                        textContentType: .telephoneNumber,
                        autocapitalization: .none,
                        disableAutocorrect: true,
                        onEditingDone: { dismissInlineInput() },
                        isPhoneField: true,
                        autoFocusOnAppear: false,
                        fieldRegistry: fieldRegistry,
                        fieldIndex: DonorInlineFocus.phone.rawValue,
                        isFocused: inlineFocus == .phone,
                        onFieldBecameActive: { _ in focus(.phone) },
                        keyboardReturnKeyType: .next,
                        onAdvanceToNextField: { advance(from: .phone) },
                        accessoryNextTitle: "next".localized,
                        suppressKeyboardPredictions: true,
                        addsDoneAccessoryBar: true,
                        accessoryBackgroundUIColor: UIColor(creamFill),
                        accessoryTintUIColor: UIColor(burgundyBrand),
                        accessoryDoneTitle: "done".localized
                    )
                }
            }
            fieldError(error, geometry: geometry)
        }
    }

    @ViewBuilder
    private func inlineEmailField(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let error = shows(.emailInvalid) ? "emailInvalid".localized : nil
        VStack(alignment: .leading, spacing: s(6)) {
            fieldLabel("emailAddress".localized, geometry: geometry)
            fieldChrome(geometry: geometry, focused: inlineFocus == .email, hasError: error != nil) {
                HStack(spacing: s(DesignSystem.Components.inlineSpacing)) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: s(18)))
                        .foregroundColor(goldAccent.opacity(donorEmail.isEmpty ? 0.5 : 0.9))
                        .frame(width: s(28))
                    DonorSingleLineUIKitField(
                        text: $donorEmail,
                        placeholder: "enterYourEmail".localized,
                        fontSize: s(detailsInputFontSize),
                        textUIColor: UIColor(headingColor),
                        placeholderUIColor: UIColor(headingColor.opacity(0.48)),
                        keyboardType: .emailAddress,
                        textContentType: .emailAddress,
                        autocapitalization: .none,
                        disableAutocorrect: true,
                        onEditingDone: { dismissInlineInput() },
                        autoFocusOnAppear: false,
                        fieldRegistry: fieldRegistry,
                        fieldIndex: DonorInlineFocus.email.rawValue,
                        isFocused: inlineFocus == .email,
                        onFieldBecameActive: { _ in focus(.email) },
                        keyboardReturnKeyType: .next,
                        onAdvanceToNextField: { advance(from: .email) },
                        accessoryNextTitle: "next".localized,
                        suppressKeyboardPredictions: true,
                        addsDoneAccessoryBar: true,
                        accessoryBackgroundUIColor: UIColor(creamFill),
                        accessoryTintUIColor: UIColor(burgundyBrand),
                        accessoryDoneTitle: "done".localized
                    )
                }
            }
            fieldError(error, geometry: geometry)
        }
    }

    @ViewBuilder
    private func inlineAddressField(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let corner = s(DesignSystem.Components.buttonCornerRadius)
        VStack(alignment: .leading, spacing: s(6)) {
            fieldLabel("mailingAddress".localized, geometry: geometry)
            ZStack(alignment: .topLeading) {
                fieldChrome(geometry: geometry, focused: inlineFocus == .address, hasError: false) {
                    HStack(alignment: .center, spacing: s(DesignSystem.Components.inlineSpacing)) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: s(18)))
                            .foregroundColor(goldAccent.opacity(donorAddress.isEmpty ? 0.5 : 0.9))
                            .frame(width: s(28))
                        DonorMultilineUIKitTextView(
                            text: $donorAddress,
                            fontSize: s(detailsInputFontSize),
                            textUIColor: UIColor(headingColor),
                            autocapitalization: .words,
                            disableAutocorrect: true,
                            onEditingDone: { dismissInlineInput() },
                            autoFocusOnAppear: false,
                            fieldRegistry: fieldRegistry,
                            fieldIndex: DonorInlineFocus.address.rawValue,
                            isFocused: inlineFocus == .address,
                            onFieldBecameActive: { _ in focus(.address) },
                            accessoryBackgroundUIColor: UIColor(creamFill),
                            accessoryTintUIColor: UIColor(burgundyBrand),
                            accessoryDoneTitle: "done".localized
                        )
                    }
                }
                if donorAddress.isEmpty {
                    Text("enterYourAddress".localized)
                        .font(.system(size: s(detailsInputFontSize), weight: .regular, design: .serif))
                        .foregroundColor(headingColor.opacity(0.48))
                        .lineLimit(1)
                        .padding(.leading, s(DesignSystem.Spacing.lg) + s(28) + s(DesignSystem.Components.inlineSpacing))
                        .frame(height: s(DesignSystem.Components.inputHeight), alignment: .leading)
                        .allowsHitTesting(false)
                }
            }
            .overlay(alignment: .topLeading) {
                if inlineFocus == .address && !addressSuggestions.isEmpty {
                    let visibleCount = CGFloat(min(addressSuggestions.count, 4))
                    let listHeight = min(s(168), visibleCount * s(54))
                    addressSuggestionList(geometry: geometry)
                        .padding(.leading, s(DesignSystem.Spacing.lg))
                        .offset(y: -(listHeight + s(8)))
                        .zIndex(8)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: corner)
                    .stroke(Color.clear, lineWidth: 0)
            )
        }
    }

    @ViewBuilder
    private func savedDonorPromptCard(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let corner = s(DesignSystem.Components.buttonCornerRadius)
        VStack(alignment: .leading, spacing: s(8)) {
            Text("savedDonorPrompt".localized)
                .font(.custom("Georgia", size: s(14)))
                .foregroundColor(headingColor)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: s(8)) {
                Button {
                    if let pending = pendingSavedDonor {
                        apply(DonorCheckoutRules.applySavedDonor(pending, to: donorDraft))
                    }
                    savedDonorPrompt = false
                    pendingSavedDonor = nil
                } label: {
                    Text("useSavedInformation".localized)
                        .font(.custom("Georgia", size: s(13)))
                        .foregroundColor(.white)
                        .padding(.horizontal, s(10))
                        .padding(.vertical, s(8))
                        .background(RoundedRectangle(cornerRadius: corner).fill(burgundyBrand))
                }
                .buttonStyle(.plain)
                Button {
                    savedDonorPrompt = false
                    pendingSavedDonor = nil
                } label: {
                    Text("continueWithoutSaved".localized)
                        .font(.custom("Georgia", size: s(13)))
                        .foregroundColor(headingColor)
                        .padding(.horizontal, s(10))
                        .padding(.vertical, s(8))
                        .background(
                            RoundedRectangle(cornerRadius: corner)
                                .stroke(goldAccent.opacity(0.8), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(s(10))
        .background(
            RoundedRectangle(cornerRadius: corner)
                .fill(Color.white.opacity(0.72))
        )
        .overlay(DonationGoldRingBorder(cornerRadius: corner).allowsHitTesting(false))
    }

    @ViewBuilder
    private func addressSuggestionList(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        let corner = s(DesignSystem.Components.buttonCornerRadius)
        ScrollView {
            VStack(spacing: 0) {
                ForEach(Array(addressSuggestions.prefix(4).enumerated()), id: \.element.id) { index, suggestion in
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        suppressNextAddressSearch = true
                        Task { await selectAddress(suggestion: suggestion) }
                    } label: {
                        VStack(alignment: .leading, spacing: s(2)) {
                            Text(suggestion.structured_formatting.main_text)
                                .font(.custom("Georgia", size: s(14)))
                                .foregroundColor(headingColor)
                                .lineLimit(1)
                            Text(suggestion.structured_formatting.secondary_text)
                                .font(.custom("Georgia", size: s(12)))
                                .foregroundColor(headingColor.opacity(0.6))
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, s(10))
                        .padding(.vertical, s(8))
                    }
                    .buttonStyle(.plain)
                    if index < min(addressSuggestions.count, 4) - 1 {
                        Divider().padding(.leading, s(10))
                    }
                }
            }
        }
        .frame(height: min(s(148), CGFloat(min(addressSuggestions.count, 4)) * s(54)))
        .background(
            RoundedRectangle(cornerRadius: corner)
                .fill(Color.white.opacity(0.96))
                .shadow(color: Color.black.opacity(0.12), radius: s(8), x: 0, y: s(3))
        )
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
    private func creamGoldCard<Content: View>(geometry: GeometryProxy, cornerRadius: CGFloat, expandVerticalFill: Bool = false, clipsContent: Bool = true, @ViewBuilder content: () -> Content) -> some View {
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
                    .onTapGesture { dismissInlineInput() }
            )
            .modifier(DonorCardClip(enabled: clipsContent, cornerRadius: cornerRadius))
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
        lookupTask?.cancel()
        lookupSession.invalidate()
        savedDonorPrompt = false
        pendingSavedDonor = nil
        dismissInlineInput()
        if enabled {
            let change = DonorCheckoutRules.turningAnonymousOn(donorDraft)
            donorSnapshotBeforeAnonymous = change.snapshot
            apply(change.visible)
        } else {
            apply(DonorCheckoutRules.turningAnonymousOff(snapshot: donorSnapshotBeforeAnonymous))
            donorSnapshotBeforeAnonymous = nil
        }
    }

    private func apply(_ draft: DonorCheckoutRules.Draft) {
        donorFirstName = draft.firstName
        donorLastName = draft.lastName
        donorPhone = draft.phoneDigits
        donorEmail = draft.email
        donorAddress = draft.address
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
    private func donorInputContainer(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        VStack(alignment: .leading, spacing: s(DesignSystem.Components.inlineSpacing)) {
            donorInfoHeading(geometry: geometry)
            donorInputFields(geometry: geometry)
                .coordinateSpace(name: "donorInputResting")
                .offset(y: -donorScrollOffset)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .background(
                    GeometryReader { proxy in
                        Color.clear.preference(
                            key: DonorViewportKey.self,
                            value: proxy.frame(in: .named("step3Screen"))
                        )
                    }
                )
                .clipped()
        }
    }

    @ViewBuilder
    private func donorInfoHeading(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        VStack(alignment: .center, spacing: s(6)) {
            Text("donorInfo".localized)
                .font(.custom("Georgia", size: s(28)))
                .foregroundColor(headingColor)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, s(8))
        .padding(.bottom, s(9))
    }

    @ViewBuilder
    private func donorInputFields(geometry: GeometryProxy) -> some View {
        let s = geometry.scale
        VStack(alignment: .leading, spacing: s(DesignSystem.Components.inlineSpacing)) {
            HStack(alignment: .top, spacing: s(12)) {
                inlineNameField(
                    geometry: geometry,
                    label: "firstName".localized,
                    icon: "person.fill",
                    placeholder: "enterYourFirstName".localized,
                    text: $donorFirstName,
                    field: .firstName,
                    contentType: .givenName,
                    error: shows(.firstNameRequired) ? "firstNameRequired".localized : nil
                )
                .frame(maxWidth: .infinity)
                .donorRestingFrame(.firstName)
                inlineNameField(
                    geometry: geometry,
                    label: "lastName".localized,
                    icon: "person.fill",
                    placeholder: "enterYourLastName".localized,
                    text: $donorLastName,
                    field: .lastName,
                    contentType: .familyName,
                    error: shows(.lastNameRequired) ? "lastNameRequired".localized : nil
                )
                .frame(maxWidth: .infinity)
                .donorRestingFrame(.lastName)
            }
            inlinePhoneField(geometry: geometry)
                .donorRestingFrame(.phone)
            if savedDonorPrompt && !anonymousSeva {
                savedDonorPromptCard(geometry: geometry)
            }
            inlineEmailField(geometry: geometry)
                .donorRestingFrame(.email)
            inlineAddressField(geometry: geometry)
                .donorRestingFrame(.address)
        }
    }

    @ViewBuilder
    private func donorDetailsCard(geometry: GeometryProxy, cardCorner: CGFloat) -> some View {
        creamGoldCard(geometry: geometry, cornerRadius: cardCorner, expandVerticalFill: true, clipsContent: true) {
            donorInputContainer(geometry: geometry)
                .opacity(anonymousSeva ? 0.45 : 1)
                .allowsHitTesting(!anonymousSeva)
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
            dismissInlineInput()
            showValidation = true
            guard checkoutIssues.isEmpty else { return }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            let submission = DonorCheckoutRules.submission(draft: donorDraft, anonymous: anonymousSeva)
            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                onConfirm(submission.name, submission.phone, submission.email, submission.address, submission.anonymous)
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
            .foregroundColor(headingColor)
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
        .allowsHitTesting(true)
    }
    
    var body: some View {
        // Match `DonationHomeView.body`: one GeometryReader + ignore safe area so Step 3 shares the same coordinate space as Step 2.
        GeometryReader { geometry in
            ZStack {
                DonorKeyboardFrameReader { frame, duration in
                    keyboardAnimationDuration = duration
                    keyboardFrame = frame
                    refreshDonorScroll(animated: true)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .allowsHitTesting(false)

                backgroundView(geometry: geometry)
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { dismissInlineInput() }
                
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
            .coordinateSpace(name: "step3Screen")
            .onPreferenceChange(DonorRestingFieldFramesKey.self) { frames in
                // The offset moves these frames while scrolling. Keep the resting measurement.
                guard abs(donorScrollOffset) < 1 else { return }
                donorRestingFieldFrames = frames
                refreshDonorScroll(animated: false)
            }
            .onPreferenceChange(DonorViewportKey.self) { viewport in
                donorViewport = viewport
                refreshDonorScroll(animated: false)
            }
        }
        .ignoresSafeArea(.all, edges: .all)
        .ignoresSafeArea(.keyboard, edges: .bottom)
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
            if initialAnonymousSeva {
                skipNextAnonymousSevaChangeHandler = true
                donorSnapshotBeforeAnonymous = nil
                donorFirstName = ""
                donorLastName = ""
                donorPhone = ""
                donorEmail = ""
                donorAddress = ""
                anonymousSeva = true
            } else {
                if let initialName = initialDonorName, !initialName.isEmpty {
                    let parts = DonorCheckoutRules.splitFullName(initialName)
                    donorFirstName = parts.first
                    donorLastName = parts.last
                }
                if let initialPhone = initialDonorPhone, !initialPhone.isEmpty {
                    donorPhone = DonorCheckoutRules.digits(from: initialPhone)
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
            #if DEBUG
            scheduleDebugKeyboardPreviewIfNeeded()
            #endif
        }
        .onDisappear {
            invalidateDonorSession()
        }
        .detectTouches()
        .onChange(of: donorFirstName) { _ in
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorLastName) { _ in
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorPhone) { newPhone in
            IdleTimer.shared.userDidInteract()
            let normalized = DonorCheckoutRules.digits(from: newPhone)
            if normalized != newPhone {
                donorPhone = normalized
                return
            }
            beginDonorLookupIfNeeded()
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
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorAddress) { newValue in
            IdleTimer.shared.userDidInteract()
            scheduleAddressSearch(newValue)
        }
        .onChange(of: inlineFocus) { newFocus in
            if newFocus != .address {
                addressSuggestions = []
            }
            refreshDonorScroll(animated: true)
        }
        .onChange(of: addressSuggestions.map(\.place_id).joined(separator: "|")) { _ in
            refreshDonorScroll(animated: true)
        }
        .onReceive(NotificationCenter.default.publisher(for: .idleTimeoutReached)) { _ in
            dismissInlineInput()
        }
    }

    #if DEBUG
    private func scheduleDebugKeyboardPreviewIfNeeded() {
        let arguments = ProcessInfo.processInfo.arguments
        guard arguments.contains("-previewStep3") else { return }
        if debugSeedSuggestions {
            donorAddress = "2101"
        }
        guard debugInitialFocus != .none || arguments.contains("-previewDismissKeyboard") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
            if debugSeedSuggestions {
                addressSuggestions = Self.debugAddressSuggestions
            }
            let target: DonorInlineFocus = arguments.contains("-previewDismissKeyboard") ? .email : debugInitialFocus
            if target != .none {
                focus(target)
            }
        }
        if arguments.contains("-previewDismissKeyboard") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.1) {
                dismissInlineInput()
            }
        }
    }

    private static var debugAddressSuggestions: [AddressPrediction] {
        [
            AddressPrediction(
                description: "2101 Garry Road, Cinnaminson, NJ, USA",
                place_id: "preview-garry",
                structured_formatting: StructuredFormatting(main_text: "2101 Garry Road", secondary_text: "Cinnaminson, NJ, USA")
            ),
            AddressPrediction(
                description: "2101 Market Street, Philadelphia, PA, USA",
                place_id: "preview-market",
                structured_formatting: StructuredFormatting(main_text: "2101 Market Street", secondary_text: "Philadelphia, PA, USA")
            )
        ]
    }
    #endif

    private func invalidateDonorSession() {
        lookupTask?.cancel()
        lookupTask = nil
        addressAutocompleteTask?.cancel()
        addressAutocompleteTask = nil
        lookupSession.invalidate()
        addressQueryGeneration += 1
        addressSuggestions = []
        savedDonorPrompt = false
        pendingSavedDonor = nil
        donorSnapshotBeforeAnonymous = nil
        dismissInlineInput()
    }

    private func beginDonorLookupIfNeeded() {
        let action = lookupSession.notePhone(donorPhone, anonymous: anonymousSeva)
        guard case .start(let phone, let generation) = action else { return }
        savedDonorPrompt = false
        pendingSavedDonor = nil
        lookupTask?.cancel()
        lookupTask = Task {
            let response: DonorLookupResponse?
            do {
                response = try await APIService.shared.lookupDonor(phone: phone)
            } catch {
                response = nil
                print("[DonationDetailsView] Failed to lookup donor: \(error.localizedDescription)")
            }
            guard !Task.isCancelled else { return }
            await MainActor.run {
                if response == nil {
                    if lookupSession.generation == generation && lookupSession.inFlightPhone == phone {
                        lookupSession.inFlightPhone = nil
                    }
                    return
                }
                let found = response?.found == true && response?.donor != nil
                switch lookupSession.receive(phone: phone, generation: generation, found: found) {
                case .prompt:
                    if let donor = response?.donor {
                        pendingSavedDonor = DonorCheckoutRules.SavedDonor(
                            name: donor.name,
                            email: donor.email,
                            address: donor.address
                        )
                        savedDonorPrompt = true
                    }
                case .notFound, .stale:
                    break
                }
            }
        }
    }

    private func scheduleAddressSearch(_ newValue: String) {
        if suppressNextAddressSearch {
            suppressNextAddressSearch = false
            addressSuggestions = []
            return
        }
        addressAutocompleteTask?.cancel()
        let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard inlineFocus == .address, trimmed.count >= 3 else {
            addressSuggestions = []
            return
        }
        addressQueryGeneration += 1
        let generation = addressQueryGeneration
        addressAutocompleteTask = Task {
            try? await Task.sleep(nanoseconds: DonorCheckoutRules.addressDebounceNanoseconds)
            guard !Task.isCancelled else { return }
            await searchAddresses(input: trimmed, generation: generation)
        }
    }
    
    private func searchAddresses(input: String, generation: Int) async {
        guard input.count >= 3 else {
            await MainActor.run {
                if DonorCheckoutRules.shouldAcceptAddressResponse(
                    generation: generation,
                    expected: addressQueryGeneration,
                    query: input,
                    current: donorAddress.trimmingCharacters(in: .whitespacesAndNewlines)
                ) {
                    addressSuggestions = []
                }
            }
            return
        }
        
        if addressSessionToken == nil {
            addressSessionToken = UUID().uuidString
        }
        
        do {
            let response = try await APIService.shared.autocompleteAddress(
                input: input,
                sessionToken: addressSessionToken
            )
            await MainActor.run {
                let current = donorAddress.trimmingCharacters(in: .whitespacesAndNewlines)
                guard DonorCheckoutRules.shouldAcceptAddressResponse(
                    generation: generation,
                    expected: addressQueryGeneration,
                    query: input,
                    current: current
                ), inlineFocus == .address, !anonymousSeva else { return }
                addressSuggestions = response.predictions
            }
        } catch {
            print("[DonationDetailsView] Failed to autocomplete address: \(error.localizedDescription)")
            await MainActor.run {
                if generation == addressQueryGeneration {
                    addressSuggestions = []
                }
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

// MARK: - US phone display: (215) 520-0565 (binding stores digits only)
private enum DonorUSPhoneFormatting {
    static func digitsOnly(_ string: String) -> String {
        DonorCheckoutRules.digits(from: string)
    }

    static func display(_ raw: String) -> String {
        DonorCheckoutRules.displayPhone(raw)
    }

    static func displayDigits(_ digits: String) -> String {
        DonorCheckoutRules.displayPhone(digits)
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
    var fieldRegistry: DonorFieldRegistry?
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
    /// Replaces the system keyboard. Used for the compact phone pad hosted by SwiftUI.
    var suppressSystemKeyboard: Bool = false
    /// When set with `accessoryTintUIColor`, the accessory uses kiosk styling instead of the default white/blue toolbar.
    var accessoryBackgroundUIColor: UIColor?
    var accessoryTintUIColor: UIColor?
    var accessoryDoneTitle: String = "Done"

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private var needsInputAccessoryToolbar: Bool {
        guard !suppressSystemKeyboard else { return false }
        return keyboardType == .phonePad || keyboardType == .emailAddress || addsDoneAccessoryBar
    }

    private var accessoryShowsNext: Bool {
        onAdvanceToNextField != nil && !suppressSystemKeyboard
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
        if suppressSystemKeyboard {
            let blank = UIView(frame: .zero)
            tf.inputView = blank
        }
        tf.text = isPhoneField ? DonorUSPhoneFormatting.displayDigits(text) : text
        fieldRegistry?.register(index: fieldIndex, responder: tf)
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
        fieldRegistry?.register(index: fieldIndex, responder: uiView)
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
        } else if !isFocused {
            context.coordinator.cancelPendingFocus()
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
            let item = DispatchWorkItem { [weak self, weak field] in
                guard let self, let field, field.window != nil, !field.isFirstResponder else { return }
                guard self.parent.isFocused else { return }
                field.becomeFirstResponder()
            }
            pendingFocusWorkItem = item
            DispatchQueue.main.async(execute: item)
        }

        func cancelPendingFocus() {
            pendingFocusWorkItem?.cancel()
            pendingFocusWorkItem = nil
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
    var fieldRegistry: DonorFieldRegistry?
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
        fieldRegistry?.register(index: fieldIndex, responder: tv)
        tv.inputAccessoryView = makeAccessoryToolbar(coordinator: context.coordinator)
        if autoFocusOnAppear {
            context.coordinator.scheduleBecomeFirstResponder(for: tv)
        }
        return tv
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.textView = uiView
        fieldRegistry?.register(index: fieldIndex, responder: uiView)
        uiView.font = UIFont(name: "Georgia", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize, weight: .regular)
        uiView.textColor = textUIColor
        if uiView.text != text {
            uiView.text = text
        }
        if isFocused, uiView.window != nil, !uiView.isFirstResponder {
            context.coordinator.scheduleBecomeFirstResponder(for: uiView)
        } else if !isFocused {
            context.coordinator.cancelPendingFocus()
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
            let item = DispatchWorkItem { [weak self, weak view] in
                guard let self, let view, view.window != nil, !view.isFirstResponder else { return }
                guard self.parent.isFocused else { return }
                view.becomeFirstResponder()
            }
            pendingFocusWorkItem = item
            DispatchQueue.main.async(execute: item)
        }

        func cancelPendingFocus() {
            pendingFocusWorkItem?.cancel()
            pendingFocusWorkItem = nil
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

/// Reports the keyboard rectangle in this view's coordinate space. A zero rect means the keyboard is hidden.
private struct DonorKeyboardFrameReader: UIViewRepresentable {
    var onChange: (CGRect, Double) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onChange: onChange)
    }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        if #available(iOS 17.0, *) {
            view.keyboardLayoutGuide.followsUndockedKeyboard = true
        }
        let tracker = UIView()
        tracker.isUserInteractionEnabled = false
        tracker.translatesAutoresizingMaskIntoConstraints = false
        tracker.tag = 7901
        view.addSubview(tracker)
        NSLayoutConstraint.activate([
            tracker.topAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
            tracker.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.bottomAnchor),
            tracker.leadingAnchor.constraint(equalTo: view.keyboardLayoutGuide.leadingAnchor),
            tracker.trailingAnchor.constraint(equalTo: view.keyboardLayoutGuide.trailingAnchor)
        ])
        context.coordinator.host = view
        context.coordinator.tracker = tracker
        context.coordinator.start()
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.host = uiView
        context.coordinator.onChange = onChange
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.stop()
    }

    final class Coordinator {
        weak var host: UIView?
        weak var tracker: UIView?
        var onChange: (CGRect, Double) -> Void
        private var tokens: [NSObjectProtocol] = []
        private var lastReported: CGRect?

        init(onChange: @escaping (CGRect, Double) -> Void) {
            self.onChange = onChange
        }

        func start() {
            guard tokens.isEmpty else { return }
            let names = [
                UIResponder.keyboardWillShowNotification,
                UIResponder.keyboardWillChangeFrameNotification,
                UIResponder.keyboardWillHideNotification
            ]
            for name in names {
                tokens.append(
                    NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] note in
                        self?.handle(note)
                    }
                )
            }
        }

        func stop() {
            tokens.forEach { NotificationCenter.default.removeObserver($0) }
            tokens.removeAll()
        }

        private func handle(_ note: Notification) {
            let duration = (note.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0.25
            if note.name == UIResponder.keyboardWillHideNotification {
                publish(.zero, duration)
                return
            }
            guard
                let host,
                host.window != nil,
                let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
            else { return }
            // iPad emits a zero-height frame while the keyboard scene is updating.
            // Converting that rect logs "Conversion error" and can detach the keyboard.
            guard frame.width > 1, frame.height > 1 else { return }
            let local = host.convert(frame, from: nil)
            guard local.width > 1, local.height > 1 else { return }
            let containerHeight = host.bounds.height > 1
                ? host.bounds.height
                : (host.window?.bounds.height ?? UIScreen.main.bounds.height)
            let hidden = local.minY >= containerHeight - 1
            let guide = guideFrame()
            publish(guide.height > local.height + 20 ? guide : local, duration)
        }

        private func guideFrame() -> CGRect {
            guard let host, let tracker else { return .zero }
            host.layoutIfNeeded()
            let frame = tracker.frame
            guard frame.width > 20, frame.height > 20 else { return .zero }
            return host.convert(frame, from: tracker.superview)
        }

        private func publish(_ rect: CGRect, _ duration: Double) {
            if let lastReported, rect.nearlyEquals(lastReported) { return }
            lastReported = rect
            onChange(rect, duration)
        }
    }
}

private extension CGRect {
    func nearlyEquals(_ other: CGRect) -> Bool {
        abs(minX - other.minX) < 4
            && abs(minY - other.minY) < 4
            && abs(width - other.width) < 4
            && abs(height - other.height) < 4
    }
}

private struct DonorRestingFieldFramesKey: PreferenceKey {
    static var defaultValue: [DonorInlineFocus: CGRect] = [:]
    static func reduce(value: inout [DonorInlineFocus: CGRect], nextValue: () -> [DonorInlineFocus: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

private struct DonorViewportKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        let next = nextValue()
        if next.width > 1, next.height > 1 { value = next }
    }
}

private struct DonorCardClip: ViewModifier {
    var enabled: Bool
    var cornerRadius: CGFloat

    func body(content: Content) -> some View {
        if enabled {
            content.clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        } else {
            content
        }
    }
}

private extension View {
    func donorRestingFrame(_ field: DonorInlineFocus) -> some View {
        background(
            GeometryReader { proxy in
                Color.clear.preference(
                    key: DonorRestingFieldFramesKey.self,
                    value: [field: proxy.frame(in: .named("donorInputResting"))]
                )
            }
        )
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
