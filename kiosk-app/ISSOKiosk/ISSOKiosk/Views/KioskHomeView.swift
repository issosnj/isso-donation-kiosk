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
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        // First try to use asset (local, no network needed)
        if UIImage(named: "KioskBackground") != nil {
            Image("KioskBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
        } else if let backgroundImage = appState.backgroundImage {
            // Fallback to preloaded URL image
            Image(uiImage: backgroundImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
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
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                case .failure:
                    defaultGradient
                @unknown default:
                    defaultGradient
                }
            }
        } else {
            // Final fallback to default gradient
            defaultGradient
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
        GeometryReader { geometry in
            ZStack {
                // Check if any element uses X/Y positioning
                let usesXYPositioning = appState.temple?.kioskTheme?.layout?.homeScreenWelcomeTextX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenHeader1X != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenUnderGadiTextX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenAddressX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenTimeStatusX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenTapToDonateX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenQuickActionsX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenCustomMessageX != nil ||
                    appState.temple?.kioskTheme?.layout?.homeScreenWhatsAppButtonsX != nil
                
                if usesXYPositioning {
                    // Use absolute positioning for elements with X/Y coordinates
                    positionedElements(geometry: geometry)
                } else {
                    // Use default VStack layout
                    defaultLayout
                }
            }
        }
    }
    
    // Default layout (VStack-based, used when no X/Y coordinates are set)
    private var defaultLayout: some View {
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
                        .padding(.top, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenHeaderTopPadding ?? 60))
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
                    .padding(.top, 7)
            }
            
            Spacer()
                .frame(maxHeight: CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenSpacerMaxHeight ?? 100))
            
            // Centered content
            VStack(spacing: CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenContentSpacing ?? 20)) {
                
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
                    // Quick Actions Section (Events only)
                    let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
                    let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
                    let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
                    let hasEvents = hasGoogleCalendar || hasLocalEvents || hasEventsText
                    
                    if hasEvents {
                        VStack(spacing: 12) {
                            Text("Quick Actions")
                                .font(.custom("Inter-SemiBold", size: 20))
                                .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                            
                            HStack(spacing: 16) {
                                // Upcoming Events - only show if configured
                                ModernQuickActionButton(
                                    icon: "calendar",
                                    title: "Events",
                                    color: Color(red: 1.0, green: 0.58, blue: 0.0),
                                    isActive: true
                                ) {
                                    showEvents = true
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
        .overlay(alignment: .bottomLeading) {
            // WhatsApp and Observances buttons in bottom left corner (horizontal layout)
            whatsAppButtonsView
                .padding(.leading, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsLeftPadding ?? 20))
                .padding(.bottom, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsPadding ?? 50))
        }
    }
    
    // Positioned elements (using X/Y coordinates)
    // Elements with X/Y coordinates are positioned absolutely, others use default positions
    @ViewBuilder
    private func positionedElements(geometry: GeometryProxy) -> some View {
        // Welcome Text
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenWelcomeTextX,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenWelcomeTextY {
            Text("Welcome to Shree Swaminarayan Hindu Temple")
                .font(.system(size: 42, weight: .bold, design: .default))
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: geometry.size.width * 0.9)
                .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position if not set
            Text("Welcome to Shree Swaminarayan Hindu Temple")
                .font(.system(size: 42, weight: .bold, design: .default))
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.top, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenHeaderTopPadding ?? 60))
                .padding(.bottom, 4)
        }
        
        // Header 1
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenHeader1X,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenHeader1Y {
            Text(header1Text)
                .font(.custom("Inter-SemiBold", size: 32))
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: geometry.size.width * 0.9)
                .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position if not set
            Text(header1Text)
                .font(.custom("Inter-SemiBold", size: 32))
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.top, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenHeaderTopPadding ?? 60) + 60)
                .padding(.bottom, 4)
        }
        
        // Under Gadi Text
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenUnderGadiTextX,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenUnderGadiTextY {
            Text("Under Shree NarNarayan Dev Gadi")
                .font(.system(size: 20, weight: .regular, design: .default))
                .italic()
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .frame(maxWidth: geometry.size.width * 0.9)
                .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position if not set
            Text("Under Shree NarNarayan Dev Gadi")
                .font(.system(size: 20, weight: .regular, design: .default))
                .italic()
                .foregroundColor(colorFromHex("423232"))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenHeaderTopPadding ?? 60) + 120)
                .padding(.bottom, 4)
        }
        
        // Temple Address
        if let temple = appState.temple, let address = temple.address, !address.isEmpty {
            if let x = appState.temple?.kioskTheme?.layout?.homeScreenAddressX,
               let y = appState.temple?.kioskTheme?.layout?.homeScreenAddressY {
                Text(address)
                    .font(.custom("Inter-Regular", size: 18))
                    .foregroundColor(colorFromHex("423232"))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(maxWidth: geometry.size.width * 0.9)
                    .position(x: CGFloat(x), y: CGFloat(y))
            } else {
                // Default position if not set
                Text(address)
                    .font(.custom("Inter-Regular", size: 18))
                    .foregroundColor(colorFromHex("423232"))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity)
                    .padding(.top, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenHeaderTopPadding ?? 60) + 160)
                    .padding(.bottom, 16)
            }
        }
        
        // Time and Network Status
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenTimeStatusX,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenTimeStatusY {
            TimeAndNetworkStatusView()
                .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position (top right)
            TimeAndNetworkStatusView()
                .padding(.trailing, 20)
                .padding(.top, 7)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        }
        
        // Tap to Donate Button
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenTapToDonateX,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenTapToDonateY {
            GoldAccentDonateButton(
                buttonColor: appState.temple?.kioskTheme?.colors?.tapToDonateButtonColor ?? "#D4AF37",
                action: {
                Task {
                    await appState.preloadBackgroundImage()
                    await MainActor.run {
                        navigationState.showDonationFlow = true
                    }
                }
            })
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position (centered)
            GoldAccentDonateButton(
                buttonColor: appState.temple?.kioskTheme?.colors?.tapToDonateButtonColor ?? "#D4AF37",
                action: {
                Task {
                    await appState.preloadBackgroundImage()
                    await MainActor.run {
                        navigationState.showDonationFlow = true
                    }
                }
            })
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
        
        // Quick Actions
        let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
        let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
        let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
        let hasEvents = hasGoogleCalendar || hasLocalEvents || hasEventsText
        
        if hasEvents {
            if let x = appState.temple?.kioskTheme?.layout?.homeScreenQuickActionsX,
               let y = appState.temple?.kioskTheme?.layout?.homeScreenQuickActionsY {
                VStack(spacing: 12) {
                    Text("Quick Actions")
                        .font(.custom("Inter-SemiBold", size: 20))
                        .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                    
                    HStack(spacing: 16) {
                        ModernQuickActionButton(
                            icon: "calendar",
                            title: "Events",
                            color: Color(red: 1.0, green: 0.58, blue: 0.0),
                            isActive: true
                        ) {
                            showEvents = true
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .position(x: CGFloat(x), y: CGFloat(y))
            } else {
                // Default position
                VStack(spacing: 12) {
                    Text("Quick Actions")
                        .font(.custom("Inter-SemiBold", size: 20))
                        .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                    
                    HStack(spacing: 16) {
                        ModernQuickActionButton(
                            icon: "calendar",
                            title: "Events",
                            color: Color(red: 1.0, green: 0.58, blue: 0.0),
                            isActive: true
                        ) {
                            showEvents = true
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, 40)
                .padding(.top, 20)
                .frame(maxWidth: 800)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .offset(y: 200) // Position below Tap to Donate button
            }
        }
        
        // Custom Message
        if let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
            if let x = appState.temple?.kioskTheme?.layout?.homeScreenCustomMessageX,
               let y = appState.temple?.kioskTheme?.layout?.homeScreenCustomMessageY {
                Text(customMessage)
                    .font(.custom("Inter-Regular", size: 18))
                    .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: geometry.size.width * 0.9)
                    .position(x: CGFloat(x), y: CGFloat(y))
            } else {
                // Default position
                Text(customMessage)
                    .font(.custom("Inter-Regular", size: 18))
                    .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    .frame(maxWidth: 800)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                    .offset(y: 300) // Position below Quick Actions
            }
        }
        
        // WhatsApp/Observances Buttons
        if let x = appState.temple?.kioskTheme?.layout?.homeScreenWhatsAppButtonsX,
           let y = appState.temple?.kioskTheme?.layout?.homeScreenWhatsAppButtonsY {
            whatsAppButtonsView
                .position(x: CGFloat(x), y: CGFloat(y))
        } else {
            // Default position (bottom left)
            whatsAppButtonsView
                .padding(.leading, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsLeftPadding ?? 20))
                .padding(.bottom, CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsPadding ?? 50))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        }
    }
    
    // WhatsApp buttons view (reusable)
    private var whatsAppButtonsView: some View {
        HStack(spacing: 12) {
            // WhatsApp Group
            if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                Button(action: {
                    showWhatsAppQR = true
                }) {
                    HStack(spacing: 8) {
                        // WhatsApp icon (custom asset)
                        if UIImage(named: "WhatsAppIcon") != nil {
                            Image("WhatsAppIcon")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 32, height: 32)
                                .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
                        } else {
                            // Fallback to system icon if asset not found
                            Image(systemName: "message.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 32)
                                .background(Color(red: 0.18, green: 0.64, blue: 0.33))
                                .clipShape(Circle())
                                .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
                        }
                        
                        Text("WhatsApp Group")
                            .font(.custom("Inter-Medium", size: 16))
                            .foregroundColor(colorFromHex("423232")) // Matches header color
                    }
                }
                .buttonStyle(PlainButtonStyle())
                
                // Vertical separator
                Rectangle()
                    .fill(Color(red: 0.26, green: 0.20, blue: 0.20).opacity(0.3))
                    .frame(width: 1, height: 30)
            }
            
            // Observance
            Button(action: {
                showReligiousEvents = true
            }) {
                HStack(spacing: 8) {
                    // Observances icon (custom asset)
                    if UIImage(named: "ObservancesIcon") != nil {
                        Image("ObservancesIcon")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 32, height: 32)
                            .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
                    } else {
                        // Fallback to system bell icon if asset not found
                        Image(systemName: "bell.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.85, green: 0.7, blue: 0.3),
                                        Color(red: 0.95, green: 0.8, blue: 0.4)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .clipShape(Circle())
                            .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
                    }
                    
                    Text("Observance")
                        .font(.custom("Inter-Medium", size: 16))
                        .foregroundColor(colorFromHex("423232"))
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                backgroundView(geometry: geometry)
            }
            .ignoresSafeArea(.all, edges: .all)
            
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
                .environmentObject(appState)
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
                // Image background - new 1600x400 ratio (4:1)
                Image("DonateButtonBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 800, maxHeight: 200)
                    .opacity(isPressed ? 0.9 : 1.0)
                
                // Text overlay - centered on the button
                Text("Tap To Donate")
                    .font(.custom("Inter-Bold", size: 52))
                    .foregroundColor(.white)
                    .tracking(1.5) // Letter spacing for elegance
                    .shadow(color: Color.black.opacity(0.6), radius: 6, x: 0, y: 3)
                    .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
            }
            .frame(width: 800, height: 200)
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
    @EnvironmentObject var appState: AppState
    
    // Helper to convert hex string to Color
    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
        guard let hex = hex, !hex.isEmpty else {
            return defaultColor
        }
        
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") {
            hexSanitized.removeFirst()
        }
        
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        
        guard hexSanitized.count == 6,
              let rgb = UInt32(hexSanitized, radix: 16) else {
            return defaultColor
        }
        
        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Note text below title
                Text("Please note that certain fasting dates are subject to change based on the lunar calendar.")
                    .font(.custom(appState.temple?.kioskTheme?.fonts?.bodyFamily ?? "Inter-Regular", size: 13))
                    .italic()
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                    .padding(.bottom, 16)

                // LIST CONTENT
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        if religiousEvents.isEmpty {
                            VStack(spacing: 20) {
                                Image(systemName: "moon.stars.fill")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                                Text("No upcoming observances")
                                    .font(.custom(appState.temple?.kioskTheme?.fonts?.headingFamily ?? "Inter-SemiBold", size: 20))
                            }
                            .padding()
                        } else {
                            ForEach(Array(religiousEvents.enumerated()), id: \.element.id) { index, event in
                                VStack(spacing: 0) {
                                    ReligiousEventRow(
                                        event: event,
                                        showCountdown: index == 0
                                    )
                                    
                                    // Divider between rows (except last)
                                    if index < religiousEvents.count - 1 {
                                        Divider()
                                            .background(Color.gray.opacity(0.2))
                                            .padding(.horizontal, 18)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.vertical, 12)
                }
                .frame(minHeight: 320, maxHeight: 520)
                .background(Color.white)
                
                Spacer()
            }
            .padding()
            .background(Color.white)
            .navigationTitle("Religious Observances")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(colorFromHex(
                        appState.temple?.kioskTheme?.colors?.doneButtonColor,
                        defaultColor: Color.blue
                    ))
                }
            }
        }
        .background(Color.white)
    }
}

