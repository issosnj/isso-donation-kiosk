import SwiftUI
import UIKit
import CoreImage.CIFilterBuiltins

struct KioskHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var navigationState: AppNavigationState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @State private var showWhatsAppQR = false
    @State private var showEvents = false
    @State private var showReligiousEvents = false
    @State private var showSocialMediaQR: String? = nil
    @State private var showSuggestionBox = false
    @State private var currentTime = Date()
    @State private var timer: Timer?
    
    // QR Code cache to avoid regenerating on each tap
    @State private var qrCodeCache: [String: UIImage] = [:]
    
    // Cache DateFormatter for better performance
    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    // Helper function to convert hex string to Color
    private func colorFromHex(_ hex: String) -> Color {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        // Handle 3-character hex codes
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6,
              let rgb = UInt32(hexSanitized, radix: 16) else {
            return Color(red: 0.26, green: 0.20, blue: 0.20) // Default to #423232 if parsing fails
        }
        
        let red = Double((rgb >> 16) & 0xFF) / 255.0
        let green = Double((rgb >> 8) & 0xFF) / 255.0
        let blue = Double(rgb & 0xFF) / 255.0
        
        return Color(red: red, green: green, blue: blue)
    }
    
    // Background view
    private var backgroundView: some View {
        Group {
            // First try to use asset (local, no network needed)
            if UIImage(named: "KioskBackground") != nil {
                Image("KioskBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .ignoresSafeArea()
            } else if let backgroundImage = appState.backgroundImage {
                // Fallback to preloaded URL image
                Image(uiImage: backgroundImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .ignoresSafeArea()
            } else if let backgroundUrl = appState.temple?.kioskTheme?.layout?.backgroundImageUrl ?? appState.temple?.homeScreenConfig?.backgroundImageUrl,
               let url = URL(string: backgroundUrl) {
                // Fallback to async URL loading
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        defaultGradient
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        defaultGradient
                    @unknown default:
                        defaultGradient
                    }
                }
                .ignoresSafeArea()
            } else {
                // Final fallback to default gradient
                defaultGradient
            }
        }
    }
    
    private var defaultGradient: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color.white,
                Color(red: 0.95, green: 0.97, blue: 1.0)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }
    
    // Main content view
    private var mainContentView: some View {
        VStack(spacing: 0) {
                // Header at top, transparent background
                ZStack {
                    VStack(spacing: 0) {
                        // Welcome to Shree Swaminarayan Hindu Temple (on top, smaller) - Bold
                        Text("Welcome to Shree Swaminarayan Hindu Temple")
                            .font(.system(size: 42, weight: .bold, design: .default))
                            .foregroundColor(colorFromHex("423232"))
                            .multilineTextAlignment(.center)
                            .lineLimit(nil)
                            .minimumScaleFactor(0.5)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 20)
                            .padding(.top, 95)
                            .padding(.bottom, 4)
                        
                        // Header 1 (default: "International Swaminarayan Satsang Organization (ISSO)")
                        Text(header1Text)
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(colorFromHex("423232"))
                            .multilineTextAlignment(.center)
                            .lineLimit(nil)
                            .minimumScaleFactor(0.5)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 20)
                            .padding(.bottom, 4)
                        
                        // Under Shree NarNarayan Dev Gadi - Italic
                        Text("Under Shree NarNarayan Dev Gadi")
                            .font(.system(size: 20, weight: .regular, design: .default))
                            .italic()
                            .foregroundColor(colorFromHex("423232"))
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.bottom, 4)
                        
                        // Temple Address
                        if let temple = appState.temple, let address = temple.address, !address.isEmpty {
                            Text(address)
                                .font(.custom("Inter-Regular", size: 18))
                                .foregroundColor(colorFromHex("423232"))
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                                .frame(maxWidth: .infinity)
                                .padding(.bottom, 16)
                        } else {
                            // Add padding if no address
                            Spacer()
                                .frame(height: 16)
                        }
                    }
                    
                    // Time and Network Status in top right
                    TimeAndNetworkStatusView()
                        .padding(.trailing, 20)
                        .padding(.top, 17)
                }
                
                Spacer()
                
                // Centered content
                VStack(spacing: 30) {
                    
                    // Main: Tap To Donate Button - Gold-Accented Design (centered vertically)
                    HStack {
                        Spacer()
                        GoldAccentDonateButton(
                            buttonColor: appState.temple?.kioskTheme?.colors?.tapToDonateButtonColor ?? "#D4AF37",
                            action: {
                            // Preload background image before navigating
                            Task {
                                await appState.preloadBackgroundImage()
                                await MainActor.run {
                                    navigationState.showDonationFlow = true
                                }
                            }
                        })
                        .padding(.horizontal, 20) // Add padding to prevent clipping during animation
                        .padding(.vertical, 10) // Add vertical padding for zoom animation
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Bottom: Action Buttons (only show active ones)
                    VStack(spacing: 20) {
                        // Quick Actions Section (WhatsApp, Events, Social Media as icons)
                        // Only show if there are any active buttons
                        let hasWhatsApp = appState.temple?.homeScreenConfig?.whatsAppLink?.isEmpty == false
                        let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
                        let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
                        let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
                        let hasEvents = hasGoogleCalendar || hasLocalEvents || hasEventsText
                        let hasSocialMedia = appState.temple?.homeScreenConfig?.socialMedia?.isEmpty == false
                        let hasAnyQuickActions = hasWhatsApp || hasEvents || hasSocialMedia || true // Suggestion Box is always available
                        
                        if hasAnyQuickActions {
                            VStack(spacing: 12) {
                                Text("Quick Actions")
                                    .font(.custom("Inter-SemiBold", size: 20))
                                    .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                                
                                HStack(spacing: 16) {
                                    // Join WhatsApp - only show if configured
                                    if hasWhatsApp, let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                                        ModernQuickActionButton(
                                            icon: "message.fill",
                                            title: "WhatsApp",
                                            color: Color(red: 0.18, green: 0.64, blue: 0.33),
                                            isActive: true
                                        ) {
                                            showWhatsAppQR = true
                                        }
                                    }
                                    
                                    // Upcoming Events - only show if configured
                                    if hasEvents {
                                        ModernQuickActionButton(
                                            icon: "calendar",
                                            title: "Events",
                                            color: Color(red: 1.0, green: 0.58, blue: 0.0),
                                            isActive: true
                                        ) {
                                            showEvents = true
                                        }
                                    }
                                    
                                    // Religious Observances - always show (master admin controlled)
                                    ModernQuickActionButton(
                                        icon: "moon.stars.fill",
                                        title: "Observances",
                                        color: Color(red: 0.6, green: 0.4, blue: 0.8),
                                        isActive: true
                                    ) {
                                        showReligiousEvents = true
                                    }
                                    
                                    // Social Media - only show if configured
                                    if hasSocialMedia, let socialMedia = appState.temple?.homeScreenConfig?.socialMedia {
                                        ForEach(socialMedia, id: \.platform) { link in
                                            ModernQuickActionButton(
                                                icon: iconForPlatform(link.platform),
                                                title: link.platform.capitalized,
                                                color: colorForPlatform(link.platform),
                                                isActive: true
                                            ) {
                                                showSocialMediaQR = link.url
                                            }
                                        }
                                    }
                                    
                                    // Suggestion Box (always available)
                                    ModernQuickActionButton(
                                        icon: "text.bubble.fill",
                                        title: "Suggestions",
                                        color: Color(red: 0.5, green: 0.3, blue: 0.8),
                                        isActive: true
                                    ) {
                                        showSuggestionBox = true
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    
                    // Custom Message at Bottom (if configured)
                    if let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
                        Text(customMessage)
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.top, 20)
                    }
                }
                .frame(maxWidth: 800) // Limit width for better centering
                
                Spacer()
            }
    }
    
    var body: some View {
        ZStack {
            backgroundView
            mainContentView
        }
        .sheet(isPresented: $showWhatsAppQR) {
            if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink {
                QRCodeDisplayView(url: whatsAppLink, title: "Join WhatsApp", cachedImage: qrCodeCache[whatsAppLink])
            }
        }
        .sheet(isPresented: $showEvents) {
            UnifiedCalendarEventsView(
                googleCalendarLink: appState.temple?.homeScreenConfig?.googleCalendarLink,
                localEvents: appState.temple?.homeScreenConfig?.localEvents,
                eventsText: appState.temple?.homeScreenConfig?.eventsText
            )
        }
        .sheet(isPresented: $showReligiousEvents) {
            ReligiousEventsView(religiousEvents: appState.religiousEvents)
        }
        .sheet(item: Binding(
            get: { showSocialMediaQR.map { SocialMediaItem(url: $0) } },
            set: { showSocialMediaQR = $0?.url }
        )) { item in
            QRCodeDisplayView(url: item.url, title: "Social Media", cachedImage: qrCodeCache[item.url])
        }
        .sheet(isPresented: $showSuggestionBox) {
            SuggestionBoxView()
        }
        .onAppear {
            // Start timer to update time every second - optimized for performance
            currentTime = Date()
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                currentTime = Date()
            }
            // Add timer to RunLoop for better performance
            if let timer = timer {
                RunLoop.current.add(timer, forMode: .common)
            }
            // Pre-generate QR codes for better performance
            pregenerateQRCodes()
        }
        .onChange(of: appState.temple?.homeScreenConfig?.whatsAppLink) { _ in
            // Regenerate QR codes when config changes
            pregenerateQRCodes()
        }
        .onChange(of: appState.temple?.homeScreenConfig?.socialMedia) { _ in
            // Regenerate QR codes when social media changes
            pregenerateQRCodes()
        }
        .onDisappear {
            // Stop timer when view disappears
            timer?.invalidate()
            timer = nil
        }
    }
    
    // Pre-generate QR codes for all links to avoid delay when opening
    private func pregenerateQRCodes() {
        var cache: [String: UIImage] = [:]
        
        // Generate WhatsApp QR code
        if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
            if let qrImage = generateQRCode(from: whatsAppLink) {
                cache[whatsAppLink] = qrImage
            }
        }
        
        // Generate social media QR codes
        if let socialMedia = appState.temple?.homeScreenConfig?.socialMedia {
            for link in socialMedia {
                if !link.url.isEmpty, let qrImage = generateQRCode(from: link.url) {
                    cache[link.url] = qrImage
                }
            }
        }
        
        qrCodeCache = cache
    }
    
    // QR code generation helper
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
    
    // Computed properties for headers with defaults
    private var header1Text: String {
        // Default Header 1 for all kiosks
        return "International Swaminarayan Satsang Organization (ISSO)"
    }
    
    private var timeString: String {
        Self.timeFormatter.string(from: currentTime)
    }
}

