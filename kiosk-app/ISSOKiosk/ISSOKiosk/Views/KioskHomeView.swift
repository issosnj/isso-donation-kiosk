import SwiftUI
import UIKit
import Combine
import CoreImage.CIFilterBuiltins

struct KioskHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var navigationState: AppNavigationState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var languageManager = LanguageManager.shared
    @State private var showWhatsAppQR = false
    @State private var showEvents = false
    @State private var showReligiousEvents = false
    @State private var showLanguageSelector = false
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
        colorFromHex(hex, defaultColor: Color(red: 0.26, green: 0.20, blue: 0.20))
    }
    private func colorFromHex(_ hex: String?, defaultColor: Color) -> Color {
        guard let hex = hex, !hex.isEmpty else { return defaultColor }
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexSanitized.hasPrefix("#") { hexSanitized.removeFirst() }
        if hexSanitized.count == 3 {
            hexSanitized = hexSanitized.map { String($0) + String($0) }.joined()
        }
        guard hexSanitized.count == 6, let rgb = UInt32(hexSanitized, radix: 16) else {
            return defaultColor
        }
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
    
    // Background view - uses separate homepage background
    @ViewBuilder
    private func backgroundView(geometry: GeometryProxy) -> some View {
        Group {
            if UIImage(named: "KioskHomeBackground") != nil {
                Image("KioskHomeBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if UIImage(named: "KioskBackground") != nil {
                Image("KioskBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                defaultGradient
            }
        }
        .frame(width: geometry.size.width, height: geometry.size.height)
        .clipped()
        .overlay(textLegibilityOverlay)
    }
    
    @ViewBuilder
    private var textLegibilityOverlay: some View {
        if UIImage(named: "KioskHomeBackground") != nil || UIImage(named: "KioskBackground") != nil {
            LinearGradient(
                colors: [
                    Color.black.opacity(0.06),
                    Color.black.opacity(0.02),
                    Color.clear
                ],
                startPoint: .top,
                endPoint: .center
            )
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
    
    // Main content view - Pure SwiftUI VStack/HStack/Spacer layout
    private var mainContentView: some View {
        GeometryReader { geometry in
            ZStack {
                // Main content using VStack/HStack layout
                defaultLayout(geometry: geometry)
                
                // Status indicators — match DonationHomeView placement exactly
                VStack {
                    HStack {
                        ReaderBatteryStatusView()
                            .padding(.leading, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                        Spacer()
                    }
                    Spacer()
                }
                VStack {
                    HStack {
                        Spacer()
                        if appState.temple?.kioskTheme?.layout?.homeScreenTimeStatusVisible != false {
                            TimeAndNetworkStatusView()
                                .padding(.trailing, geometry.scale(DesignSystem.Layout.screenPadding))
                                .padding(.top, geometry.scale(DesignSystem.Spacing.sm))
                        }
                    }
                    Spacer()
                }
            }
        }
    }
    
    // Default layout (VStack-based, used when no X/Y coordinates are set)
    @ViewBuilder
    private func defaultLayout(geometry: GeometryProxy) -> some View {
        VStack(spacing: 0) {
            // Header — welcome/title/subtitle/address (theme-aware, matches sepia temple aesthetic)
            VStack(spacing: 0) {
                let headerColor = colorFromHex(appState.temple?.kioskTheme?.colors?.headingColor, defaultColor: Color(red: 0.22, green: 0.18, blue: 0.16))
                let headerMuted = headerColor.opacity(0.92)
                let welcomeLineSpacing = CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenWelcomeTextLineSpacing ?? 4)
                let heroPos = appState.temple?.kioskTheme?.layout?.homeScreenHeroTextPosition ?? "slightly-higher"
                let heroTopPadding = (heroPos == "centered" ? 60.0 : 32.0) + 100
                VStack(spacing: geometry.scale(welcomeLineSpacing)) {
                    if appState.temple?.kioskTheme?.layout?.homeScreenWelcomeTextVisible != false {
                        Text("welcome".localized)
                            .font(.system(size: geometry.scale(46), weight: .bold, design: .serif))
                            .foregroundColor(headerColor)
                            .shadow(color: Color.black.opacity(0.15), radius: 2, x: 0, y: 1)
                            .multilineTextAlignment(.center)
                            .lineLimit(nil)
                            .minimumScaleFactor(0.5)
                    }
                    if appState.temple?.kioskTheme?.layout?.homeScreenHeader1Visible != false {
                        Text(header1Text)
                            .font(.custom(DesignSystem.Typography.pageTitleFont, size: geometry.scale(34)))
                            .foregroundColor(headerColor)
                            .shadow(color: Color.black.opacity(0.12), radius: 2, x: 0, y: 1)
                            .multilineTextAlignment(.center)
                            .lineLimit(nil)
                            .minimumScaleFactor(0.5)
                    }
                    if appState.temple?.kioskTheme?.layout?.homeScreenUnderGadiTextVisible != false {
                        Text("underGadi".localized)
                            .font(.system(size: geometry.scale(DesignSystem.Typography.secondarySize + 10), weight: .regular, design: .serif))
                            .italic()
                            .foregroundColor(headerMuted)
                            .shadow(color: Color.black.opacity(0.1), radius: 1, x: 0, y: 1)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, geometry.scale(DesignSystem.Layout.screenPadding))
                .padding(.top, geometry.scale(heroTopPadding))
                .padding(.bottom, geometry.scale(DesignSystem.Spacing.sm))
                
                let addressTopSpacing = CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenAddressTopSpacing ?? 6)
                if appState.temple?.kioskTheme?.layout?.homeScreenAddressVisible != false {
                    if let temple = appState.temple, let address = temple.address, !address.isEmpty {
                        Text(address)
                            .font(.system(size: geometry.scale(DesignSystem.Typography.secondarySize + 9), weight: .regular, design: .serif))
                            .foregroundColor(headerMuted)
                            .shadow(color: Color.black.opacity(0.08), radius: 1, x: 0, y: 1)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .frame(maxWidth: .infinity)
                            .padding(.top, geometry.scale(addressTopSpacing))
                            .padding(.horizontal, geometry.scale(DesignSystem.Layout.screenPadding))
                            .padding(.bottom, geometry.scale(DesignSystem.Spacing.md))
                    } else {
                        Spacer()
                            .frame(height: geometry.scale(DesignSystem.Spacing.sm))
                    }
                }
            }
            
            // Flexible space — center Tap To Donate intentionally in available area
            Spacer(minLength: geometry.scale(32))
            
            // Centered content — Tap To Donate, main visual anchor
            VStack(spacing: geometry.scale(CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenContentSpacing ?? DesignSystem.Components.sectionSpacing))) {
                
                if appState.temple?.kioskTheme?.layout?.homeScreenTapToDonateVisible != false {
                    GoldAccentDonateButton(
                            buttonColor: appState.temple?.kioskTheme?.colors?.tapToDonateButtonColor ?? "#D4AF37",
                            action: {
                            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                                navigationState.showDonationFlow = true
                            }
                            
                            // If device has been idle for 5+ minutes, trigger reconnection in background
                            // This happens while user selects donation, so hardware is ready when they proceed to payment
                            if appState.hasBeenIdleFor5Minutes() {
                                appLog("⏰ Device idle for 5+ minutes - triggering reconnection in background...", category: "KioskHomeView")
                                Task.detached(priority: .utility) { [weak appState] in
                                    guard let appState = appState else { return }
                                    // Trigger same reconnection behavior as app restart (in background)
                                    await appState.ensureStripeConnectionReady()
                                    await MainActor.run {
                                        appLog("✅ Background reconnection complete - hardware ready for payment", category: "KioskHomeView")
                                    }
                                }
                            }
                        })
                    .padding(.horizontal, geometry.scale(DesignSystem.Spacing.xl))
                    .padding(.vertical, geometry.scale(DesignSystem.Components.sectionSpacing))
                    .frame(maxWidth: .infinity)
                }
                
                // Bottom: Action Buttons (only show active ones)
                if appState.temple?.kioskTheme?.layout?.homeScreenQuickActionsVisible != false {
                    VStack(spacing: geometry.scale(DesignSystem.Components.sectionSpacing)) {
                        // Quick Actions Section (Events only)
                        let hasGoogleCalendar = appState.temple?.homeScreenConfig?.googleCalendarLink?.isEmpty == false
                        let hasLocalEvents = (appState.temple?.homeScreenConfig?.localEvents?.isEmpty == false)
                        let hasEventsText = appState.temple?.homeScreenConfig?.eventsText?.isEmpty == false
                        let hasEvents = hasGoogleCalendar || hasLocalEvents || hasEventsText
                        
                            if hasEvents {
                                VStack(spacing: geometry.scale(DesignSystem.Components.inlineSpacing)) {
                                    Text("quickActions".localized)
                                        .font(.custom(DesignSystem.Typography.subsectionFont, size: geometry.scale(DesignSystem.Typography.subsectionSize)))
                                        .foregroundColor(Color(red: 0.3, green: 0.3, blue: 0.4))
                                    
                                    HStack(spacing: geometry.scale(DesignSystem.Spacing.md)) {
                                        // Upcoming Events - only show if configured
                                        ModernQuickActionButton(
                                            icon: "calendar",
                                            title: "events".localized,
                                            color: Color(red: 1.0, green: 0.58, blue: 0.0),
                                            isActive: true
                                        ) {
                                            showEvents = true
                                        }
                                    }
                                    .padding(.horizontal, geometry.scale(DesignSystem.Layout.screenPadding))
                                }
                            }
                    }
                    .padding(.horizontal, geometry.scale(DesignSystem.Spacing.xl))
                    .padding(.top, geometry.scale(DesignSystem.Components.sectionSpacing))
                }
                
                    // Custom Message at Bottom (if configured)
                    if appState.temple?.kioskTheme?.layout?.homeScreenCustomMessageVisible != false,
                       let customMessage = appState.temple?.homeScreenConfig?.customMessage, !customMessage.isEmpty {
                        Text(customMessage)
                            .font(.custom(DesignSystem.Typography.bodyFont, size: geometry.scale(DesignSystem.Typography.bodySize)))
                            .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, geometry.scale(DesignSystem.Spacing.xl))
                            .padding(.top, geometry.scale(DesignSystem.Components.sectionSpacing))
                    }
            }
            .frame(maxWidth: geometry.scale(800)) // Limit width for better centering
            .offset(y: -geometry.scale(30)) // Move Tap To Donate block up by 30pt
            
            Spacer(minLength: geometry.scale(32))
        }
        .overlay(alignment: .bottom) {
            // Bottom utility bar: WhatsApp + Observance bottom-left, Language selector bottom-right
            let showWhatsApp = appState.temple?.kioskTheme?.layout?.homeScreenWhatsAppVisible ?? appState.temple?.kioskTheme?.layout?.homeScreenWhatsAppButtonsVisible ?? true
            let showObservance = appState.showObservances
            let showLanguage = appState.temple?.kioskTheme?.layout?.homeScreenLanguageSelectorVisible != false
            let utilityLayout = appState.temple?.kioskTheme?.layout?.homeScreenUtilityBarLayout ?? "split"
            let hasLeftUtilities = (showWhatsApp && (appState.temple?.homeScreenConfig?.whatsAppLink?.isEmpty == false)) || showObservance
            if hasLeftUtilities || showLanguage {
                HStack(alignment: .center, spacing: DesignSystem.Spacing.md) {
                    if hasLeftUtilities { whatsAppObservanceView(showWhatsApp: showWhatsApp, showObservance: showObservance) }
                    if utilityLayout == "split" { Spacer(minLength: DesignSystem.Spacing.lg) }
                    if showLanguage {
                        LanguageSelectorView(languageManager: languageManager)
                            .padding(.horizontal, DesignSystem.Spacing.lg)
                            .padding(.vertical, DesignSystem.Spacing.sm)
                            .background(Capsule().fill(Color.white.opacity(0.12)))
                    }
                }
                .frame(maxWidth: .infinity, alignment: utilityLayout == "grouped-left" ? .leading : (utilityLayout == "grouped-right" ? .trailing : .center))
                .padding(.leading, geometry.scale(CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsLeftPadding ?? DesignSystem.Layout.screenPadding)))
                .padding(.trailing, geometry.scale(CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsRightPadding ?? DesignSystem.Layout.screenPadding)))
                .padding(.bottom, geometry.scale(CGFloat(appState.temple?.kioskTheme?.layout?.homeScreenBottomButtonsPadding ?? DesignSystem.Layout.bottomCornerPadding)))
            }
        }
    }
    
    // WhatsApp + Observances — homeScreenWhatsAppVisible from theme; showObservances from global kiosk config
    @ViewBuilder
    private func whatsAppObservanceView(showWhatsApp: Bool, showObservance: Bool) -> some View {
        HStack(spacing: DesignSystem.Spacing.md) {
            if showWhatsApp, let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink, !whatsAppLink.isEmpty {
                Button(action: {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    showWhatsAppQR = true
                }) {
                    HStack(spacing: DesignSystem.Spacing.sm) {
                        if UIImage(named: "WhatsAppIcon") != nil {
                            Image("WhatsAppIcon")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: DesignSystem.Components.iconSize, height: DesignSystem.Components.iconSize)
                        } else {
                            Image(systemName: "message.fill")
                                .font(.system(size: DesignSystem.Typography.secondarySize))
                                .foregroundColor(.white)
                                .frame(width: DesignSystem.Components.iconSize, height: DesignSystem.Components.iconSize)
                                .background(Color(red: 0.18, green: 0.64, blue: 0.33))
                                .clipShape(Circle())
                        }
                        Text("whatsappGroup".localized)
                            .font(.custom("Inter-SemiBold", size: DesignSystem.Typography.secondarySize + 3))
                            .foregroundColor(colorFromHex("423232").opacity(0.95))
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                }
                .buttonStyle(PlainButtonStyle())
                
                if showObservance {
                    Rectangle()
                        .fill(colorFromHex("423232").opacity(0.2))
                        .frame(width: 1, height: 18)
                }
            }
            
            if showObservance {
            Button(action: {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                showReligiousEvents = true
            }) {
                HStack(spacing: DesignSystem.Spacing.sm) {
                    if UIImage(named: "ObservancesIcon") != nil {
                        Image("ObservancesIcon")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: DesignSystem.Components.iconSize, height: DesignSystem.Components.iconSize)
                    } else {
                        Image(systemName: "bell.fill")
                            .font(.system(size: DesignSystem.Typography.secondarySize))
                            .foregroundColor(.white)
                            .frame(width: DesignSystem.Components.iconSize, height: DesignSystem.Components.iconSize)
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
                    }
                    Text("observance".localized)
                        .font(.custom("Inter-SemiBold", size: DesignSystem.Typography.secondarySize + 3))
                        .foregroundColor(colorFromHex("423232").opacity(0.95))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
            }
            .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(.horizontal, DesignSystem.Spacing.lg)
        .padding(.vertical, DesignSystem.Spacing.sm)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.12))
        )
    }
    
    var body: some View {
        ZStack {
            GeometryReader { geometry in
                backgroundView(geometry: geometry)
                    .id("homeBackground") // Stable identity to prevent recreation
            }
            .ignoresSafeArea(.all, edges: .all)
            
            mainContentView
        }
        .animation(.none, value: navigationState.showDonationFlow) // Disable animation for background during transition
        .fullScreenCover(isPresented: $showWhatsAppQR) {
            if let whatsAppLink = appState.temple?.homeScreenConfig?.whatsAppLink {
                QRCodeDisplayView(url: whatsAppLink, title: "whatsappGroup".localized, cachedImage: qrCodeCache[whatsAppLink])
                    .environmentObject(appState)
                    .presentationBackground(.clear)
            }
        }
        .sheet(isPresented: $showEvents) {
            UnifiedCalendarEventsView(
                googleCalendarLink: appState.temple?.homeScreenConfig?.googleCalendarLink,
                localEvents: appState.temple?.homeScreenConfig?.localEvents,
                eventsText: appState.temple?.homeScreenConfig?.eventsText
            )
        }
        .fullScreenCover(isPresented: $showReligiousEvents) {
            ReligiousEventsView(religiousEvents: appState.religiousEvents)
                .environmentObject(appState)
                .presentationBackground(.clear)
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
        // Use localized ISSO text - directly access languageManager to ensure SwiftUI observes changes
        return languageManager.translate("isso")
    }
    
    private var timeString: String {
        Self.timeFormatter.string(from: currentTime)
    }
}

