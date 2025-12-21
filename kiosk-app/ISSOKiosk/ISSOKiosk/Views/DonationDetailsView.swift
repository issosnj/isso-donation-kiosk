import SwiftUI

struct ModernDonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    
    @State private var donorName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var donorAddress = ""
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @FocusState private var nameFocused: Bool
    @FocusState private var phoneFocused: Bool
    @FocusState private var emailFocused: Bool
    @FocusState private var addressFocused: Bool
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    // If category is selected, name and phone are required
    private var isNameRequired: Bool {
        category != nil
    }
    
    private var isPhoneRequired: Bool {
        category != nil
    }
    
    private var canProceed: Bool {
        if category != nil {
            // For category donations, name and phone are required
            return !donorName.trimmingCharacters(in: .whitespaces).isEmpty &&
                   !donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
        } else {
            // For preset amounts, all fields are optional
            return true
        }
    }
    
    // Theme layout helpers
    private var theme: KioskTheme? {
        appState.temple?.kioskTheme
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
        CGFloat(theme?.layout?.detailsPageHorizontalSpacing ?? 40)
    }
    
    private var detailsPageSidePadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageSidePadding ?? 60)
    }
    
    private var detailsPageTopPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageTopPadding ?? 80)
    }
    
    private var detailsPageBottomPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageBottomPadding ?? 40)
    }
    
    private var detailsCardMaxWidth: CGFloat {
        CGFloat(theme?.layout?.detailsCardMaxWidth ?? 420)
    }
    
    private var donorFormMaxWidth: CGFloat {
        CGFloat(theme?.layout?.donorFormMaxWidth ?? 420)
    }
    
    private var detailsCardPadding: CGFloat {
        CGFloat(theme?.layout?.detailsCardPadding ?? 24)
    }
    
    private var detailsCardSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsCardSpacing ?? 16)
    }
    
    // Font sizes
    private var detailsAmountFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsAmountFontSize ?? 56)
    }
    
    private var detailsLabelFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsLabelFontSize ?? 18)
    }
    
    private var detailsInputFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsInputFontSize ?? 18)
    }
    
    private var detailsButtonFontSize: CGFloat {
        CGFloat(theme?.layout?.detailsButtonFontSize ?? 22)
    }
    
    // Colors
    private var detailsAmountColor: Color {
        colorFromHex(theme?.layout?.detailsAmountColor, defaultColor: Color(red: 0.26, green: 0.20, blue: 0.20))
    }
    
    private var detailsTextColor: Color {
        colorFromHex(theme?.layout?.detailsTextColor, defaultColor: Color(red: 0.26, green: 0.20, blue: 0.20))
    }
    
    private var detailsInputBorderColor: Color {
        colorFromHex(theme?.layout?.detailsInputBorderColor, defaultColor: Color.gray.opacity(0.2))
    }
    
    private var detailsInputFocusColor: Color {
        colorFromHex(theme?.layout?.detailsInputFocusColor, defaultColor: Color(red: 0.2, green: 0.4, blue: 0.8))
    }
    
    private var detailsButtonColor: Color {
        colorFromHex(theme?.layout?.detailsButtonColor, defaultColor: Color(red: 0.2, green: 0.4, blue: 0.8))
    }
    
    private var detailsButtonTextColor: Color {
        colorFromHex(theme?.layout?.detailsButtonTextColor, defaultColor: Color.white)
    }
    
    var body: some View {
        ZStack {
            // Background: Use same background as donation page
            // Background is fixed and doesn't stretch with content width
            GeometryReader { geometry in
                if let backgroundImage = appState.backgroundImage {
                    Image(uiImage: backgroundImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                } else if let backgroundUrl = appState.temple?.homeScreenConfig?.backgroundImageUrl,
                   let url = URL(string: backgroundUrl) {
                    ZStack {
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white,
                                Color(red: 0.95, green: 0.97, blue: 1.0)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .empty:
                                Color.clear
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: geometry.size.width, height: geometry.size.height)
                                    .clipped()
                            case .failure:
                                Color.clear
                            @unknown default:
                                Color.clear
                            }
                        }
                    }
                } else {
                    // Default gradient background
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
            .ignoresSafeArea(.all, edges: .all)
            
            // No dark overlay - clean background
            
            VStack(spacing: 0) {
                // Top spacing
                Spacer()
                    .frame(height: detailsPageTopPadding)
                
                // Main content: Left (Review Donation) and Right (Optional Information)
                HStack(alignment: .top, spacing: detailsPageHorizontalSpacing) {
                    // LEFT SIDE: Review Donation Panel
                    VStack(alignment: .leading, spacing: 0) {
                        // Panel Title
                        Text("Review Donation")
                            .font(.custom("Inter-SemiBold", size: 24))
                            .foregroundColor(detailsTextColor)
                            .padding(.bottom, 24)
                        
                        // Large amount display
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.custom("Inter-SemiBold", size: detailsAmountFontSize))
                            .foregroundColor(detailsAmountColor)
                            .padding(.bottom, 32)
                        
                        // Donation breakdown
                        VStack(alignment: .leading, spacing: 16) {
                            // Category name if selected
                            if let category = category {
                                HStack {
                                    Text(category.name)
                                        .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                        .foregroundColor(detailsTextColor)
                                    Spacer()
                                    Text("$\(String(format: "%.2f", amount))")
                                        .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                        .foregroundColor(detailsTextColor)
                                }
                            }
                            
                            // Donation line
                            HStack {
                                Text("Donation")
                                    .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                    .foregroundColor(detailsTextColor)
                                Spacer()
                                Text("$\(String(format: "%.2f", amount))")
                                    .font(.custom("Inter-Regular", size: detailsLabelFontSize))
                                    .foregroundColor(detailsTextColor)
                            }
                            
                            // Divider
                            Divider()
                                .background(Color.gray.opacity(0.3))
                                .padding(.vertical, 8)
                            
                            // Total
                            HStack {
                                Text("Total")
                                    .font(.custom("Inter-SemiBold", size: detailsLabelFontSize + 2))
                                    .foregroundColor(detailsTextColor)
                                Spacer()
                                Text("$\(String(format: "%.2f", amount))")
                                    .font(.custom("Inter-SemiBold", size: detailsLabelFontSize + 2))
                                    .foregroundColor(detailsTextColor)
                            }
                        }
                        .padding(.bottom, 24)
                        
                        // Change Amount link
                        Button(action: {
                            dismiss()
                        }) {
                            HStack(spacing: 4) {
                                Text("Change Amount")
                                    .font(.custom("Inter-Medium", size: 16))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            }
                        }
                        .padding(.bottom, 32)
                        
                        Spacer()
                        
                        // Payment methods illustration
                        HStack(spacing: 12) {
                            // Credit cards stack
                            ZStack(alignment: .leading) {
                                // Card 3 (back)
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 60, height: 38)
                                    .offset(x: 8, y: 4)
                                
                                // Card 2 (middle)
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [Color.gray.opacity(0.4), Color.gray.opacity(0.3)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 60, height: 38)
                                    .offset(x: 4, y: 2)
                                
                                // Card 1 (front - gold)
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.85, green: 0.75, blue: 0.5),
                                            Color(red: 0.95, green: 0.85, blue: 0.6)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 60, height: 38)
                            }
                            
                            // Coins stack
                            ZStack(alignment: .bottom) {
                                // Coin 3 (back)
                                Circle()
                                    .fill(Color(red: 0.85, green: 0.75, blue: 0.5).opacity(0.6))
                                    .frame(width: 24, height: 24)
                                    .offset(y: 4)
                                
                                // Coin 2 (middle)
                                Circle()
                                    .fill(Color(red: 0.85, green: 0.75, blue: 0.5).opacity(0.8))
                                    .frame(width: 24, height: 24)
                                    .offset(y: 2)
                                
                                // Coin 1 (front)
                                Circle()
                                    .fill(LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.95, green: 0.85, blue: 0.6),
                                            Color(red: 0.85, green: 0.75, blue: 0.5)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ))
                                    .frame(width: 24, height: 24)
                            }
                        }
                    }
                    .frame(width: detailsCardMaxWidth, alignment: .leading)
                    .padding(detailsCardPadding)
                    .background(
                        // Glass effect background
                        ZStack {
                            // Blur effect
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.25))
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(.ultraThinMaterial)
                                )
                        }
                    )
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    .padding(.leading, detailsPageSidePadding)
                    
                    // RIGHT SIDE: Optional Information Panel
                    VStack(alignment: .leading, spacing: 0) {
                        // Panel Title
                        Text("Optional Information")
                            .font(.custom("Inter-SemiBold", size: 24))
                            .foregroundColor(detailsTextColor)
                            .padding(.bottom, 24)
                        
                        VStack(alignment: .leading, spacing: 20) {
                            // Name field with icon
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Name (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 18))
                                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                        .frame(width: 24)
                                    
                                    TextField("Enter your name", text: $donorName)
                                        .focused($nameFocused)
                                        .font(.custom("Inter-Regular", size: detailsInputFontSize))
                                        .foregroundColor(detailsTextColor)
                                }
                                .padding(16)
                                .background(Color.white.opacity(0.6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            nameFocused 
                                                ? detailsInputFocusColor
                                                : (category != nil && donorName.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.white.opacity(0.3)),
                                            lineWidth: nameFocused ? 2 : 1
                                        )
                                )
                            }
                            
                            // Phone field with icon
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Phone (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "phone.fill")
                                        .font(.system(size: 18))
                                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                        .frame(width: 24)
                                    
                                    TextField("Enter your phone number", text: $donorPhone)
                                        .focused($phoneFocused)
                                        .keyboardType(.phonePad)
                                        .font(.custom("Inter-Regular", size: detailsInputFontSize))
                                        .foregroundColor(detailsTextColor)
                                }
                                .padding(16)
                                .background(Color.white.opacity(0.6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            phoneFocused 
                                                ? detailsInputFocusColor
                                                : (category != nil && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.white.opacity(0.3)),
                                            lineWidth: phoneFocused ? 2 : 1
                                        )
                                )
                            }
                            
                            // Email field with icon
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email for Receipt (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "envelope.fill")
                                        .font(.system(size: 18))
                                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                        .frame(width: 24)
                                    
                                    TextField("Enter your email", text: $donorEmail)
                                        .focused($emailFocused)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .font(.custom("Inter-Regular", size: detailsInputFontSize))
                                        .foregroundColor(detailsTextColor)
                                }
                                .padding(16)
                                .background(Color.white.opacity(0.6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            emailFocused 
                                                ? detailsInputFocusColor
                                                : Color.white.opacity(0.3),
                                            lineWidth: emailFocused ? 2 : 1
                                        )
                                )
                            }
                            
                            // Address field with icon
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Mailing Address (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "map.fill")
                                        .font(.system(size: 18))
                                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                        .frame(width: 24)
                                    
                                    TextField("Enter your mailing address", text: $donorAddress)
                                        .focused($addressFocused)
                                        .font(.custom("Inter-Regular", size: detailsInputFontSize))
                                        .foregroundColor(detailsTextColor)
                                }
                                .padding(16)
                                .background(Color.white.opacity(0.6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            addressFocused 
                                                ? detailsInputFocusColor
                                                : Color.white.opacity(0.3),
                                            lineWidth: addressFocused ? 2 : 1
                                        )
                                )
                            }
                        }
                        .padding(.bottom, 32)
                        
                        Spacer()
                        
                        // Proceed to Payment button
                        Button(action: {
                            withAnimation {
                                onConfirm(
                                    donorName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorName.trimmingCharacters(in: .whitespaces),
                                    donorPhone.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorPhone.trimmingCharacters(in: .whitespaces),
                                    donorEmail.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorEmail.trimmingCharacters(in: .whitespaces),
                                    donorAddress.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorAddress.trimmingCharacters(in: .whitespaces)
                                )
                            }
                        }) {
                            HStack(spacing: 12) {
                                Text("Proceed to Payment")
                                    .font(.custom("Inter-Medium", size: detailsButtonFontSize))
                                    .foregroundColor(canProceed ? Color.white : Color.gray)
                                Image(systemName: "arrow.right")
                                    .font(.system(size: detailsButtonFontSize - 4, weight: .semibold))
                                    .foregroundColor(canProceed ? Color.white : Color.gray)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                            .background(
                                canProceed 
                                    ? LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.85, green: 0.75, blue: 0.5),
                                            Color(red: 0.95, green: 0.85, blue: 0.6)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                    : LinearGradient(
                                        gradient: Gradient(colors: [Color.gray.opacity(0.5), Color.gray.opacity(0.3)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                            )
                            .cornerRadius(12)
                            .shadow(color: canProceed ? Color.black.opacity(0.2) : Color.clear, radius: 8, x: 0, y: 4)
                        }
                        .disabled(!canProceed)
                    }
                    .frame(width: donorFormMaxWidth)
                    .padding(detailsCardPadding)
                    .background(
                        // Glass effect background
                        ZStack {
                            // Blur effect
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.25))
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(.ultraThinMaterial)
                                )
                        }
                    )
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    .padding(.trailing, detailsPageSidePadding)
                    
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 0)
                    
                    // Bottom spacing
                    Spacer()
                        .frame(height: detailsPageBottomPadding)
                }
            }
            .onTapGesture {
                // Dismiss keyboard when tapping background
                nameFocused = false
                phoneFocused = false
                emailFocused = false
            }
            
            // Cancel button (top left)
            VStack {
                HStack {
                    Button(action: {
                        withAnimation {
                        dismiss()
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "xmark")
                            Text("Cancel")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                        .cornerRadius(10)
                    }
                    .padding()
                    Spacer()
                }
                Spacer()
            }
            
            // Time and Network Status in top right
            VStack {
                HStack {
                    Spacer()
                    TimeAndNetworkStatusView()
                        .padding(.trailing, 20)
                        .padding(.top, 17)
                }
                Spacer()
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
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.1)) {
                appearAnimation = true
            }
        }
        .detectTouches() // Detect all user interactions to reset idle timer
        .onChange(of: donorName) { _ in
            // User is typing in name field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorPhone) { _ in
            // User is typing in phone field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorEmail) { _ in
            // User is typing in email field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
        .onChange(of: donorAddress) { _ in
            // User is typing in address field - reset idle timer
            IdleTimer.shared.userDidInteract()
        }
    }
}

// Keep old view for compatibility
struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?, String?) -> Void // name, phone, email, address
    
    var body: some View {
        ModernDonationDetailsView(amount: amount, category: category, onConfirm: onConfirm)
    }
}