// Reusable Time and Network Status View Component
struct TimeAndNetworkStatusView: View {
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @State private var currentTime = Date()
    @State private var timer: Timer?
    
    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    private var timeString: String {
        Self.timeFormatter.string(from: currentTime)
    }
    
    var body: some View {
        VStack {
            HStack {
                Spacer()
                HStack(spacing: 12) {
                    // Network status indicator
                    Circle()
                        .fill(networkMonitor.isConnected ? Color.green : Color.red)
                        .frame(width: 12, height: 12)
                        .shadow(color: networkMonitor.isConnected ? Color.green.opacity(0.5) : Color.red.opacity(0.5), radius: 4)
                    
                    // Time display
                    Text(timeString)
                        .font(.custom("Inter-Medium", size: 18))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
            Spacer()
        }
        .onAppear {
            currentTime = Date()
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                currentTime = Date()
            }
            if let timer = timer {
                RunLoop.current.add(timer, forMode: .common)
            }
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }
}

// Modern quick action button (icon style like social media)
struct ModernQuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let isActive: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            // Button actions in SwiftUI are already on main thread
            if isActive {
                action()
            }
        }) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundColor(isActive ? .white : .gray.opacity(0.5))
                
                Text(title)
                    .font(.custom("Inter-Medium", size: 14))
                    .foregroundColor(isActive ? .white : .gray.opacity(0.5))
            }
            .frame(width: 110, height: 110)
            .background(isActive ? color : Color.gray.opacity(0.1))
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isActive ? Color.clear : Color.gray.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: isActive ? color.opacity(0.3) : Color.clear, radius: 8, x: 0, y: 4)
            .opacity(isActive ? 1.0 : 0.6)
        }
        .disabled(!isActive)
        .buttonStyle(PlainButtonStyle()) // Prevent button state issues
    }
}

