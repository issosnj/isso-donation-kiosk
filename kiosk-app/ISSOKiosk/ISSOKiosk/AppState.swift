import Foundation
import Combine
import UIKit

class AppState: ObservableObject {
    @Published var isActivated = false
    @Published var deviceToken: String?
    @Published var deviceId: String?
    @Published var temple: Temple?
    @Published var categories: [DonationCategory] = []
    @Published var religiousEvents: [ReligiousEvent] = []
    @Published var languageManager = LanguageManager.shared
    
    // Track last successful donation time for idle reconnection
    @Published var lastSuccessfulDonationTime: Date?
    
    private let keychain = KeychainHelper()
    private var themeRefreshTimer: Timer?
    private var categoryRefreshTimer: Timer?
    private var religiousEventsRefreshTimer: Timer?
    
    init() {
        loadStoredCredentials()
    }
    
    deinit {
        themeRefreshTimer?.invalidate()
        categoryRefreshTimer?.invalidate()
        religiousEventsRefreshTimer?.invalidate()
    }
    
    func activate(deviceCode: String) async throws {
        let response = try await APIService.shared.activateDevice(deviceCode: deviceCode)
        
        await MainActor.run {
            self.deviceToken = response.deviceToken
            self.temple = response.temple
            self.categories = response.categories
            self.isActivated = true
            
            // Extract device ID from JWT token
            let token = response.deviceToken
                self.deviceId = extractDeviceId(from: token)
                keychain.save(token, forKey: "deviceToken")
            
            // Start automatic theme refresh timer
            startThemeRefreshTimer()
            
            // Start automatic category refresh timer
            startCategoryRefreshTimer()
        }
        
        // Stripe Terminal will be initialized when payment is needed
        
        // Send initial telemetry immediately after activation
        Task.detached(priority: .utility) { [weak self] in
            guard let self = self else { return }
            if let deviceId = await self.deviceId {
                do {
                    try await DeviceTelemetryService.shared.sendTelemetry(deviceId: deviceId)
                    await MainActor.run {
                        appLog("✅ Initial telemetry sent after activation", category: "DeviceTelemetry")
                    }
                } catch {
                    await MainActor.run {
                        appLog("⚠️ Failed to send initial telemetry: \(error.localizedDescription)", category: "DeviceTelemetry")
                    }
                }
            }
        }
    }
    
    private func loadStoredCredentials() {
        if let token = keychain.load(forKey: "deviceToken") {
            self.deviceToken = token
            self.deviceId = extractDeviceId(from: token)
            APIService.shared.setDeviceToken(token)
            
            // Don't set isActivated yet - wait for temple config to load first
            // This ensures loading screen shows until server connection is ready
            appLog("📡 Found stored credentials - loading temple config from server...", category: "AppState")
            
            // Add a safety timeout: if temple config doesn't load within 15 seconds, activate UI anyway
            let timeoutTask = Task { @MainActor in
                try? await Task.sleep(nanoseconds: 15_000_000_000) // 15 seconds
                if !self.isActivated {
                    appLog("⏰ Safety timeout reached - activating UI even without temple config", category: "AppState")
                    self.isActivated = true
                }
            }
            
            // Load temple config FIRST with highest priority - UI waits for this
            Task(priority: .userInitiated) { [weak self] in
                guard let self = self else { return }
                await self.loadTempleConfig()
                // Only activate after temple config loads successfully
                await MainActor.run {
                    // Cancel timeout task since we loaded successfully
                    timeoutTask.cancel()
                    
                    if self.temple != nil {
                        self.isActivated = true
                        appLog("✅ Temple config loaded - activating UI", category: "AppState")
                    } else {
                        // Even if temple config fails, activate after timeout so UI can show
                        appLog("⚠️ Temple config failed but activating UI anyway", category: "AppState")
                        self.isActivated = true
                    }
                }
                
                // Stripe Terminal will be initialized when payment is needed
            }
        } else {
            appLog("ℹ️ No stored credentials found - showing activation screen", category: "AppState")
        }
    }
    
