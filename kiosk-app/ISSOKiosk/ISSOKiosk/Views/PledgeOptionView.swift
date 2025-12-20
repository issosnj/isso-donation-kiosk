import SwiftUI
import CoreImage.CIFilterBuiltins

struct PledgeOptionView: View {
    let amount: Double
    let category: DonationCategory?
    let donorName: String?
    let donorPhone: String?
    let donorEmail: String?
    let onPayNow: () -> Void
    let onPledge: () -> Void
    let onCancel: () -> Void
    
    @State private var pledgeToken: String?
    @State private var pledgePaymentLink: String?
    @State private var qrCodeImage: UIImage?
    @State private var isCreatingPledge = false
    @State private var pledgeCreated = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white,
                        Color(red: 0.95, green: 0.97, blue: 1.0)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                if isCreatingPledge {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Creating pledge...")
                            .font(.custom("Inter-Regular", size: 16))
                            .foregroundColor(.gray)
                    }
                } else if pledgeCreated, let link = pledgePaymentLink {
                    // Show pledge confirmation with QR code
                    ScrollView {
                        VStack(spacing: 30) {
                            // Success message
                            VStack(spacing: 12) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.18, green: 0.64, blue: 0.33))
                                
                                Text("Pledge Created!")
                                    .font(.custom("Inter-SemiBold", size: 28))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                
                                Text("$\(String(format: "%.2f", amount))")
                                    .font(.custom("Inter-SemiBold", size: 36))
                                    .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            }
                            .padding(.top, 40)
                            
                            // QR Code
                            if let qrImage = qrCodeImage {
                                VStack(spacing: 12) {
                                    Text("Scan to Pay Later")
                                        .font(.custom("Inter-Medium", size: 18))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                    
                                    Image(uiImage: qrImage)
                                        .interpolation(.none)
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 250, height: 250)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .shadow(radius: 5)
                                    
                                    Text("Or visit:")
                                        .font(.custom("Inter-Regular", size: 14))
                                        .foregroundColor(.gray)
                                    
                                    Text(link)
                                        .font(.custom("Inter-Regular", size: 12))
                                        .foregroundColor(.blue)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 20)
                                }
                            }
                            
                            // Instructions
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Instructions:")
                                    .font(.custom("Inter-SemiBold", size: 16))
                                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    InstructionRow(number: "1", text: "Save this QR code or payment link")
                                    InstructionRow(number: "2", text: "Pay when you're ready (within 30 days)")
                                    InstructionRow(number: "3", text: "You'll receive a receipt after payment")
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color(red: 0.98, green: 0.98, blue: 1.0))
                            .cornerRadius(12)
                            .padding(.horizontal, 20)
                            
                            Button(action: onCancel) {
                                Text("Done")
                                    .font(.custom("Inter-Medium", size: 18))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: 400)
                                    .padding(.vertical, 16)
                                    .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                                    .cornerRadius(12)
                            }
                            .padding(.horizontal, 20)
                            .padding(.bottom, 40)
                        }
                    }
                } else {
                    // Initial view - choose payment option
                    VStack(spacing: 30) {
                        Spacer()
                        
                        // Amount display
                        VStack(spacing: 8) {
                            Text("$\(String(format: "%.2f", amount))")
                                .font(.custom("Inter-SemiBold", size: 64))
                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            
                            if let categoryName = category?.name {
                                Text(categoryName)
                                    .font(.custom("Inter-Regular", size: 18))
                                    .foregroundColor(.gray)
                            }
                        }
                        
                        Text("Choose Payment Option")
                            .font(.custom("Inter-SemiBold", size: 24))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                            .padding(.top, 20)
                        
                        VStack(spacing: 16) {
                            // Pay Now button
                            Button(action: onPayNow) {
                                HStack {
                                    Image(systemName: "creditcard.fill")
                                        .font(.system(size: 20))
                                    Text("Pay Now")
                                        .font(.custom("Inter-Medium", size: 20))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: 400)
                                .padding(.vertical, 18)
                                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                                .cornerRadius(12)
                            }
                            
                            // Pledge Now button
                            Button(action: {
                                isCreatingPledge = true
                                onPledge()
                            }) {
                                HStack {
                                    Image(systemName: "clock.fill")
                                        .font(.system(size: 20))
                                    Text("Pledge Now, Pay Later")
                                        .font(.custom("Inter-Medium", size: 20))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: 400)
                                .padding(.vertical, 18)
                                .background(Color(red: 0.5, green: 0.3, blue: 0.8))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 20)
                        
                        Spacer()
                        
                        Button(action: onCancel) {
                            Text("Cancel")
                                .font(.custom("Inter-Regular", size: 16))
                                .foregroundColor(.gray)
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("Payment Options")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            // Generate QR code if we have a payment link
            if let link = pledgePaymentLink {
                qrCodeImage = generateQRCode(from: link)
            }
        }
    }
    
    func setPledgeInfo(token: String, paymentLink: String) {
        self.pledgeToken = token
        self.pledgePaymentLink = paymentLink
        self.qrCodeImage = generateQRCode(from: paymentLink)
        self.isCreatingPledge = false
    }
    
    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        
        let data = string.data(using: .utf8)
        filter.setValue(data, forKey: "inputMessage")
        
        if let outputImage = filter.outputImage {
            let transform = CGAffineTransform(scaleX: 10, y: 10)
            let scaledImage = outputImage.transformed(by: transform)
            
            if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        
        return nil
    }
}

struct InstructionRow: View {
    let number: String
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.custom("Inter-SemiBold", size: 14))
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color(red: 0.2, green: 0.4, blue: 0.8))
                .clipShape(Circle())
            
            Text(text)
                .font(.custom("Inter-Regular", size: 14))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
        }
    }
}