// Helper functions for platform icons and colors
func iconForPlatform(_ platform: String) -> String {
    switch platform.lowercased() {
    case "facebook": return "f.circle.fill"
    case "instagram": return "camera.fill"
    case "twitter", "x": return "at"
    case "youtube": return "play.circle.fill"
    case "linkedin": return "link"
    default: return "link"
    }
}

func colorForPlatform(_ platform: String) -> Color {
    switch platform.lowercased() {
    case "facebook": return Color(red: 0.26, green: 0.40, blue: 0.70)
    case "instagram": return Color(red: 0.79, green: 0.31, blue: 0.50)
    case "twitter", "x": return Color(red: 0.11, green: 0.63, blue: 0.95)
    case "youtube": return Color(red: 1.0, green: 0.0, blue: 0.0)
    case "linkedin": return Color(red: 0.0, green: 0.47, blue: 0.71)
    default: return Color.blue
    }
}

// Keep existing helper views
struct QRCodeDisplayView: View {
    let url: String
    let title: String
    let cachedImage: UIImage? // Use cached image if available
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("Scan to \(title)")
                    .font(.custom("Inter-SemiBold", size: 24))
                    .padding(.top, 40)
                
                // Use cached image if available, otherwise generate on the fly
                if let qrImage = cachedImage ?? generateQRCode(from: url) {
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

struct SocialMediaItem: Identifiable {
    let id: String // Use URL as stable identifier
    let url: String
    
    init(url: String) {
        self.id = url
        self.url = url
    }
}

// Custom button style for donation button with scale animation
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// Gold-accented donate button with pressed state
struct GoldAccentDonateButton: View {
    let buttonColor: String
    let action: () -> Void
    @State private var isPressed = false
    @State private var pulseScale: CGFloat = 1.0
    @EnvironmentObject var navigationState: AppNavigationState
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String) -> Color {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        // Handle 3-character hex codes
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6,
              let rgb = UInt32(hexSanitized, radix: 16) else {
            return Color(red: 0.83, green: 0.69, blue: 0.22) // Default gold #D4AF37
        }
        
        let red = Double((rgb >> 16) & 0xFF) / 255.0
        let green = Double((rgb >> 8) & 0xFF) / 255.0
        let blue = Double(rgb & 0xFF) / 255.0
        
        return Color(red: red, green: green, blue: blue)
    }
    
    var body: some View {
        Button(action: action) {
            ZStack {
                // Image background - ornate gold frame with orange interior
                Image("DonateButtonBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 800, maxHeight: 300)
                    .opacity(isPressed ? 0.9 : 1.0)
                
                // Content overlay
                VStack(spacing: 20) {
                    // Icon
                    Image(systemName: "hand.tap.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.5), radius: 4, x: 0, y: 2)
                    
                    // Text
                    Text("Tap To Donate")
                        .font(.custom("Inter-Bold", size: 52))
                        .foregroundColor(.white)
                        .tracking(1.5) // Letter spacing for elegance
                        .shadow(color: Color.black.opacity(0.6), radius: 6, x: 0, y: 3)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
            .frame(width: 800, height: 300)
            .cornerRadius(20)
            .shadow(
                color: isPressed ? Color.black.opacity(0.15) : Color.black.opacity(0.25),
                radius: isPressed ? 5 : 7,
                x: 0,
                y: isPressed ? 3 : 6
            )
            .scaleEffect((isPressed ? 0.98 : 1.0) * pulseScale)
        }
        .buttonStyle(PlainButtonStyle())
        .onAppear {
            // Reset and start pulsing animation
            pulseScale = 1.0
            withAnimation(
                Animation.easeInOut(duration: 2.0)
                    .repeatForever(autoreverses: true)
            ) {
                pulseScale = 1.05
            }
        }
        .onChange(of: navigationState.showDonationFlow) { _ in
            // Restart animation when returning from donation flow
            if !navigationState.showDonationFlow {
                pulseScale = 1.0
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(
                        Animation.easeInOut(duration: 2.0)
                            .repeatForever(autoreverses: true)
                    ) {
                        pulseScale = 1.05
                    }
                }
            }
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isPressed {
                        withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                            isPressed = true
                        }
                    }
                }
                .onEnded { _ in
                    withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                        isPressed = false
                    }
                }
        )
    }
}

// Suggestion Box View
struct SuggestionBoxView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @State private var suggestionText = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @FocusState private var isTextFocused: Bool
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(red: 0.98, green: 0.98, blue: 0.99)
                    .ignoresSafeArea()
                