    func refreshTempleConfig() async {
        // Prevent refresh if initial load is still in progress
        if isLoadingTempleConfig {
            print("[AppState] ⚠️ Temple config load in progress - skipping refresh")
            return
        }
        
        // Prevent duplicate refresh calls
        guard !isRefreshingTempleConfig else {
            print("[AppState] ⚠️ Temple config refresh already in progress - skipping duplicate call")
            return
        }
        
        // Refresh temple config to get latest theme settings
        guard let token = deviceToken,
              let templeId = extractTempleId(from: token) else {
            print("[AppState] ⚠️ Cannot refresh temple config - missing token or templeId")
            return
        }
        
        isRefreshingTempleConfig = true
        print("[AppState] 🔄 Refreshing temple config for theme updates...")
        
        defer {
            Task { @MainActor in
                isRefreshingTempleConfig = false
            }
        }
        
        do {
            let temple = try await APIService.shared.getTemple(templeId: templeId)
            // Check if background URL changed (for cache invalidation)
            let _ = self.temple?.homeScreenConfig?.backgroundImageUrl
            let _ = temple.homeScreenConfig?.backgroundImageUrl
            
            await MainActor.run {
                self.temple = temple
                print("[AppState] ✅ Temple config refreshed (including theme)")
            }
            
            // Don't automatically refresh categories here - let timers handle it to avoid duplicates
            // Categories will be refreshed by the category refresh timer
        } catch {
            print("[AppState] ❌ Failed to refresh temple config: \(error.localizedDescription)")
        }
    }
    
    func refreshCategories() async {
        // Prevent duplicate refresh calls
        guard !isRefreshingCategories else {
            print("[AppState] ⚠️ Category refresh already in progress - skipping duplicate call")
            return
        }
        
        guard let templeId = extractTempleId(from: deviceToken ?? "") else {
            print("[AppState] ⚠️ Cannot refresh categories - missing templeId")
            return
        }
        
        isRefreshingCategories = true
        
        defer {
            Task { @MainActor in
                isRefreshingCategories = false
            }
        }
        
        do {
            let categories = try await APIService.shared.getKioskCategories(templeId: templeId)
            
            await MainActor.run {
                self.categories = categories
                if !categories.isEmpty {
                    print("[AppState] ✅ Loaded \(categories.count) categories")
                }
            }
        } catch {
            print("[AppState] ❌ Failed to refresh categories: \(error.localizedDescription)")
            await MainActor.run {
                self.categories = []
            }
        }
    }
    
    func refreshReligiousEvents() async {
        
        do {
            let events = try await APIService.shared.getReligiousEvents()
            
            // Filter out past events - only show events on or after today
            let today = Calendar.current.startOfDay(for: Date())
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            
            let upcomingEvents = events.filter { event in
                // Only include active events
                guard event.isActive == true else { return false }
                
                // Parse the event date
                guard let eventDate = dateFormatter.date(from: event.date) else {
                    print("[AppState] ⚠️ Invalid date format for event: \(event.name) - \(event.date)")
                    return false
                }
                
                // Compare dates (ignoring time)
                let eventDateStart = Calendar.current.startOfDay(for: eventDate)
                return eventDateStart >= today
            }
            
            await MainActor.run {
                self.religiousEvents = upcomingEvents
                if upcomingEvents.isEmpty {
                    print("[AppState] ⚠️ No upcoming religious events")
                } else {
                    print("[AppState] ✅ Loaded \(upcomingEvents.count) upcoming events")
                }
            }
        } catch {
            print("[AppState] ❌ Failed to refresh religious events: \(error.localizedDescription)")
            if let apiError = error as? APIError {
                print("[AppState] ❌ API Error: \(apiError)")
            }
            await MainActor.run {
                self.religiousEvents = []
            }
        }
    }
    
    private var isLoadingTempleConfig = false // Guard to prevent multiple simultaneous loads
    private var isRefreshingTempleConfig = false // Guard to prevent duplicate refresh calls
    private var isRefreshingCategories = false // Guard to prevent duplicate category refresh calls
    private var hasAttemptedStripeConnection = false // Guard to prevent multiple connection attempts on startup
    