struct ReligiousEventRow: View {
    let event: ReligiousEvent
    let showCountdown: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // LEFT SIDE: Date and Event Name
            VStack(alignment: .leading, spacing: 10) {
                // DATE (no icon)
                Text(formattedDate(event.date))
                    .font(.custom("Inter-Medium", size: 15))
                    .foregroundColor(.secondary)

                // NAME (sanitized, no icons)
                Text(sanitizedEventName(event.name))
                    .font(.custom("Inter-SemiBold", size: 20))
                    .foregroundColor(.primary)
            }

            // RIGHT SIDE: Countdown (only first event)
            if showCountdown, let date = parseDate(event.date) {
                Spacer()
                VStack(spacing: 2) {
                    Text("Until")
                        .font(.custom("Inter-Regular", size: 12))
                        .foregroundColor(.secondary)

                    Text("\(daysUntil(date))")
                        .font(.custom("Inter-Bold", size: 32))
                        .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.8))

                    Text(daysUntil(date) == 1 ? "day" : "days")
                        .font(.custom("Inter-Regular", size: 14))
                        .foregroundColor(.secondary)
                }
                .frame(width: 90, alignment: .trailing)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 18)
        .padding(.vertical, 20)
    }

    // MARK: Helpers

    private func parseDate(_ date: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: date)
    }

    private func formattedDate(_ date: String) -> String {
        guard let d = parseDate(date) else { return date }
        let f = DateFormatter()
        f.dateStyle = .medium
        return f.string(from: d)
    }

    private func daysUntil(_ date: Date) -> Int {
        let day = Calendar.current.dateComponents(
            [.day],
            from: Calendar.current.startOfDay(for: Date()),
            to: Calendar.current.startOfDay(for: date)
        ).day ?? 0
        return max(0, day)
    }

    private func sanitizedEventName(_ name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // If the name is empty, return "Observance"
        guard !trimmed.isEmpty else {
            return "Observance"
        }
        
        // Split into words
        let words = trimmed.components(separatedBy: " ").filter { !$0.isEmpty }
        
        // Words to remove (case-insensitive)
        let wordsToRemove = ["fast", "shree", "hari", "jayanti", "poonam"]
        
        // Filter out words that match our removal list
        let filteredWords = words.filter { word in
            !wordsToRemove.contains { wordToRemove in
                word.lowercased() == wordToRemove.lowercased()
            }
        }
        
        // If after filtering we have no words left, use the original name
        if filteredWords.isEmpty {
            // Return original name with proper capitalization
            return words.map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }.joined(separator: " ")
        }
        
        // Return filtered words with proper capitalization
        return filteredWords.map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }.joined(separator: " ")
    }
}