                if showSuccess {
                    // Success view
                    VStack(spacing: 30) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(Color(red: 0.18, green: 0.64, blue: 0.33))
                        
                        Text("Thank You!")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                        
                        Text("Your anonymous suggestion has been submitted.")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                        
                        Button(action: {
                            dismiss()
                        }) {
                            Text("Done")
                                .font(.custom("Inter-Medium", size: 18))
                                .foregroundColor(.white)
                                .frame(maxWidth: 300)
                                .padding(.vertical, 16)
                                .background(Color(red: 0.5, green: 0.3, blue: 0.8))
                                .cornerRadius(12)
                        }
                        .padding(.top, 20)
                    }
                } else {
                    // Form view
                    ScrollView {
                        VStack(spacing: 30) {
                            // Header
                            VStack(spacing: 12) {
                                Image(systemName: "text.bubble.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(Color(red: 0.5, green: 0.3, blue: 0.8))
                                
                                Text("Anonymous Suggestion Box")
                                    .font(.custom("Inter-SemiBold", size: 28))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                                
                                Text("Share your thoughts, ideas, or feedback anonymously")
                                    .font(.custom("Inter-Regular", size: 16))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.top, 40)
                            .padding(.horizontal, 40)
                            
                            // Suggestion text field
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Your Suggestion")
                                    .font(.custom("Inter-SemiBold", size: 18))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.5))
                                
                                ZStack(alignment: .topLeading) {
                                    if suggestionText.isEmpty {
                                        Text("Type your suggestion here...")
                                            .font(.system(size: 16))
                                            .foregroundColor(.gray.opacity(0.6))
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 16)
                                    }
                                    
                                    TextEditor(text: $suggestionText)
                                        .font(.system(size: 16))
                                        .frame(minHeight: 200)
                                        .focused($isTextFocused)
                                        .padding(8)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(
                                                    isTextFocused 
                                                        ? Color(red: 0.5, green: 0.3, blue: 0.8)
                                                        : Color.gray.opacity(0.3),
                                                    lineWidth: isTextFocused ? 2 : 1
                                                )
                                        )
                                }
                                
                                Text("Your suggestion is completely anonymous")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 40)
                            
                            // Error message
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 40)
                            }
                            
                            // Submit button
                            Button(action: {
                                submitSuggestion()
                            }) {
                                HStack(spacing: 12) {
                                    if isSubmitting {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Image(systemName: "paperplane.fill")
                                            .font(.system(size: 18))
                                    }
                                    Text(isSubmitting ? "Submitting..." : "Submit Suggestion")
                                        .font(.custom("Inter-Medium", size: 18))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(
                                    suggestionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting
                                        ? Color.gray.opacity(0.4)
                                        : Color(red: 0.5, green: 0.3, blue: 0.8)
                                )
                                .cornerRadius(12)
                            }
                            .disabled(suggestionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                            .padding(.horizontal, 40)
                            .padding(.bottom, 40)
                        }
                    }
                }
            }
            .navigationTitle("Suggestion Box")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func submitSuggestion() {
        let trimmedSuggestion = suggestionText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSuggestion.isEmpty,
              let templeId = appState.temple?.id,
              let deviceId = appState.deviceId else {
            errorMessage = "Please enter a suggestion"
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            do {
                _ = try await APIService.shared.submitSuggestion(
                    templeId: templeId,
                    deviceId: deviceId,
                    suggestion: trimmedSuggestion
                )
                
                await MainActor.run {
                    isSubmitting = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    if let apiError = error as? APIError {
                        errorMessage = apiError.localizedDescription
                    } else {
                        errorMessage = "Failed to submit suggestion. Please try again."
                    }
                }
            }
        }
    }
}

