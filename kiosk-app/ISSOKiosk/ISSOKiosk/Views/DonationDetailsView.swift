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
                    .frame(height: 100)
                
                // Main content: Left (Donation Details) and Right (Donor Info)
                HStack(alignment: .top, spacing: 40) {
                    // LEFT SIDE: Donation Details
                    VStack(alignment: .leading, spacing: 24) {
                        // Large amount display
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.custom("Inter-SemiBold", size: 64))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        // Donation summary card
                        VStack(alignment: .leading, spacing: 16) {
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
                                if let opportunities = category.yajmanOpportunities, !opportunities.isEmpty {
                                    Divider()
                                        .background(Color.gray.opacity(0.3))
                                    
                                    Button(action: {
                                        showingYajmanOpportunities = true
                                    }) {
                                        HStack {
                                            Image(systemName: "star.fill")
                                                .font(.system(size: 14))
                                                .foregroundColor(Color(red: 1.0, green: 0.84, blue: 0.0))
                                            Text("View Benefits")
                                                .font(.custom("Inter-Medium", size: 16))
                                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.1))
                                        .cornerRadius(8)
                                    }
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
                        .padding(24)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 2)
                        .frame(maxWidth: 400)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.leading, 40)
                    
                    // RIGHT SIDE: Donor Information
                    VStack(alignment: .leading, spacing: 20) {
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
                    .frame(maxWidth: 400)
                    .padding(.trailing, 40)
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
                .padding(.bottom, 40)
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
