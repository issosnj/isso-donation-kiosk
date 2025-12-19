import SwiftUI

struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: (String?, String?) -> Void
    
    @State private var donorName = ""
    @State private var donorEmail = ""
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                Text("Donation Summary")
                    .font(.system(size: 32, weight: .bold))
                    .padding(.top, 40)
                
                VStack(spacing: 20) {
                    HStack {
                        Text("Amount:")
                            .font(.system(size: 22, weight: .medium))
                        Spacer()
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.blue)
                    }
                    
                    if let category = category {
                        HStack {
                            Text("Category:")
                                .font(.system(size: 20, weight: .medium))
                            Spacer()
                            Text(category.name)
                                .font(.system(size: 20))
                        }
                    }
                }
                .padding(30)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(16)
                .padding(.horizontal, 40)
                
                VStack(alignment: .leading, spacing: 20) {
                    Text("Optional Information")
                        .font(.system(size: 22, weight: .semibold))
                    
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Name (Optional)")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                        TextField("Enter your name", text: $donorName)
                            .textFieldStyle(.roundedBorder)
                            .font(.system(size: 18))
                            .padding(.vertical, 12)
                    }
                    
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Email for Receipt (Optional)")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                        TextField("Enter your email", text: $donorEmail)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .font(.system(size: 18))
                            .padding(.vertical, 12)
                    }
                }
                .padding(.horizontal, 40)
                
                Spacer()
                
                Button(action: {
                    onConfirm(
                        donorName.isEmpty ? nil : donorName,
                        donorEmail.isEmpty ? nil : donorEmail
                    )
                }) {
                    Text("Tap or Insert Card to Donate")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(Color.blue)
                        .cornerRadius(16)
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

