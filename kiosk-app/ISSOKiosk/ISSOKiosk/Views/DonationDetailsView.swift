import SwiftUI

struct ModernDonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?) -> Void // name, phone, email
    
    @State private var donorName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var appearAnimation = false
    @State private var showingYajmanOpportunities = false
    @FocusState private var nameFocused: Bool
    @FocusState private var phoneFocused: Bool
    @FocusState private var emailFocused: Bool
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
    
    private var detailsPageHorizontalSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsPageHorizontalSpacing ?? 20)
    }
    
    private var detailsPageSidePadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageSidePadding ?? 40)
    }
    
    private var detailsPageTopPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageTopPadding ?? 60)
    }
    
    private var detailsPageBottomPadding: CGFloat {
        CGFloat(theme?.layout?.detailsPageBottomPadding ?? 40)
    }
    
    private var detailsCardMaxWidth: CGFloat {
        CGFloat(theme?.layout?.detailsCardMaxWidth ?? 350)
    }
    
    private var donorFormMaxWidth: CGFloat {
        CGFloat(theme?.layout?.donorFormMaxWidth ?? 350)
    }
    
    private var detailsCardPadding: CGFloat {
        CGFloat(theme?.layout?.detailsCardPadding ?? 20)
    }
    
    private var detailsCardSpacing: CGFloat {
        CGFloat(theme?.layout?.detailsCardSpacing ?? 12)
    }
    
    var body: some View {
        ZStack {
            // Background: Use same background as donation page
            if let backgroundImage = appState.backgroundImage {
                Image(uiImage: backgroundImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .ignoresSafeArea(.all, edges: .all)
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
                        case .failure:
                            Color.clear
                        @unknown default:
                            Color.clear
                        }
                    }
                }
                .ignoresSafeArea(.all, edges: .all)
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
                .ignoresSafeArea(.all, edges: .all)
            }
            
            // No dark overlay - clean background
            
            VStack(spacing: 0) {
                // Top spacing
                Spacer()
                    .frame(height: detailsPageTopPadding)
                
                // Main content: Left (Donation Details) and Right (Donor Info)
                HStack(alignment: .top, spacing: detailsPageHorizontalSpacing) {
                    // LEFT SIDE: Donation Details
                    VStack(alignment: .leading, spacing: 20) {
                        // Large amount display
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.custom("Inter-SemiBold", size: 56))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        // Donation summary card
                        VStack(alignment: .leading, spacing: detailsCardSpacing) {
                            HStack {
                                Text("Donation")
                                    .font(.custom("Inter-Regular", size: 18))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                Spacer()
                                Text("$\(String(format: "%.2f", amount))")
                                    .font(.custom("Inter-Regular", size: 18))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            }
                            
                            if let category = category {
                                Divider()
                                    .background(Color.gray.opacity(0.3))
                                
                                HStack {
                                    Text("Category")
                                        .font(.custom("Inter-Regular", size: 18))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                    Spacer()
                                    Text(category.name)
                                        .font(.custom("Inter-Regular", size: 18))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                }
                                
                                // View Benefits button if category has yajman opportunities
                                // Debug: Check if opportunities exist
                                let hasOpportunities = category.yajmanOpportunities != nil && !(category.yajmanOpportunities?.isEmpty ?? true)
                                if hasOpportunities {
                                    Divider()
                                        .background(Color.gray.opacity(0.3))
                                    
                                    Button(action: {
                                        print("[DonationDetailsView] ✅ View Benefits clicked for category: \(category.name)")
                                        print("[DonationDetailsView] ✅ Opportunities count: \(category.yajmanOpportunities?.count ?? 0)")
                                        showingYajmanOpportunities = true
                                    }) {
                                        HStack(spacing: 8) {
                                            Image(systemName: "star.fill")
                                                .font(.system(size: 16))
                                                .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                                            Text("View Benefits")
                                                .font(.custom("Inter-Medium", size: 16))
                                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.15))
                                        .cornerRadius(10)
                                    }
                                } else {
                                    // Debug: Log why button isn't showing
                                    let _ = print("[DonationDetailsView] ⚠️ Category '\(category.name)' has no yajman opportunities")
                                    let _ = print("[DonationDetailsView] ⚠️ yajmanOpportunities value: \(category.yajmanOpportunities?.debugDescription ?? "nil")")
                                }
                            }
                            
                            Divider()
                                .background(Color.gray.opacity(0.3))
                            
                            HStack {
                                Text("Total")
                                    .font(.custom("Inter-SemiBold", size: 20))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                Spacer()
                                Text("$\(String(format: "%.2f", amount))")
                                    .font(.custom("Inter-SemiBold", size: 20))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            }
                        }
                        .padding(detailsCardPadding)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 2)
                        .frame(maxWidth: detailsCardMaxWidth)
                    }
                    .frame(maxWidth: detailsCardMaxWidth, alignment: .leading)
                    .padding(.leading, detailsPageSidePadding)
                    
                    // RIGHT SIDE: Donor Information
                    VStack(alignment: .leading, spacing: 16) {
                        Text(category != nil ? "Donor Information" : "Optional Information")
                            .font(.custom("Inter-SemiBold", size: 20))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        // Name field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(category != nil ? "Name * Required" : "Name (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            }
                            TextField("Enter your name", text: $donorName)
                                .focused($nameFocused)
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            nameFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : (category != nil && donorName.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.gray.opacity(0.2)),
                                            lineWidth: nameFocused ? 2 : 1
                                        )
                                )
                        }
                        
                        // Phone field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(category != nil ? "Phone Number * Required" : "Phone Number (Optional)")
                                    .font(.custom("Inter-Regular", size: 14))
                                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            }
                            TextField("Enter your phone number", text: $donorPhone)
                                .focused($phoneFocused)
                                .keyboardType(.phonePad)
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            phoneFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : (category != nil && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.gray.opacity(0.2)),
                                            lineWidth: phoneFocused ? 2 : 1
                                        )
                                )
                        }
                        
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email for Receipt (Optional)")
                                .font(.custom("Inter-Regular", size: 14))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            TextField("Enter your email", text: $donorEmail)
                                .focused($emailFocused)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .padding(16)
                                .background(Color.white)
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            emailFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : Color.gray.opacity(0.2),
                                            lineWidth: emailFocused ? 2 : 1
                                        )
                                )
                        }
                    }
                    .frame(maxWidth: donorFormMaxWidth)
                    .padding(.trailing, detailsPageSidePadding)
                }
                .frame(maxWidth: .infinity)
                
                Spacer()
                
                // Ready for Payment button - centered at bottom
                Button(action: {
                    withAnimation {
                        onConfirm(
                            donorName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorName.trimmingCharacters(in: .whitespaces),
                            donorPhone.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorPhone.trimmingCharacters(in: .whitespaces),
                            donorEmail.trimmingCharacters(in: .whitespaces).isEmpty ? nil : donorEmail.trimmingCharacters(in: .whitespaces)
                        )
                    }
                }) {
                    HStack(spacing: 12) {
                        Text("Ready for Payment")
                            .font(.custom("Inter-Medium", size: 22))
                            .foregroundColor(.white)
                        Image(systemName: "arrow.right")
                            .font(.custom("Inter-SemiBold", size: 20))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: 500)
                    .padding(.vertical, 18)
                    .background(canProceed ? Color(red: 0.2, green: 0.4, blue: 0.8) : Color.gray.opacity(0.5))
                    .cornerRadius(12)
                }
                .disabled(!canProceed)
                .padding(.bottom, detailsPageBottomPadding)
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
    }
}

// Keep old view for compatibility
struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?) -> Void // name, phone, email
    
    var body: some View {
        ModernDonationDetailsView(amount: amount, category: category, onConfirm: onConfirm)
    }
}