// Keep all existing event views unchanged
struct UnifiedCalendarEventsView: View {
    let googleCalendarLink: String?
    let localEvents: [LocalEvent]?
    let eventsText: String?
    @Environment(\.dismiss) var dismiss
    @State private var googleEvents: [GoogleCalendarEvent] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedView: CalendarViewType = .list
    
    enum CalendarViewType {
        case calendar, list
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Default to list view - remove calendar picker for cleaner UI
                EventsListView(
                    googleEvents: googleEvents,
                    localEvents: localEvents ?? [],
                    eventsText: eventsText
                )
            }
            .navigationTitle("Upcoming Events")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await loadGoogleEvents()
            }
        }
    }
    
    private func loadGoogleEvents() async {
        guard let calendarUrl = googleCalendarLink, !calendarUrl.isEmpty else {
            await MainActor.run {
                self.isLoading = false
            }
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let fetchedEvents = try await GoogleCalendarService.shared.fetchUpcomingEvents(from: calendarUrl, limit: 50)
            await MainActor.run {
                self.googleEvents = fetchedEvents
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

struct CalendarMonthView: View {
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    let eventsText: String?
    @State private var currentDate = Date()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                HStack {
                    Button(action: { currentDate = Calendar.current.date(byAdding: .month, value: -1, to: currentDate) ?? currentDate }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                    }
                    Spacer()
                    Text(currentDate, style: .date)
                        .font(.title2)
                        .fontWeight(.semibold)
                    Spacer()
                    Button(action: { currentDate = Calendar.current.date(byAdding: .month, value: 1, to: currentDate) ?? currentDate }) {
                        Image(systemName: "chevron.right")
                            .font(.title2)
                    }
                }
                .padding()
                
                CalendarGridView(
                    date: currentDate,
                    googleEvents: googleEvents,
                    localEvents: localEvents
                )
                
                if let text = eventsText, !text.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Additional Information")
                            .font(.headline)
                        Text(text)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding()
                }
            }
        }
    }
}