    private func loadTempleConfig() async {
        // Prevent multiple simultaneous temple config loads
        if isLoadingTempleConfig {
            await MainActor.run {
                appLog("⚠️ Temple config load already in progress - skipping duplicate call", category: "AppState")
            }
            return
        }
        
        // Fetch temple config from backend using templeId from JWT token
        guard let token = deviceToken,
              let templeId = extractTempleId(from: token) else {
            appLog("⚠️ Cannot load temple config - missing token or templeId", category: "AppState")
            // Don't set isActivated here - it should already be set if we have credentials
            // Only set it if this is called from activate() (first-time activation)
            if !isActivated {
                await MainActor.run {
                    self.isActivated = true
                }
            }
            return
        }
        
        await MainActor.run {
            isLoadingTempleConfig = true
        }
        defer {
            Task { @MainActor in
                isLoadingTempleConfig = false
            }
        }
        
        // Optimized for faster startup - only 1 retry (2 total attempts) with shorter timeout
        let maxRetries = 1
        
        for attempt in 0..<maxRetries {
            if attempt > 0 {
                // Short backoff: 1s between retries
                try? await Task.sleep(nanoseconds: 1_000_000_000)
            }
            
            do {
                // Use 8s timeout for all attempts (faster than 30s default, but not too aggressive)
                let timeout = 8.0
                let temple = try await APIService.shared.getTemple(templeId: templeId, timeout: timeout)
                
                await MainActor.run {
                    self.temple = temple
                    // Set activated when temple config loads successfully
                    // This ensures UI only shows when server connection is ready
                    if !self.isActivated {
                        self.isActivated = true
                        appLog("✅ Temple config loaded - activating UI", category: "AppState")
                    }
                    appLog("✅ Temple config loaded: \(temple.name)", category: "AppState")
                    
                    // Start automatic theme refresh timer if not already started
                    if themeRefreshTimer == nil {
                        startThemeRefreshTimer()
                    }
                    
                    // Start automatic category refresh timer if not already started
                    if categoryRefreshTimer == nil {
                        startCategoryRefreshTimer()
                    }
                    
                    // Start automatic religious events refresh timer if not already started
                    if religiousEventsRefreshTimer == nil {
                        startReligiousEventsRefreshTimer()
                    }
                }
                
                // Load categories and religious events in background - don't block UI
                // These are non-critical and can load after temple config
                Task.detached(priority: .utility) { [weak self] in
                    guard let self = self else { return }
                    await self.refreshCategories()
                    await self.refreshReligiousEvents()
                }
                
                // Automatically connect Stripe reader in background after temple config loads
                // This ensures reader is ready when user wants to make a payment
                Task.detached(priority: .utility) { [weak self] in
                    guard let self = self else { return }
                    await self.connectStripeReaderOnStartup()
                }
                
                // Success! Exit retry loop
                return
                
            } catch {
                // Error logged, continue retrying
                print("[AppState] ❌ Failed to load temple config (attempt \(attempt + 1)/\(maxRetries))")
                print("[AppState] ❌ Error type: \(type(of: error))")
                print("[AppState] ❌ Error description: \(error.localizedDescription)")
                if let apiError = error as? APIError {
                    print("[AppState] ❌ API Error details: \(apiError)")
                }
                
                // If this was the last attempt, activate UI anyway (with nil temple)
                // This prevents infinite loading screen if server is unreachable
                if attempt == maxRetries - 1 {
                    await MainActor.run {
                        appLog("⚠️ Max retries reached - activating UI without temple config", category: "AppState")
                        appLog("💡 Will retry in background - UI may show loading state", category: "AppState")
                        self.isActivated = true
                    }
                    
                    // Stripe Terminal will be initialized when payment is needed
                    
                    // Start a background retry task after short delay
                    Task.detached(priority: .utility) { [weak self] in
                        guard let self = self else { return }
                        // Wait 10 seconds then retry once more in background
                        try? await Task.sleep(nanoseconds: 10_000_000_000)
                        await self.loadTempleConfig()
                    }
                }
            }
        }
    }
    
    
    private func extractTempleId(from token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        
        guard let payloadData = base64URLDecode(parts[1]) else { return nil }
        
        do {
            if let payload = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
               let templeId = payload["templeId"] as? String {
                return templeId
            }
        } catch {
            print("Error decoding JWT payload: \(error)")
        }
        
        return nil
    }
    /// Check if device has been idle for 5+ minutes since last successful donation
    func hasBeenIdleFor5Minutes() -> Bool {
        guard let lastDonationTime = lastSuccessfulDonationTime else {
            // No previous donation - consider it idle (will reconnect on first donation)
            return true
        }
        
        let timeSinceLastDonation = Date().timeIntervalSince(lastDonationTime)
        let fiveMinutes: TimeInterval = 5 * 60 // 5 minutes in seconds
        
        return timeSinceLastDonation >= fiveMinutes
    }
    
