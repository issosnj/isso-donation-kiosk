import SwiftUI

struct AddressKeypadView: View {
    @Binding var address: String
    let onDismiss: () -> Void
    @State private var enteredAddress: String = ""
    @State private var addressSuggestions: [AddressPrediction] = []
    @State private var showAddressSuggestions: Bool = false
    @State private var isSearchingAddresses: Bool = false
    @State private var addressSessionToken: String? = nil
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            // Semi-transparent background overlay
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            // Single smooth popup - wider and more appealing
            ScrollView {
                VStack(spacing: 0) {
                    // Header with Cancel button
                    HStack {
                        Button(action: {
                            onDismiss()
                        }) {
                            Text("Cancel")
                                .font(.custom("Inter-Medium", size: 16))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        }
                        
                    Spacer()
                    
                    Text("Mailing Address")
                        .font(.custom("Inter-SemiBold", size: 24))
                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                    
                    Spacer()
                        
                        // Invisible spacer to balance Cancel button
                        Text("Cancel")
                            .font(.custom("Inter-Medium", size: 16))
                            .foregroundColor(.clear)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                    }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 16)
                
                // Address input display with suggestions
                VStack(alignment: .leading, spacing: 0) {
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
                        
                        // Address suggestions dropdown - positioned below without layout shift
                        if showAddressSuggestions && !addressSuggestions.isEmpty {
                            VStack(spacing: 0) {
                                ForEach(addressSuggestions.prefix(5)) { suggestion in
                                    Button(action: {
                                        Task {
                                            await selectAddress(suggestion: suggestion)
                                        }
                                    }) {
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
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 12)
                                        .background(Color.white)
                                    }
                                    
                                    if suggestion.id != addressSuggestions.prefix(5).last?.id {
                                        Divider()
                                            .padding(.horizontal, 16)
                                    }
                                }
                            }
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                            .padding(.horizontal, 32)
                            .padding(.top, 8)
                            .fixedSize(horizontal: false, vertical: false)
                        }
                    }
                    .padding(.bottom, 16)
                    
                    // Text keypad with numbers
                    VStack(spacing: 12) {
                        // Numbers row
                        HStack(spacing: 12) {
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
                        
                        HStack(spacing: 12) {
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
                        HStack(spacing: 12) {
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
                        HStack(spacing: 12) {
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
                        HStack(spacing: 12) {
                            // Space button
                            Button(action: {
                                enteredAddress += " "
                            }) {
                                        Text("Space")
                                            .font(.custom("Inter-Medium", size: 16))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                            }
                            .frame(maxWidth: .infinity)
                            
                            // Backspace button
                            Button(action: {
                                if !enteredAddress.isEmpty {
                                    enteredAddress.removeLast()
                                }
                            }) {
                                        Image(systemName: "delete.left.fill")
                                            .font(.system(size: 20, weight: .semibold))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 16)
                    
                    // Continue button - matching Proceed to Payment style
                    // Continue button - using theme properties
                    Button(action: {
                        address = enteredAddress
                        onDismiss()
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
                .frame(maxWidth: 900) // Wider popup
                .padding(.vertical, 16)
            }
            .frame(maxWidth: 900)
            .background(Color.white)
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.25), radius: 30, x: 0, y: 15)
        }
        .onAppear {
            enteredAddress = address
            // Hide system keyboard when view appears
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
        .onChange(of: enteredAddress) { newValue in
            // Trigger address search when user types
            Task {
                await searchAddresses(input: newValue)
            }
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
