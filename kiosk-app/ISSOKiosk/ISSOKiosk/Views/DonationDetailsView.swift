import SwiftUI

struct ModernDonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?, String?) -> Void // name, phone, email
    
    @State private var donorName = ""
    @State private var donorPhone = ""
    @State private var donorEmail = ""
    @State private var appearAnimation = false
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
            
            // Dark overlay for readability
            Color.black.opacity(0.7)
                .ignoresSafeArea(.all, edges: .all)
                .onTapGesture {
                    // Dismiss keyboard when tapping background
                    nameFocused = false
                    phoneFocused = false
                    emailFocused = false
                }
            
            VStack(spacing: 0) {
                Spacer()
                
                // Centered content
                VStack(spacing: 40) {
                    // Large amount display
                    VStack(spacing: 8) {
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.custom("Inter-SemiBold", size: 72))
                            .foregroundColor(.white)
                    }
                    
                    // Donation summary (dark card)
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text("Donation")
                                .font(.system(size: 18, weight: .regular))
                                .foregroundColor(.white)
                            Spacer()
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.system(size: 18, weight: .regular))
                                .foregroundColor(.white)
                        }
                        
                        if let category = category {
                            Divider()
                                .background(Color.gray.opacity(0.3))
                            HStack {
                                Text("Category")
                                    .font(.system(size: 18, weight: .regular))
                                    .foregroundColor(.white)
                                Spacer()
                                Text(category.name)
                                    .font(.system(size: 18, weight: .regular))
                                    .foregroundColor(.white)
                            }
                        }
                        
                        Divider()
                            .background(Color.gray.opacity(0.3))
                        
                        HStack {
                            Text("Total")
                                .font(.custom("Inter-SemiBold", size: 20))
                                .foregroundColor(.white)
                            Spacer()
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.custom("Inter-SemiBold", size: 20))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(30)
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)
                    .frame(maxWidth: 500)
                    
                    // Donor information section
                    VStack(alignment: .leading, spacing: 20) {
                        Text(category != nil ? "Donor Information" : "Optional Information")
                            .font(.custom("Inter-SemiBold", size: 18))
                            .foregroundColor(.white)
                        
                        // Name field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(category != nil ? "Name *" : "Name (Optional)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.gray)
                                if category != nil && donorName.trimmingCharacters(in: .whitespaces).isEmpty {
                                    Text("Required")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(.red)
                                }
                            }
                            TextField("Enter your name", text: $donorName)
                                .focused($nameFocused)
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color(red: 0.1, green: 0.1, blue: 0.1).opacity(0.8))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            nameFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : (category != nil && donorName.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.gray.opacity(0.3)),
                                            lineWidth: nameFocused ? 2 : 1
                                        )
                                )
                        }
                        
                        // Phone field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(category != nil ? "Phone Number *" : "Phone Number (Optional)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.gray)
                                if category != nil && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty {
                                    Text("Required")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundColor(.red)
                                }
                            }
                            TextField("Enter your phone number", text: $donorPhone)
                                .focused($phoneFocused)
                                .keyboardType(.phonePad)
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color(red: 0.1, green: 0.1, blue: 0.1).opacity(0.8))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            phoneFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : (category != nil && donorPhone.trimmingCharacters(in: .whitespaces).isEmpty
                                                    ? Color.red.opacity(0.5)
                                                    : Color.gray.opacity(0.3)),
                                            lineWidth: phoneFocused ? 2 : 1
                                        )
                                )
                        }
                        
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email for Receipt (Optional)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            TextField("Enter your email", text: $donorEmail)
                                .focused($emailFocused)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .font(.system(size: 18))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color(red: 0.1, green: 0.1, blue: 0.1).opacity(0.8))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            emailFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : Color.gray.opacity(0.3),
                                            lineWidth: emailFocused ? 2 : 1
                                        )
                                )
                        }
                    }
                    .frame(maxWidth: 500)
                    
                    // Ready for payment button
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
                }
                .padding(.horizontal, 40)
                
                Spacer()
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