    /// Record successful donation time
    func recordSuccessfulDonation() {
        lastSuccessfulDonationTime = Date()
        appLog("✅ Recorded successful donation time: \(Date())", category: "AppState")
    }
    
    /// Ensure Stripe Terminal connection is ready
    /// Stripe Terminal will be initialized when payment is needed
    func ensureStripeConnectionReady() async {
        appLog("🔄 Stripe Terminal will be initialized when payment starts", category: "AppState")
    }
    
    /// Automatically connect Stripe reader on app startup
    /// This runs in the background after temple config loads
    private func connectStripeReaderOnStartup() async {
        // Only connect once on startup, not on every refresh
        if hasAttemptedStripeConnection {
            appLog("ℹ️ Stripe reader connection already attempted on startup", category: "AppState")
            return
        }
        
        // Check if reader is already connected
        let readerInfo = StripeTerminalService.shared.getReaderInfo()
        if readerInfo.connected {
            appLog("✅ Stripe reader already connected", category: "AppState")
            hasAttemptedStripeConnection = true
            return
        }
        
        hasAttemptedStripeConnection = true
        appLog("🔌 Auto-connecting Stripe reader on startup...", category: "AppState")
        
        do {
            // Get Stripe credentials
            let credentials = try await APIService.shared.getStripeCredentials()
            
            await MainActor.run {
                // Initialize Stripe Terminal SDK
                StripeTerminalService.shared.initialize(
                    connectionToken: credentials.connectionToken,
                    locationId: credentials.locationId
                ) { error in
                    if let error = error {
                        appLog("⚠️ Failed to initialize Stripe SDK on startup: \(error.localizedDescription)", category: "AppState")
                        return
                    }
                    
                    appLog("✅ Stripe SDK initialized on startup", category: "AppState")
                    
                    // Get view controller for connection
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let window = windowScene.windows.first,
                       let rootViewController = window.rootViewController {
                        
                        var topViewController = rootViewController
                        while let presented = topViewController.presentedViewController {
                            topViewController = presented
                        }
                        
                        if let navController = topViewController as? UINavigationController {
                            topViewController = navController.topViewController ?? topViewController
                        }
                        
                        // Connect to reader in background (non-blocking)
                        StripeTerminalService.shared.connectToReader(from: topViewController) { connectError in
                            if let connectError = connectError {
                                appLog("⚠️ Failed to auto-connect reader on startup: \(connectError.localizedDescription)", category: "AppState")
                                appLog("💡 Reader will connect automatically when payment starts", category: "AppState")
                            } else {
                                appLog("✅ Stripe reader auto-connected on startup", category: "AppState")
                            }
                        }
                    } else {
                        appLog("⚠️ Could not find view controller for auto-connection", category: "AppState")
                        appLog("💡 Reader will connect automatically when payment starts", category: "AppState")
                    }
                }
            }
        } catch {
            appLog("⚠️ Failed to get Stripe credentials on startup: \(error.localizedDescription)", category: "AppState")
            appLog("💡 Reader will connect automatically when payment starts", category: "AppState")
        }
    }
    
    // Extract device ID from JWT token payload
    private func extractDeviceId(from token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        
        // Decode the payload (second part)
        guard let payloadData = base64URLDecode(parts[1]) else { return nil }
        
        do {
            if let payload = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
               let deviceId = payload["deviceId"] as? String {
                return deviceId
            }
        } catch {
            print("Error decoding JWT payload: \(error)")
        }
        
        return nil
    }
    
