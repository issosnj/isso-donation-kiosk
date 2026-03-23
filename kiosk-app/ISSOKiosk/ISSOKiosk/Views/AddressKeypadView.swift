import SwiftUI
import UIKit

struct AddressKeypadView: View {
    @Binding var address: String
    let onDismiss: () -> Void
    @State private var enteredAddress: String = ""
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var showAddressSuggestions: Bool = false
    @State private var isSearchingAddresses: Bool = false
    @State private var addressSessionToken: String? = nil
    @State private var isVisible = false
    @State private var isDismissing = false
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            Color.black.opacity(DesignSystem.Components.modalOverlayOpacity)
                .ignoresSafeArea()
                .opacity(isVisible && !isDismissing ? 1 : 0)
                .animation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration), value: isVisible)
                .onTapGesture { dismissWithAnimation { onDismiss() } }

            ScrollView {
                VStack(spacing: 0) {
                    HStack {
                        Button(action: { dismissWithAnimation { onDismiss() } }) {
                            Text("Cancel")
                                .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                .padding(.horizontal, DesignSystem.Spacing.md)
                                .padding(.vertical, DesignSystem.Spacing.sm)
                        }
                        Spacer()
                        Text("Mailing Address")
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
                
                // Address input display with suggestions
                VStack(alignment: .leading, spacing: 12) {
                    // Address input display
                    Text(enteredAddress.isEmpty ? "Enter your mailing address" : enteredAddress)
                        .font(.custom("Inter-SemiBold", size: 28))
                        .foregroundColor(enteredAddress.isEmpty ? Color(red: 0.7, green: 0.7, blue: 0.7) : Color(red: 0.26, green: 0.20, blue: 0.20))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(3)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 18)
                        .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                        .padding(.horizontal, 32)
                    
                    // Address suggestions - shown below input field
                    if showAddressSuggestions && !addressSuggestions.isEmpty {
                        VStack(spacing: 0) {
                            ForEach(addressSuggestions.prefix(5)) { suggestion in
                                Button(action: {
                                    Task {
                                        await selectAddress(suggestion: suggestion)
                                    }
                                }) {
                                    HStack(alignment: .top, spacing: 12) {
                                        Image(systemName: "mappin.circle.fill")
                                            .font(.system(size: 20))
                                            .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                            .padding(.top, 2)
                                        
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(suggestion.structured_formatting.main_text)
                                                .font(.custom("Inter-Medium", size: 16))
                                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                                .lineLimit(2)
                                                .fixedSize(horizontal: false, vertical: true)
                                            Text(suggestion.structured_formatting.secondary_text)
                                                .font(.custom("Inter-Regular", size: 14))
                                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                                .lineLimit(2)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.white)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                if suggestion.id != addressSuggestions.prefix(5).last?.id {
                                    Divider()
                                        .padding(.horizontal, 16)
                                }
                            }
                        }
                        .frame(maxHeight: 300)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.2), radius: 12, x: 0, y: 6)
                        .padding(.horizontal, 32)
                    }
                }
                .padding(.bottom, 16)
                
                VStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                        TextKeypadButton(character: "1", enteredText: $enteredAddress)
                        TextKeypadButton(character: "2", enteredText: $enteredAddress)
                        TextKeypadButton(character: "3", enteredText: $enteredAddress)
                        TextKeypadButton(character: "4", enteredText: $enteredAddress)
                        TextKeypadButton(character: "5", enteredText: $enteredAddress)
                        TextKeypadButton(character: "6", enteredText: $enteredAddress)
                        TextKeypadButton(character: "7", enteredText: $enteredAddress)
                        TextKeypadButton(character: "8", enteredText: $enteredAddress)
                        TextKeypadButton(character: "9", enteredText: $enteredAddress)
                        TextKeypadButton(character: "0", enteredText: $enteredAddress)
                    }
                    HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                        TextKeypadButton(character: "Q", enteredText: $enteredAddress)
                        TextKeypadButton(character: "W", enteredText: $enteredAddress)
                        TextKeypadButton(character: "E", enteredText: $enteredAddress)
                        TextKeypadButton(character: "R", enteredText: $enteredAddress)
                        TextKeypadButton(character: "T", enteredText: $enteredAddress)
                        TextKeypadButton(character: "Y", enteredText: $enteredAddress)
                        TextKeypadButton(character: "U", enteredText: $enteredAddress)
                        TextKeypadButton(character: "I", enteredText: $enteredAddress)
                        TextKeypadButton(character: "O", enteredText: $enteredAddress)
                        TextKeypadButton(character: "P", enteredText: $enteredAddress)
                    }
                    HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                        TextKeypadButton(character: "A", enteredText: $enteredAddress)
                        TextKeypadButton(character: "S", enteredText: $enteredAddress)
                        TextKeypadButton(character: "D", enteredText: $enteredAddress)
                        TextKeypadButton(character: "F", enteredText: $enteredAddress)
                        TextKeypadButton(character: "G", enteredText: $enteredAddress)
                        TextKeypadButton(character: "H", enteredText: $enteredAddress)
                        TextKeypadButton(character: "J", enteredText: $enteredAddress)
                        TextKeypadButton(character: "K", enteredText: $enteredAddress)
                        TextKeypadButton(character: "L", enteredText: $enteredAddress)
                    }
                    HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                        TextKeypadButton(character: "Z", enteredText: $enteredAddress)
                        TextKeypadButton(character: "X", enteredText: $enteredAddress)
                        TextKeypadButton(character: "C", enteredText: $enteredAddress)
                        TextKeypadButton(character: "V", enteredText: $enteredAddress)
                        TextKeypadButton(character: "B", enteredText: $enteredAddress)
                        TextKeypadButton(character: "N", enteredText: $enteredAddress)
                        TextKeypadButton(character: "M", enteredText: $enteredAddress)
                        TextKeypadButton(character: ".", enteredText: $enteredAddress)
                        TextKeypadButton(character: ",", enteredText: $enteredAddress)
                    }
                    HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                        KeyboardKeyButton(primaryLabel: "Space", action: { enteredAddress += " " })
                            .frame(maxWidth: .infinity)
                        KeyboardKeyButton(systemImage: "delete.left.fill", action: {
                            if !enteredAddress.isEmpty { enteredAddress.removeLast() }
                        })
                    }
                }
                .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
                .padding(.bottom, 16)
                
                Button(action: {
                    address = enteredAddress
                    dismissWithAnimation { onDismiss() }
                }) {
                    HStack(spacing: 12) {
                        Text("Continue")
                            .font(.custom("Inter-Medium", size: 20))
                            .foregroundColor(.white)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        Group {
                            let buttonColor = colorFromHex(
                                appState.temple?.kioskTheme?.colors?.continueButtonColor,
                                defaultColor: Color(red: 0.85, green: 0.75, blue: 0.5)
                            )
                            if appState.temple?.kioskTheme?.colors?.continueButtonGradient == true {
                                gradientFromColor(buttonColor)
                            } else {
                                buttonColor
                            }
                        }
                    )
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
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
            enteredAddress = address
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration)) {
                isVisible = true
            }
        }
        .onChange(of: enteredAddress) { newValue in
            Task {
                await searchAddresses(input: newValue)
            }
        }
    }

    private func dismissWithAnimation(completion: (() -> Void)? = nil) {
        guard !isDismissing else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeOut(duration: DesignSystem.Components.modalAnimationDuration * 0.85)) {
            isDismissing = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + DesignSystem.Components.modalAnimationDuration * 0.9) {
            completion?()
        }
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
    
    // Helper to create a gradient from a color
    private func gradientFromColor(_ color: Color) -> LinearGradient {
        let uiColor = UIColor(color)
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        
        let lighterColor = Color(
            red: min(1.0, Double(r) * 1.15),
            green: min(1.0, Double(g) * 1.15),
            blue: min(1.0, Double(b) * 1.15)
        )
        return LinearGradient(
            gradient: Gradient(colors: [color, lighterColor]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private func searchAddresses(input: String) async {
        guard input.count >= 3 else {
            await MainActor.run {
                addressSuggestions = []
                showAddressSuggestions = false
            }
            return
        }
        
        // Generate session token if not exists
        if addressSessionToken == nil {
            addressSessionToken = UUID().uuidString
        }
        
        await MainActor.run {
            isSearchingAddresses = true
        }
        
        do {
            let response = try await APIService.shared.autocompleteAddress(
                input: input,
                sessionToken: addressSessionToken
            )
            await MainActor.run {
                addressSuggestions = response.predictions
                showAddressSuggestions = !response.predictions.isEmpty
                isSearchingAddresses = false
            }
        } catch {
            // Silently fail - don't show error for autocomplete failures
            print("[AddressKeypadView] Failed to autocomplete address: \(error.localizedDescription)")
            await MainActor.run {
                addressSuggestions = []
                showAddressSuggestions = false
                isSearchingAddresses = false
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
                    enteredAddress = formattedAddress
                } else {
                    enteredAddress = suggestion.description
                }
                showAddressSuggestions = false
                addressSuggestions = []
                // Reset session token after selection
                addressSessionToken = nil
            }
        } catch {
            // Fallback to description if details fail
            await MainActor.run {
                enteredAddress = suggestion.description
                showAddressSuggestions = false
                addressSuggestions = []
                addressSessionToken = nil
            }
            print("[AddressKeypadView] Failed to get place details: \(error.localizedDescription)")
        }
    }
}
