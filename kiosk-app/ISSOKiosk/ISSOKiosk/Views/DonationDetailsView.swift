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
            // Clean white background
            Color.white
                .ignoresSafeArea()
            
            HStack(spacing: 0) {
                // Left side: Payment details
                VStack(alignment: .leading, spacing: 0) {
                    // Top: "All payment options"
                    HStack {
                        Text("All payment options")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.gray)
                        Spacer()
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 40)
                    .padding(.bottom, 20)
                    
                    // Large amount display
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pay")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.gray)
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.system(size: 64, weight: .bold))
                            .foregroundColor(.black)
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 30)
                    
                    // Donation summary
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text("Donation")
                                .font(.system(size: 18, weight: .regular))
                                .foregroundColor(.black)
                            Spacer()
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.system(size: 18, weight: .regular))
                                .foregroundColor(.black)
                        }
                        
                        if let category = category {
                            Divider()
                            HStack {
                                Text("Category")
                                    .font(.system(size: 18, weight: .regular))
                                    .foregroundColor(.black)
                                Spacer()
                                Text(category.name)
                                    .font(.system(size: 18, weight: .regular))
                                    .foregroundColor(.black)
                            }
                        }
                        
                        Divider()
                        
                        HStack {
                            Text("Total")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(.black)
                            Spacer()
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(.black)
                        }
                    }
                    .padding(30)
                    .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                    .cornerRadius(12)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 30)
                    
                    // Optional information section (collapsible)
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Optional Information")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.gray)
                        
                        // Name field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Name (Optional)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            TextField("Enter your name", text: $donorName)
                                .focused($nameFocused)
                                .font(.system(size: 18))
                                .padding(16)
                                .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            nameFocused 
                                                ? Color(red: 0.2, green: 0.4, blue: 0.8)
                                                : Color.gray.opacity(0.2),
                                            lineWidth: nameFocused ? 2 : 1
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
                                .padding(16)
                                .background(Color(red: 0.98, green: 0.98, blue: 0.98))
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
                    .padding(.horizontal, 40)
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                
                // Right side: Payment instructions
                VStack(spacing: 40) {
                    Spacer()
                    
                    // Contactless payment symbol
                    VStack(spacing: 20) {
                        // Contactless icon - vertical lines matching reference
                        ZStack {
                            Circle()
                                .fill(Color(red: 0.2, green: 0.4, blue: 0.8))
                                .frame(width: 140, height: 140)
                            
                            // Vertical lines icon (matching reference)
                            VStack(spacing: 6) {
                                HStack(spacing: 6) {
                                    ForEach(0..<3) { _ in
                                        RoundedRectangle(cornerRadius: 3)
                                            .fill(Color.white)
                                            .frame(width: 6, height: 32)
                                    }
                                }
                                HStack(spacing: 6) {
                                    ForEach(0..<3) { _ in
                                        RoundedRectangle(cornerRadius: 3)
                                            .fill(Color.white)
                                            .frame(width: 6, height: 32)
                                    }
                                }
                            }
                        }
                        
                        // Payment options
                        VStack(spacing: 30) {
                            // Tap option
                            Button(action: {
                                onConfirm(
                                    donorName.isEmpty ? nil : donorName,
                                    donorEmail.isEmpty ? nil : donorEmail
                                )
                            }) {
                                HStack(spacing: 12) {
                                    Text("Tap")
                                        .font(.system(size: 24, weight: .semibold))
                                        .foregroundColor(.white)
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 20)
                                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                                .cornerRadius(12)
                            }
                            
                            // Insert option
                            Button(action: {
                                onConfirm(
                                    donorName.isEmpty ? nil : donorName,
                                    donorEmail.isEmpty ? nil : donorEmail
                                )
                            }) {
                                HStack(spacing: 12) {
                                    Text("Insert")
                                        .font(.system(size: 24, weight: .semibold))
                                        .foregroundColor(.white)
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 20)
                                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 40)
                    }
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .background(Color(red: 0.98, green: 0.98, blue: 0.98))
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
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.white)
                        .cornerRadius(10)
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