    // Base64 URL decode helper
    private func base64URLDecode(_ string: String) -> Data? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 = base64.padding(toLength: base64.count + 4 - remainder, withPad: "=", startingAt: 0)
        }
        
        return Data(base64Encoded: base64)
    }
    
    // Start automatic theme refresh timer (refreshes every 30 seconds)
    private func startThemeRefreshTimer() {
        // Stop existing timer if any
        themeRefreshTimer?.invalidate()
        
        // Only start if device is activated
        guard isActivated else {
            print("[AppState] ⏸️ Skipping theme refresh timer - device not activated")
            return
        }
        
        print("[AppState] 🔄 Starting automatic theme refresh timer (every 30 seconds)")
        
        // Refresh immediately on first start (non-blocking background task)
        Task.detached(priority: .utility) { [weak self] in
            guard let self = self else { return }
            await refreshTempleConfig()
        }
        
        // Then refresh every 30 seconds (all in background)
        themeRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task.detached(priority: .utility) { [weak self] in
                guard let self = self else { return }
                await self.refreshTempleConfig()
            }
        }
    }
    
    // Stop theme refresh timer
    func stopThemeRefreshTimer() {
        themeRefreshTimer?.invalidate()
        themeRefreshTimer = nil
        print("[AppState] ⏸️ Stopped theme refresh timer")
    }
    
    // Start automatic category refresh timer (refreshes every 30 seconds)
    private func startCategoryRefreshTimer() {
        // Stop existing timer if any
        categoryRefreshTimer?.invalidate()
        
        // Only start if device is activated
        guard isActivated else {
            print("[AppState] ⏸️ Skipping category refresh timer - device not activated")
            return
        }
        
        print("[AppState] 🔄 Starting automatic category refresh timer (every 30 seconds)")
        
        // Don't refresh immediately - categories are loaded in loadTempleConfig()
        // Timer will handle periodic refreshes
        
        // Then refresh every 30 seconds (all in background)
        categoryRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task.detached(priority: .utility) { [weak self] in
                guard let self = self else { return }
                await self.refreshCategories()
            }
        }
    }
    
    // Stop category refresh timer
    private func stopCategoryRefreshTimer() {
        categoryRefreshTimer?.invalidate()
        categoryRefreshTimer = nil
        print("[AppState] ⏸️ Stopped category refresh timer")
    }
    
    // Start automatic religious events refresh timer (refreshes every 5 minutes)
    private func startReligiousEventsRefreshTimer() {
        // Stop existing timer if any
        religiousEventsRefreshTimer?.invalidate()
        
        // Only start if device is activated
        guard isActivated else {
            print("[AppState] ⏸️ Skipping religious events refresh timer - device not activated")
            return
        }
        
        print("[AppState] 🔄 Starting automatic religious events refresh timer (every 5 minutes)")
        
        // Don't refresh immediately - events are loaded in loadTempleConfig()
        // Timer will handle periodic refreshes
        
        // Then refresh every 5 minutes (300 seconds) - all in background
        religiousEventsRefreshTimer = Timer.scheduledTimer(withTimeInterval: 300.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task.detached(priority: .utility) { [weak self] in
                guard let self = self else { return }
                await self.refreshReligiousEvents()
            }
        }
    }
    
    // Stop religious events refresh timer
    private func stopReligiousEventsRefreshTimer() {
        religiousEventsRefreshTimer?.invalidate()
        religiousEventsRefreshTimer = nil
        print("[AppState] ⏸️ Stopped religious events refresh timer")
    }
}

struct Temple: Codable {
    let id: String
    let name: String
    let address: String?
    let logoUrl: String?
    let branding: Branding?
    let squareLocationId: String?
    let homeScreenConfig: HomeScreenConfig?
    let kioskTheme: KioskTheme?
    let yajmanOpportunitiesEnabled: Bool? // Master admin can enable yajman sponsorship tiers
}

struct KioskTheme: Codable, Equatable {
    let fonts: ThemeFonts?
    let colors: ThemeColors?
    let layout: ThemeLayout?
}

struct ThemeFonts: Codable, Equatable {
    let headingFamily: String?
    let headingSize: Double?
    let buttonFamily: String?
    let buttonSize: Double?
    let bodyFamily: String?
    let bodySize: Double?
}