struct CalendarGridView: View {
    let date: Date
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    
    var body: some View {
        let calendar = Calendar.current
        let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!
        let firstWeekday = calendar.component(.weekday, from: monthStart) - 1
        let daysInMonth = calendar.range(of: .day, in: .month, for: date)!.count
        
        VStack(spacing: 8) {
            HStack(spacing: 0) {
                ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(0..<firstWeekday, id: \.self) { _ in
                    Color.clear
                        .aspectRatio(1, contentMode: .fit)
                }
                
                ForEach(1...daysInMonth, id: \.self) { day in
                    let dayDate = calendar.date(byAdding: .day, value: day - 1, to: monthStart)!
                    let dayEvents = getEventsForDate(dayDate)
                    
                    VStack(spacing: 2) {
                        Text("\(day)")
                            .font(.caption)
                            .fontWeight(isToday(dayDate) ? .bold : .regular)
                            .foregroundColor(isToday(dayDate) ? .blue : .primary)
                        
                        if !dayEvents.isEmpty {
                            Circle()
                                .fill(Color.orange)
                                .frame(width: 6, height: 6)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(1, contentMode: .fit)
                    .background(isToday(dayDate) ? Color.blue.opacity(0.1) : Color.clear)
                    .cornerRadius(8)
                }
            }
        }
        .padding()
    }
    
    private func isToday(_ date: Date) -> Bool {
        Calendar.current.isDateInToday(date)
    }
    
    private func getEventsForDate(_ date: Date) -> [Any] {
        var events: [Any] = []
        for event in googleEvents {
            if let eventDate = event.start.displayDate,
               Calendar.current.isDate(eventDate, inSameDayAs: date) {
                events.append(event)
            }
        }
        for event in localEvents {
            if let eventDate = parseDate(event.date),
               Calendar.current.isDate(eventDate, inSameDayAs: date) {
                events.append(event)
            }
        }
        return events
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
}

struct EventsListView: View {
    let googleEvents: [GoogleCalendarEvent]
    let localEvents: [LocalEvent]
    let eventsText: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                let allEvents = combineAndSortEvents()
                
                if allEvents.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "calendar")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No upcoming events")
                            .font(.custom("Inter-SemiBold", size: 20))
                    }
                    .padding()
                } else {
                    ForEach(allEvents.indices, id: \.self) { index in
                        if let googleEvent = allEvents[index] as? GoogleCalendarEvent {
                            EventCard(event: googleEvent)
                        } else if let localEvent = allEvents[index] as? LocalEvent {
                            LocalEventCard(event: localEvent)
                        }
                    }
                }
                
