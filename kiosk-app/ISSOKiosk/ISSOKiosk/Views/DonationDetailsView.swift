import SwiftUI

struct ModernDonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?) -> Void
    
    @State private var donorName = ""
    @State private var donorEmail = ""
    @State private var appearAnimation = false
    @FocusState private var nameFocused: Bool
    @FocusState private var emailFocused: Bool
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            // Modern gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.92, green: 0.96, blue: 1.0),
                    Color(red: 0.88, green: 0.94, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Animated header
                    VStack(spacing: 20) {
                        // Animated icon
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.2, green: 0.4, blue: 0.8),
                                            Color(red: 0.3, green: 0.5, blue: 0.9)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)
                                .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4), radius: 20, x: 0, y: 10)
                            
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                        }
                        .scaleEffect(appearAnimation ? 1.0 : 0.5)
                        .opacity(appearAnimation ? 1.0 : 0.0)
                        
                        Text("Review Your Donation")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            .opacity(appearAnimation ? 1.0 : 0.0)
                            .offset(y: appearAnimation ? 0 : 20)
                    }
                    .padding(.top, 50)
                    .padding(.bottom, 40)
                    
                    // Donation summary card with animation
                    VStack(spacing: 25) {
                        HStack {
                            Text("Donation Amount")
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(.gray)
                            Spacer()
                        }
                        
                        HStack {
                            Spacer()
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.system(size: 56, weight: .bold))
                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                        }
                        
                        if let category = category {
                            Divider()
                                .padding(.vertical, 10)
                            
                            HStack {
                                Text("Category")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(.gray)
                                Spacer()
                                Text(category.name)
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            }
                        }
                    }
                    .padding(35)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white)
                            .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    )
                    .padding(.horizontal, 40)
                    .scaleEffect(appearAnimation ? 1.0 : 0.9)
                    .opacity(appearAnimation ? 1.0 : 0.0)
                    .offset(y: appearAnimation ? 0 : 30)
                    
                    // Optional information section
                    VStack(alignment: .leading, spacing: 25) {
                        Text("Optional Information")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                            .padding(.top, 40)
                        
                        // Name field
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Name (Optional)")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.gray)
                            TextField("Enter your name", text: $donorName)
                                .focused($nameFocused)
                                .font(.system(size: 20))
                                .padding(18)
                                .background(Color.white)
                                .cornerRadius(16)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(
                                            nameFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : Color.gray.opacity(0.3),
                                            lineWidth: nameFocused ? 3 : 2
                                        )
                                )
                                .shadow(color: nameFocused ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.2) : Color.clear, radius: 8, x: 0, y: 4)
                        }
                        
                        // Email field
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Email for Receipt (Optional)")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.gray)
                            TextField("Enter your email", text: $donorEmail)
                                .focused($emailFocused)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .font(.system(size: 20))
                                .padding(18)
                                .background(Color.white)
                                .cornerRadius(16)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(
                                            emailFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : Color.gray.opacity(0.3),
                                            lineWidth: emailFocused ? 3 : 2
                                        )
                                )
                                .shadow(color: emailFocused ? Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.2) : Color.clear, radius: 8, x: 0, y: 4)
                        }
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    .opacity(appearAnimation ? 1.0 : 0.0)
                    .offset(y: appearAnimation ? 0 : 20)
                    
                    Spacer()
                        .frame(height: 40)
                    
                    // Payment button with animation
                    Button(action: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            onConfirm(
                                donorName.isEmpty ? nil : donorName,
                                donorEmail.isEmpty ? nil : donorEmail
                            )
                        }
                    }) {
                        HStack(spacing: 15) {
                            Image(systemName: "creditcard.fill")
                                .font(.system(size: 28))
                            Text("Tap or Insert Card to Donate")
                                .font(.system(size: 24, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.2, green: 0.4, blue: 0.8),
                                    Color(red: 0.3, green: 0.5, blue: 0.9)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(20)
                        .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.4), radius: 15, x: 0, y: 8)
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 50)
                    .scaleEffect(appearAnimation ? 1.0 : 0.9)
                    .opacity(appearAnimation ? 1.0 : 0.0)
                    .offset(y: appearAnimation ? 0 : 30)
                }
            }
            
            // Cancel button
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
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
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
    let onConfirm: (String?, String?) -> Void
    
    var body: some View {
        ModernDonationDetailsView(amount: amount, category: category, onConfirm: onConfirm)
    }
}