struct ThemeColors: Codable, Equatable {
    let headingColor: String?
    let buttonTextColor: String?
    let bodyTextColor: String?
    let subtitleColor: String?
    let quantityTotalColor: String?
    let tapToDonateButtonColor: String?
    let categorySelectedColor: String?
    let categoryUnselectedColor: String?
    let amountSelectedColor: String?
    let amountUnselectedColor: String?
    let doneButtonColor: String? // Color for Done button in modals (e.g., Religious Observances)
    let returnToHomeButtonColor: String? // Color for Return to Home button
    let proceedToPaymentButtonColor: String? // Color for Proceed to Payment button
    let continueButtonColor: String? // Color for Continue button in keypad popups (donor info)
    let tapToDonateButtonGradient: Bool? // Use gradient for Tap to Donate button
    let returnToHomeButtonGradient: Bool? // Use gradient for Return to Home button
    let proceedToPaymentButtonGradient: Bool? // Use gradient for Proceed to Payment button
    let doneButtonGradient: Bool? // Use gradient for Done button
    let continueButtonGradient: Bool? // Use gradient for Continue button in keypad popups
}

struct ThemeLayout: Codable, Equatable {
    let categoryBoxMaxWidth: Double?
    let amountButtonWidth: Double?
    let amountButtonHeight: Double?
    let categoryButtonHeight: Double?
    let headerTopPadding: Double?
    let categoryHeaderTopPadding: Double?
    // Home Screen Layout Positioning (Legacy - kept for backward compatibility)
    let homeScreenHeaderTopPadding: Double?
    let homeScreenSpacerMaxHeight: Double?
    let homeScreenContentSpacing: Double?
    let homeScreenBottomButtonsPadding: Double?
    let homeScreenBottomButtonsLeftPadding: Double?
    // Home Screen Element Positioning (X/Y Coordinates)
    // X and Y coordinates are in points (pixels) relative to screen top-left (0,0)
    // If not set, elements use default layout positioning
    let homeScreenWelcomeTextX: Double?
    let homeScreenWelcomeTextY: Double?
    let homeScreenHeader1X: Double?
    let homeScreenHeader1Y: Double?
    let homeScreenUnderGadiTextX: Double?
    let homeScreenUnderGadiTextY: Double?
    let homeScreenAddressX: Double?
    let homeScreenAddressY: Double?
    let homeScreenTimeStatusX: Double?
    let homeScreenTimeStatusY: Double?
    let homeScreenTapToDonateX: Double?
    let homeScreenTapToDonateY: Double?
    let homeScreenQuickActionsX: Double?
    let homeScreenQuickActionsY: Double?
    let homeScreenCustomMessageX: Double?
    let homeScreenCustomMessageY: Double?
    let homeScreenWhatsAppButtonsX: Double?
    let homeScreenWhatsAppButtonsY: Double?
    let homeScreenLanguageSelectorX: Double?
    let homeScreenLanguageSelectorY: Double?
    // Home Screen Element Visibility (hide/unhide)
    let homeScreenWelcomeTextVisible: Bool?
    let homeScreenHeader1Visible: Bool?
    let homeScreenUnderGadiTextVisible: Bool?
    let homeScreenAddressVisible: Bool?
    let homeScreenTimeStatusVisible: Bool?
    let homeScreenTapToDonateVisible: Bool?
    let homeScreenQuickActionsVisible: Bool?
    let homeScreenCustomMessageVisible: Bool?
    let homeScreenWhatsAppButtonsVisible: Bool?
    let homeScreenLanguageSelectorVisible: Bool?
    let sectionSpacing: Double?
    let categoryAmountSectionSpacing: Double?
    let buttonSpacing: Double?
    let cornerRadius: Double?
    let quantityTotalSpacing: Double?
    let donationSelectionPageLeftPadding: Double?
    let donationSelectionPageRightPadding: Double?
    let customAmountKeypadX: Double?
    let customAmountKeypadY: Double?
    let customAmountKeypadWidth: Double?
    let customAmountKeypadButtonHeight: Double?
    let customAmountKeypadButtonSpacing: Double?
    let customAmountKeypadButtonCornerRadius: Double?
    let customAmountKeypadBackgroundColor: String?
    let customAmountKeypadBorderColor: String?
    let customAmountKeypadBorderWidth: Double?
    let customAmountKeypadGlowColor: String?
    let customAmountKeypadGlowRadius: Double?
    let customAmountKeypadButtonColor: String?
    let customAmountKeypadButtonTextColor: String?
    let customAmountKeypadNumberFontSize: Double?
    let customAmountKeypadLetterFontSize: Double?
    let customAmountKeypadPadding: Double?
    let customAmountKeypadCornerRadius: Double?
    let backgroundImageUrl: String? // URL to custom background image for kiosk home screen
    // Donation Details Page Layout
    let detailsPageHorizontalSpacing: Double?
    let detailsPageSidePadding: Double?
    let detailsPageTopPadding: Double?
    let detailsPageBottomPadding: Double?
    let detailsCardMaxWidth: Double?
    let donorFormMaxWidth: Double?
    let detailsCardPadding: Double?
    let detailsCardSpacing: Double?
    // Donation Details Page Fonts
    let detailsAmountFontSize: Double?
    let detailsLabelFontSize: Double?
    let detailsInputFontSize: Double?
    let detailsButtonFontSize: Double?
    // Donation Details Page Colors
    let detailsAmountColor: String?
    let detailsTextColor: String?
    let detailsInputBorderColor: String?
    let detailsInputFocusColor: String?
    let detailsButtonColor: String?
    let detailsButtonTextColor: String?
}