// Reader Battery Status View Component (shows iPad battery and Stripe reader battery)
struct ReaderBatteryStatusView: View {
    @State private var readerBatteryLevel: Int? = nil
    @State private var deviceBatteryLevel: Int? = nil
    @State private var timer: Timer?
    
    var body: some View {
        HStack(spacing: DesignSystem.Spacing.md) {
            HStack(spacing: DesignSystem.Spacing.sm) {
                if let level = deviceBatteryLevel {
                    // Battery icon
                    Image(systemName: batteryIconName(for: level))
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(batteryColor(for: level))
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                    
                    // Battery percentage
                    Text("\(level)%")
                        .font(.custom("Inter-Medium", size: 16))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                } else {
                    // Battery level not available
                    Image(systemName: "battery.0")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                    
                    Text("--")
                        .font(.custom("Inter-Medium", size: 16))
                        .foregroundColor(.gray)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
            
            Text("|")
                .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.secondarySize))
                .foregroundColor(.white.opacity(0.5))
                .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
            
            HStack(spacing: DesignSystem.Spacing.sm) {
                if let level = readerBatteryLevel {
                    // Battery icon
                    Image(systemName: batteryIconName(for: level))
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(batteryColor(for: level))
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                    
                    // Battery percentage
                    Text("\(level)%")
                        .font(.custom("Inter-Medium", size: 16))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                } else {
                    // Reader not connected - show gray battery icon
                    Image(systemName: "battery.0")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                    
                    Text("--")
                        .font(.custom("Inter-Medium", size: 16))
                        .foregroundColor(.gray)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.batteryLevelDidChangeNotification)) { _ in
            updateDeviceBattery()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.batteryStateDidChangeNotification)) { _ in
            updateDeviceBattery()
        }
        .onAppear {
            // Enable battery monitoring for device battery
            UIDevice.current.isBatteryMonitoringEnabled = true
            updateBatteryLevels()
            
            // Update battery levels every 2 seconds for instant updates (especially for reader battery)
            timer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
                updateBatteryLevels()
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
    
    private func updateBatteryLevels() {
        // Update reader battery level
        readerBatteryLevel = StripeTerminalService.shared.getReaderBatteryLevel()
        
        // Update iPad/device battery level
        updateDeviceBattery()
    }
    
    private func updateDeviceBattery() {
        let batteryLevel = UIDevice.current.batteryLevel
        if batteryLevel >= 0 {
            // batteryLevel is 0.0 to 1.0, convert to percentage
            deviceBatteryLevel = Int(batteryLevel * 100)
        } else {
            deviceBatteryLevel = nil
        }
    }
    
    private func batteryIconName(for level: Int) -> String {
        if level > 75 {
            return "battery.100"
        } else if level > 50 {
            return "battery.75"
        } else if level > 25 {
            return "battery.50"
        } else if level > 10 {
            return "battery.25"
        } else {
            return "battery.0"
        }
    }
    
    private func batteryColor(for level: Int) -> Color {
        if level > 50 {
            return .green
        } else if level > 20 {
            return .yellow
        } else {
            return .red
        }
    }
}

struct TimeAndNetworkStatusView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var hardwareMonitor = HardwareMonitor.shared
    @State private var currentTime = Date()
    @State private var timer: Timer?
    @State private var tapCount = 0
    @State private var lastTapTime: Date?
    @State private var showPasswordPrompt = false
    
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
                HStack(spacing: DesignSystem.Spacing.sm) {
                    Circle()
                        .fill(hardwareMonitor.isHardwareConnected ? Color.green : Color.red)
                        .frame(width: 10, height: 10)
                        .shadow(color: (hardwareMonitor.isHardwareConnected ? Color.green : Color.red).opacity(0.4), radius: 2)
                    
                    Circle()
                        .fill(networkMonitor.isConnected ? Color.green : Color.red)
                        .frame(width: 10, height: 10)
                        .shadow(color: (networkMonitor.isConnected ? Color.green : Color.red).opacity(0.4), radius: 2)
                    
                    Text(timeString)
                        .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.bodySize))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                        .onTapGesture {
                            handleTimeTap()
                        }
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
        .fullScreenCover(isPresented: $showPasswordPrompt) {
            AdminPasswordView(isPresented: $showPasswordPrompt)
                .environmentObject(appState)
                .presentationBackground(.clear)
        }
    }
    
    private func handleTimeTap() {
        let now = Date()
        
        // Reset tap count if more than 3 seconds have passed since last tap
        if let lastTap = lastTapTime, now.timeIntervalSince(lastTap) > 3.0 {
            tapCount = 0
        }
        
        tapCount += 1
        lastTapTime = now
        
        appLog("🔧 Admin tap detected: \(tapCount)/10", category: "AdminAccess")
        
        // If 10 taps reached, show password prompt
        if tapCount >= 10 {
            tapCount = 0
            lastTapTime = nil
            showPasswordPrompt = true
            appLog("🔧 Admin access requested - showing password prompt", category: "AdminAccess")
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
            if isActive {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
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
            .frame(width: DesignSystem.Components.quickActionSize, height: DesignSystem.Components.quickActionSize)
            .background(isActive ? color : Color.gray.opacity(0.1))
            .cornerRadius(DesignSystem.Components.cardCornerRadius)
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
    let cachedImage: UIImage?
    @EnvironmentObject var appState: AppState

    var body: some View {
        PremiumKioskModal {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 0) {
                // Icon
                Group {
                    if UIImage(named: "WhatsAppIcon") != nil {
                        Image("WhatsAppIcon")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } else {
                        Image(systemName: "message.fill")
                            .font(.system(size: 32))
                            .foregroundColor(Color(red: 0.18, green: 0.64, blue: 0.33))
                    }
                }
                .frame(width: 52, height: 52)

                // Title
                Text("joinWhatsAppGroup".localized)
                    .font(.custom("Inter-Bold", size: 24))
                    .foregroundColor(Color(red: 0.12, green: 0.13, blue: 0.17))
                    .multilineTextAlignment(.center)
                    .padding(.top, 16)

                // Subtitle
                Text("whatsAppDescription".localized)
                    .font(.custom("Inter-Regular", size: 15))
                    .foregroundColor(Color(red: 0.55, green: 0.57, blue: 0.62))
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
                    .frame(maxWidth: 320)
                    .padding(.top, 8)

                // QR block — subtle premium well
                if let qrImage = cachedImage ?? generateQRCode(from: url) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 192, height: 192)
                        .padding(20)
                        .background(Color(red: 0.977, green: 0.977, blue: 0.982))
                        .cornerRadius(14)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color(red: 0.94, green: 0.945, blue: 0.955), lineWidth: 0.5)
                        )
                        .padding(.top, 18)
                }

                // Link — secondary
                Text(url)
                    .font(.custom("Inter-Regular", size: 12))
                    .foregroundColor(Color(red: 0.62, green: 0.64, blue: 0.68))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .truncationMode(.tail)
                    .padding(.top, 12)
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 24)
            }
            .frame(maxWidth: .infinity)
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
        Button(action: {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        }) {
            ZStack {
                // Image background - new 1600x400 ratio (4:1)
                Image("DonateButtonBackground")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 800, maxHeight: 200)
                    .opacity(isPressed ? 0.9 : 1.0)
                
                // Text overlay - centered on the button
                Text("tapToDonate".localized)
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
            // Subtle, calming pulse — premium feel without distraction
            pulseScale = 1.0
            withAnimation(
                Animation.easeInOut(duration: 2.5)
                    .repeatForever(autoreverses: true)
            ) {
                pulseScale = 1.02
            }
        }
        .onChange(of: navigationState.showDonationFlow) { _ in
            // Restart animation when returning from donation flow
            if !navigationState.showDonationFlow {
                pulseScale = 1.0
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(
                        Animation.easeInOut(duration: 2.5)
                            .repeatForever(autoreverses: true)
                    ) {
                        pulseScale = 1.02
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
    @State private var googleEvents: [GoogleCalendarEvent] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedView: CalendarViewType = .list

    enum CalendarViewType {
        case calendar, list
    }

    var body: some View {
        KioskModal(title: "upcomingEvents".localized, dismissButtonTitle: "done".localized) {
            VStack(spacing: 0) {
                EventsListView(
                    googleEvents: googleEvents,
                    localEvents: localEvents ?? [],
                    eventsText: eventsText
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
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

// Religious Events View (Observances modal)
struct ReligiousEventsView: View {
    let religiousEvents: [ReligiousEvent]
    @EnvironmentObject var appState: AppState

    var body: some View {
        PremiumKioskModal {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 0) {
                    Text("observance".localized)
                        .font(.custom("Inter-Bold", size: 24))
                        .foregroundColor(Color(red: 0.12, green: 0.13, blue: 0.17))

                    Text("observanceSubtitle".localized)
                        .font(.custom("Inter-Regular", size: 15))
                        .foregroundColor(Color(red: 0.55, green: 0.57, blue: 0.62))
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 24)

                // List
                if religiousEvents.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "moon.stars.fill")
                            .font(.system(size: 44))
                            .foregroundColor(Color(red: 0.72, green: 0.72, blue: 0.76))
                        Text("noUpcomingObservances".localized)
                            .font(.custom("Inter-Medium", size: 16))
                            .foregroundColor(Color(red: 0.55, green: 0.57, blue: 0.62))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 44)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 4) {
                            ForEach(Array(religiousEvents.enumerated()), id: \.element.id) { index, event in
                                ReligiousEventRow(
                                    event: event,
                                    showCountdown: index == 0,
                                    isToday: isEventToday(event.date),
                                    isFeatured: index == 0
                                )
                            }
                        }
                        .padding(.top, 6)
                        .padding(.bottom, 16)
                    }
                    .frame(minHeight: 200, maxHeight: 360)
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func isEventToday(_ dateString: String) -> Bool {
        guard let date = parseDate(dateString) else { return false }
        return Calendar.current.isDateInToday(date)
    }

    private func parseDate(_ dateString: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: dateString)
    }
}

struct ReligiousEventRow: View {
    let event: ReligiousEvent
    let showCountdown: Bool
    var isToday: Bool = false
    var isFeatured: Bool = false

    private var highlightBg: Color { Color(red: 0.998, green: 0.976, blue: 0.92) }
    private var highlightText: Color { Color(red: 0.58, green: 0.4, blue: 0.22) }
    private var primaryText: Color { Color(red: 0.14, green: 0.15, blue: 0.19) }
    private var secondaryText: Color { Color(red: 0.52, green: 0.54, blue: 0.6) }
    private var dividerColor: Color { Color(red: 0.96, green: 0.962, blue: 0.97) }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(displayEventName(event.name))
                        .font(.custom(isFeatured ? "Inter-SemiBold" : "Inter-Medium", size: 15))
                        .foregroundColor(isFeatured ? highlightText : primaryText)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                    if isFeatured {
                        Text(formattedDate(event.date))
                            .font(.custom("Inter-Regular", size: 12))
                            .foregroundColor(secondaryText)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                rightContent
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, isFeatured ? 20 : 16)
            .padding(.horizontal, isFeatured ? 16 : 0)
            .background(
                isFeatured
                    ? RoundedRectangle(cornerRadius: 12).fill(highlightBg)
                    : nil
            )
            .padding(.horizontal, isFeatured ? 4 : 0)

            if !isFeatured {
                Rectangle()
                    .fill(dividerColor)
                    .frame(height: 1)
            }
        }
        .padding(.bottom, isFeatured ? 16 : 0)
    }

    @ViewBuilder
    private var rightContent: some View {
        Group {
            if isToday {
                Text("today".localized)
                    .font(.custom("Inter-SemiBold", size: 13))
                    .foregroundColor(highlightText)
            } else if showCountdown, let date = parseDate(event.date) {
                VStack(spacing: 2) {
                    Text("Until")
                        .font(.custom("Inter-Regular", size: 10))
                        .foregroundColor(secondaryText)
                    Text("\(daysUntil(date))")
                        .font(.custom("Inter-Bold", size: 16))
                        .foregroundColor(Color(red: 0.48, green: 0.34, blue: 0.7))
                    Text(daysUntil(date) == 1 ? "day" : "days")
                        .font(.custom("Inter-Regular", size: 10))
                        .foregroundColor(secondaryText)
                }
                .frame(alignment: .trailing)
            } else {
                Text(formattedDate(event.date))
                    .font(.custom("Inter-Regular", size: 12))
                    .foregroundColor(Color(red: 0.55, green: 0.57, blue: 0.63))
            }
        }
        .frame(alignment: .trailing)
        .frame(minWidth: 60, alignment: .trailing)
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

    /// Returns the full event name for display (no truncation or word filtering).
    private func displayEventName(_ name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "observance".localized : trimmed
    }
}
