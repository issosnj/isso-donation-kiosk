import SwiftUI

struct DonationDetailsView: View {
    let amount: Double
    let category: DonationCategory?
    let onConfirm: () -> Void
    
    @State private var donorName = ""
    @State private var donorEmail = ""
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("Donation Summary")
                    .font(.title)
                    .fontWeight(.bold)
                    .padding(.top)
                
                VStack(spacing: 15) {
                    HStack {
                        Text("Amount:")
                            .font(.headline)
                        Spacer()
                        Text("$\(String(format: "%.2f", amount))")
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    
                    if let category = category {
                        HStack {
                            Text("Category:")
                                .font(.headline)
                            Spacer()
                            Text(category.name)
                                .font(.body)
                        }
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
                
                VStack(alignment: .leading, spacing: 15) {
                    Text("Optional Information")
                        .font(.headline)
                    
                    TextField("Name (Optional)", text: $donorName)
                        .textFieldStyle(.roundedBorder)
                    
                    TextField("Email for Receipt (Optional)", text: $donorEmail)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                .padding(.horizontal)
                
                Spacer()
                
                Button(action: onConfirm) {
                    Text("Tap or Insert Card to Donate")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom)
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

