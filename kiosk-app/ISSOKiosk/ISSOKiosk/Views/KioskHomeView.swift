import SwiftUI
import CoreImage.CIFilterBuiltins

struct KioskHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var navigationState: AppNavigationState
    @State private var showWhatsAppQR = false
    @State private var showEvents = false
    @State private var showSocialMediaQR: String? = nil
    
    var body: some View {
        ZStack {
            // Background
            Color(.systemBackground)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top: Temple Name
                if let temple = appState.temple {
                    VStack(spacing: 10) {
                        if let logoUrl = temple.logoUrl, !logoUrl.isEmpty {
                            AsyncImage(url: URL(string: logoUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                            } placeholder: {
                                Image(systemName: "building.2")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                            }
                            .frame(height: 80)
                            .cornerRadius(8)
                        }
                        
                        Text(temple.name)
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    .padding(.horizontal, 40)
                }
                
                Spacer()
                
                // Main: Click to Donate Button
                Button(action: {
                    withAnimation {
                        navigationState.showDonationFlow = true
                    }
                }) {
                    VStack(spacing: 15) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.white)
                        
                        Text("Click to Donate")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue,
                                Color.blue.opacity(0.8)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(24)
                    .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 60)
                .padding(.vertical, 40)
                
                Spacer()
                
                // Bottom: Action Buttons
                VStack(spacing: 20) {
                    // Join WhatsApp
                    if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                        ActionButton(
                            icon: "message.fill",
                            title: "Join WhatsApp",
                            color: Color.green
                        ) {
                            showWhatsAppQR = true
                        }
                    }
                    
                    // Upcoming Events/Upvas
                    if let eventsText = appState.temple?.homeScreenConfig?.eventsText, !eventsText.isEmpty {
                        ActionButton(
                            icon: "calendar",
                            title: "Upcoming Events/Upvas",
                            color: Color.orange
                        ) {
                            showEvents = true
                        }
                    }
                    
                    // Social Media
                    if let socialMedia = appState.temple?.homeScreenConfig?.socialMedia, !socialMedia.isEmpty {
                        SocialMediaSection(socialMedia: socialMedia) { url in
                            showSocialMediaQR = url
                        }
                    }
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
                
                // Custom Message at Bottom
                if let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
                    Text(customMessage)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.bottom, 30)
                }
            }
        }
        .sheet(isPresented: $showWhatsAppQR) {
            if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink {
                QRCodeDisplayView(url: whatsAppLink, title: "Join WhatsApp")
            }
        }
        .sheet(isPresented: $showEvents) {
            if let eventsText = appState.temple?.homeScreenConfig?.eventsText {
                EventsView(eventsText: eventsText)
            }
        }
        .sheet(item: Binding(
            get: { showSocialMediaQR.map { SocialMediaItem(url: $0) } },
            set: { showSocialMediaQR = $0?.url }
        )) { item in
            QRCodeDisplayView(url: item.url, title: "Social Media")
        }
    }
}

struct ActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 15) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                
                Text(title)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(color)
            .cornerRadius(16)
        }
    }
}

struct SocialMediaSection: View {
    let socialMedia: [SocialMediaLink]
    let onTap: (String) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Social Media")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.primary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(socialMedia, id: \.platform) { link in
                        SocialMediaButton(link: link) {
                            onTap(link.url)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct SocialMediaButton: View {
    let link: SocialMediaLink
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: iconForPlatform(link.platform))
                    .font(.system(size: 32))
                    .foregroundColor(.white)
                
                Text(link.platform.capitalized)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
            }
            .frame(width: 100, height: 100)
            .background(colorForPlatform(link.platform))
            .cornerRadius(16)
        }
    }
    
    private func iconForPlatform(_ platform: String) -> String {
        switch platform.lowercased() {
        case "facebook": return "f.circle.fill"
        case "instagram": return "camera.fill"
        case "twitter", "x": return "at"
        case "youtube": return "play.circle.fill"
        case "linkedin": return "link"
        default: return "link"
        }
    }
    
    private func colorForPlatform(_ platform: String) -> Color {
        switch platform.lowercased() {
        case "facebook": return Color(red: 0.26, green: 0.40, blue: 0.70)
        case "instagram": return Color(red: 0.79, green: 0.31, blue: 0.50)
        case "twitter", "x": return Color(red: 0.11, green: 0.63, blue: 0.95)
        case "youtube": return Color(red: 1.0, green: 0.0, blue: 0.0)
        case "linkedin": return Color(red: 0.0, green: 0.47, blue: 0.71)
        default: return Color.blue
        }
    }
}

struct QRCodeDisplayView: View {
    let url: String
    let title: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("Scan to \(title)")
                    .font(.system(size: 24, weight: .semibold))
                    .padding(.top, 40)
                
                if let qrImage = generateQRCode(from: url) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 300, height: 300)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(radius: 5)
                }
                
                Text(url)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 40)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
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

struct EventsView: View {
    let eventsText: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                Text(eventsText)
                    .font(.system(size: 20))
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .navigationTitle("Upcoming Events/Upvas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct SocialMediaItem: Identifiable {
    let id = UUID()
    let url: String
}