struct HomeScreenConfig: Codable {
    let idleTimeoutSeconds: Int? // Time in seconds before returning to home
    let customMessage: String?
    let whatsAppLink: String?
    let eventsText: String? // Deprecated
    let googleCalendarLink: String?
    let localEvents: [LocalEvent]?
    let socialMedia: [SocialMediaLink]?
    let presetAmounts: [Double]? // Preset donation amounts configured by admin
    let buttonColors: ButtonColors? // Button color customization
    let backgroundImageUrl: String? // URL to custom background image
}

struct ButtonColors: Codable {
    let categorySelected: String? // Hex color for selected category buttons
    let categoryUnselected: String? // Hex color for unselected category buttons
    let amountSelected: String? // Hex color for selected amount buttons
    let amountUnselected: String? // Hex color for unselected amount buttons
}

struct LocalEvent: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let date: String // ISO date string (YYYY-MM-DD)
    let startTime: String?
    let endTime: String?
    let isAllDay: Bool?
}

struct ReligiousEvent: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let date: String // ISO date string (YYYY-MM-DD)
    let startTime: String?
    let isRecurring: Bool?
    let recurrencePattern: String?
    let displayOrder: Int?
    let isActive: Bool?
    let googleCalendarLinks: [String]?
}

struct Branding: Codable {
    let primaryColor: String?
    let secondaryColor: String?
}

struct YajmanOpportunity: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String?
}

struct DonationCategory: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let defaultAmount: Double?
    let showStartDate: String? // ISO date string (optional, for future use)
    let showEndDate: String? // ISO date string (optional, for future use)
    let yajmanOpportunities: [YajmanOpportunity]? // Included yajman opportunities for sponsorship tiers
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case defaultAmount
        case showStartDate
        case showEndDate
        case yajmanOpportunities
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        
        // Handle defaultAmount as either String or Double
        if let amountString = try? container.decode(String.self, forKey: .defaultAmount) {
            defaultAmount = Double(amountString)
        } else if let amountDouble = try? container.decode(Double.self, forKey: .defaultAmount) {
            defaultAmount = amountDouble
        } else {
            defaultAmount = nil
        }
        
        showStartDate = try container.decodeIfPresent(String.self, forKey: .showStartDate)
        showEndDate = try container.decodeIfPresent(String.self, forKey: .showEndDate)
        yajmanOpportunities = try container.decodeIfPresent([YajmanOpportunity].self, forKey: .yajmanOpportunities)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(defaultAmount, forKey: .defaultAmount)
        try container.encodeIfPresent(showStartDate, forKey: .showStartDate)
        try container.encodeIfPresent(showEndDate, forKey: .showEndDate)
        try container.encodeIfPresent(yajmanOpportunities, forKey: .yajmanOpportunities)
    }
}

struct SocialMediaLink: Codable, Equatable {
    let platform: String
    let url: String
}

struct DeviceActivationResponse: Codable {
    let deviceToken: String
    let temple: Temple
    let categories: [DonationCategory]
}

