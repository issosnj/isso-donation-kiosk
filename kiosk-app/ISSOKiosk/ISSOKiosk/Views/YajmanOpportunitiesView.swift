import SwiftUI

struct YajmanOpportunitiesView: View {
    let category: DonationCategory
    let opportunities: [YajmanOpportunity]
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white,
                        Color(red: 0.95, green: 0.97, blue: 1.0)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 12) {
                            Text(category.name)
                                .font(.custom("Inter-SemiBold", size: 32))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            
                            if let defaultAmount = category.defaultAmount, defaultAmount > 0 {
                                Text(defaultAmount.formattedCurrencyWhole())
                                    .font(.custom("Inter-SemiBold", size: 48))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            }
                            
                            Text("This sponsorship includes:")
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                .padding(.top, 8)
                        }
                        .padding(.top, 40)
                        
                        // List of opportunities
                        VStack(spacing: 12) {
                            ForEach(opportunities) { opportunity in
                                HStack(alignment: .top, spacing: 12) {
                                    // Checkmark icon
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 20))
                                        .foregroundColor(Color(red: 0.18, green: 0.64, blue: 0.33))
                                        .padding(.top, 2)
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(opportunity.name)
                                            .font(.custom("Inter-SemiBold", size: 16))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                        
                                        if let description = opportunity.description, !description.isEmpty {
                                            Text(description)
                                                .font(.custom("Inter-Regular", size: 14))
                                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                        }
                                    }
                                    
                                    Spacer()
                                }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 16)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                            }
                        }
                        .padding(.horizontal, 20)
                        
                        Spacer()
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Yajman Opportunities")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        onDismiss()
                    }
                }
            }
        }
    }
}