                if let text = eventsText, !text.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Additional Information")
                            .font(.headline)
                        Text(text)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding()
                }
            }
            .padding()
        }
    }
    
    private func combineAndSortEvents() -> [Any] {
        var allEvents: [Any] = []
        allEvents.append(contentsOf: googleEvents)
        for localEvent in localEvents {
            if let date = parseDate(localEvent.date), date >= Date() {
                allEvents.append(localEvent)
            }
        }
        return allEvents.sorted { event1, event2 in
            let date1 = getDate(for: event1)
            let date2 = getDate(for: event2)
            return date1 < date2
        }
    }
    
    private func getDate(for event: Any) -> Date {
        if let googleEvent = event as? GoogleCalendarEvent {
            return googleEvent.start.displayDate ?? Date.distantFuture
        } else if let localEvent = event as? LocalEvent {
            return parseDate(localEvent.date) ?? Date.distantFuture
        }
        return Date.distantFuture
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
}

struct EventCard: View {
    let event: GoogleCalendarEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let date = event.start.displayDate {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                    Text(formatDate(date))
                        .font(.custom("Inter-SemiBold", size: 16))
                        .foregroundColor(.primary)
                }
            }
            
            Text(event.summary)
                .font(.custom("Inter-SemiBold", size: 20))
                .foregroundColor(.primary)
            
            if let description = event.description, !description.isEmpty {
                Text(description)
                    .font(.custom("Inter-Regular", size: 16))
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            
            if let endDate = event.end.displayDate, let startDate = event.start.displayDate {
                if endDate != startDate {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.gray)
                        Text("Until \(formatDate(endDate))")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct LocalEventCard: View {
    let event: LocalEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let date = parseDate(event.date) {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                    Text(formatDate(date))
                        .font(.custom("Inter-SemiBold", size: 16))
                        .foregroundColor(.primary)
                }
            }
            
            Text(event.title)
                .font(.custom("Inter-SemiBold", size: 20))
                .foregroundColor(.primary)
            
            if let description = event.description, !description.isEmpty {
                Text(description)
                    .font(.custom("Inter-Regular", size: 16))
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            
            if let startTime = event.startTime {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.gray)
                    if event.isAllDay == true {
                        Text("All Day")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    } else {
                        Text("\(startTime)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                        if let endTime = event.endTime {
                            Text(" - \(endTime)")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

// Religious Events View
struct ReligiousEventsView: View {
    let religiousEvents: [ReligiousEvent]
    @Environment(\.dismiss) var dismiss
    @State private var calendarEvents: [String: [GoogleCalendarEvent]] = [:]
    @State private var isLoadingEvents = false
    
    var body: some View {
        ZStack {
            // Blurred background
            Color.clear
                .ignoresSafeArea()
            
            // Main glass effect container
            VStack(spacing: 0) {
                // Centered header
                VStack(spacing: 4) {
                    Text("Religious Observances")
                        .font(.custom("Inter-SemiBold", size: 17))
                        .multilineTextAlignment(.center)
                    Text("Please note that certain fasting dates are subject to change based on the lunar calendar.")
                        .font(.custom("Inter-Regular", size: 11))
                        .italic()
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 16)
                .padding(.bottom, 12)
                
                // Scrollable content
                ScrollView {
                    VStack(spacing: 16) {
                        if religiousEvents.isEmpty {
                            VStack(spacing: 20) {
                                Image(systemName: "moon.stars.fill")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                                Text("No upcoming observances")
                                    .font(.custom("Inter-SemiBold", size: 20))
                            }
                            .padding()
                        } else {
                            ForEach(Array(religiousEvents.enumerated()), id: \.element.id) { index, event in
                                ReligiousEventCard(
                                    event: event,
                                    calendarEvents: calendarEvents[event.id] ?? [],
                                    isFirst: index == 0
                                )
                            }
                        }
                    }
                    .padding()
                }
                
                // Done button at bottom center
                Button(action: {
                    dismiss()
                }) {
                    Text("Done")
                        .font(.custom("Inter-SemiBold", size: 17))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(red: 0.6, green: 0.4, blue: 0.8))
                        .cornerRadius(12)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
                .padding(.top, 8)
            }
            .background(
                // Liquid glass effect
                ZStack {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color.white.opacity(0.25))
                        .background(
                            RoundedRectangle(cornerRadius: 24)
                                .fill(.ultraThinMaterial)
                        )
                }
            )
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.25), radius: 30, x: 0, y: 15)
            .frame(maxWidth: 900)
            .padding(.horizontal, 40)
        }
        .task {
            await loadCalendarEvents()
        }
    }
    
    private func loadCalendarEvents() async {
        isLoadingEvents = true
        
        // Load events from all Google calendar links
        for event in religiousEvents {
            guard let calendarLinks = event.googleCalendarLinks, !calendarLinks.isEmpty else {
                continue
            }
            
            var allEvents: [GoogleCalendarEvent] = []
            
            for calendarUrl in calendarLinks {
                do {
                    let events = try await GoogleCalendarService.shared.fetchUpcomingEvents(
                        from: calendarUrl,
                        limit: 50
                    )
                    allEvents.append(contentsOf: events)
                } catch {
                    print("[ReligiousEventsView] Failed to load calendar \(calendarUrl): \(error)")
                }
            }
            
            // Remove duplicates by ID and sort by date
            var seenIds: Set<String> = []
            let uniqueEvents = allEvents
                .filter { event in
                    if seenIds.contains(event.id) {
                        return false
                    }
                    seenIds.insert(event.id)
                    return true
                }
                .sorted { event1, event2 in
                    let date1 = event1.start.displayDate ?? Date.distantFuture
                    let date2 = event2.start.displayDate ?? Date.distantFuture
                    return date1 < date2
                }
            
            await MainActor.run {
                calendarEvents[event.id] = uniqueEvents
            }
        }
        
        isLoadingEvents = false
    }
}

struct ReligiousEventCard: View {
    let event: ReligiousEvent
    let calendarEvents: [GoogleCalendarEvent]
    let isFirst: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                if let date = parseDate(event.date) {
                    HStack {
                        Image(systemName: "moon.stars.fill")
                            .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.8))
                        Text(formatDate(date))
                            .font(.custom("Inter-SemiBold", size: 16))
                            .foregroundColor(.primary)
                    }
                }
                
                HStack(spacing: 8) {
                    Text(event.name)
                        .font(.custom("Inter-SemiBold", size: 20))
                        .foregroundColor(.primary)
                    
                    // Add icon based on event name
                    if shouldShowFruitBasketIcon(event.name) {
                        Image(systemName: "basket.fill")
                            .font(.system(size: 18))
                            .foregroundColor(Color(red: 1.0, green: 0.65, blue: 0.0)) // Orange color for fruit basket
                    } else if shouldShowFullMoonIcon(event.name) {
                        Image(systemName: "moon.fill")
                            .font(.system(size: 18))
                            .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.8)) // Purple color for full moon
                    }
                }
                
                if let description = event.description, !description.isEmpty {
                    Text(description)
                        .font(.custom("Inter-Regular", size: 16))
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                }
                
                if let startTime = event.startTime, !startTime.isEmpty {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.gray)
                        Text(startTime)
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Days until event indicator (only for first event)
            if isFirst, let eventDate = parseDate(event.date) {
                Spacer()
                VStack(spacing: 2) {
                    Text("Until")
                        .font(.custom("Inter-Regular", size: 12))
                        .foregroundColor(.secondary)
                    let daysUntil = daysUntilEvent(eventDate)
                    Text("\(daysUntil)")
                        .font(.custom("Inter-Bold", size: 32))
                        .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.8))
                    Text(daysUntil == 1 ? "day" : "days")
                        .font(.custom("Inter-Regular", size: 14))
                        .foregroundColor(.secondary)
                }
                .padding(.leading, 8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    private func daysUntilEvent(_ eventDate: Date) -> Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let eventDay = calendar.startOfDay(for: eventDate)
        
        let components = calendar.dateComponents([.day], from: today, to: eventDay)
        return max(0, components.day ?? 0)
    }
    
    private func shouldShowFruitBasketIcon(_ eventName: String) -> Bool {
        // Case-insensitive matching for any event containing "fast" or "shree hari jayanti"
        // Works for variations like "Ekadashi Fast", "Putrada Ekadashi Fast", "Shree Hari Jayanti", etc.
        let name = eventName.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        return name.contains("fast") || name.contains("shree hari jayanti")
    }
    
    private func shouldShowFullMoonIcon(_ eventName: String) -> Bool {
        // Case-insensitive matching for any event containing "poonam"
        // Works for variations like "Poonam", "Mukutotsav Poonam", "Kartik Poonam", etc.
        let name = eventName.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        return name.contains("poonam")
    }
}
