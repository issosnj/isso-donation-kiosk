import Foundation
import Combine
import SquareMobilePaymentsSDK

class AppState: ObservableObject {
    @Published var isActivated = false
    @Published var deviceToken: String?
    @Published var deviceId: String?
    @Published var temple: Temple?
    @Published var categories: [DonationCategory] = []
    @Published var religiousEvents: [ReligiousEvent] = []
    @Published var languageManager = LanguageManager.shared
    
    private let keychain = KeychainHelper()
    private var themeRefreshTimer: Timer?
    private var categoryRefreshTimer: Timer?
    private var religiousEventsRefreshTimer: Timer?
    private var squareConnectionCheckTimer: Timer?
    
    init() {
        loadStoredCredentials()
    }
    
    deinit {
        themeRefreshTimer?.invalidate()
        categoryRefreshTimer?.invalidate()
        religiousEventsRefreshTimer?.invalidate()
        squareConnectionCheckTimer?.invalidate()
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
        
        // Authorize Square Mobile Payments SDK after activation (non-blocking background task)
        Task.detached(priority: .utility) { [weak self] in
            guard let self = self else { return }
            await self.authorizeSquareSDK()
            await MainActor.run {
                self.startSquareConnectionMonitoring()
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
            
            // Load temple config FIRST with highest priority - UI waits for this
            Task(priority: .userInitiated) { [weak self] in
                guard let self = self else { return }
                await self.loadTempleConfig()
                // Only activate after temple config loads successfully
                await MainActor.run {
                    if self.temple != nil {
                        self.isActivated = true
                        appLog("✅ Temple config loaded - activating UI", category: "AppState")
                    } else {
                        // Even if temple config fails, activate after timeout so UI can show
                        appLog("⚠️ Temple config failed but activating UI anyway", category: "AppState")
                        self.isActivated = true
                    }
                }
                
                // Start Square SDK authorization AFTER temple config loads (non-blocking)
                // This prevents network competition and ensures temple config loads first
                Task.detached(priority: .utility) { [weak self] in
                    guard let self = self else { return }
                    await self.authorizeSquareSDK()
                    await MainActor.run {
                        self.startSquareConnectionMonitoring()
                    }
                }
            }
        }
    }
    
    func refreshTempleConfig() async {
        // Prevent refresh if initial load is still in progress
        if isLoadingTempleConfig {
            print("[AppState] ⚠️ Temple config load in progress - skipping refresh")
            return
        }
        
        // Refresh temple config to get latest theme settings
        guard let token = deviceToken,
              let templeId = extractTempleId(from: token) else {
            print("[AppState] ⚠️ Cannot refresh temple config - missing token or templeId")
            return
        }
        
        print("[AppState] 🔄 Refreshing temple config for theme updates...")
        
        do {
            let temple = try await APIService.shared.getTemple(templeId: templeId)
            // Check if background URL changed (for cache invalidation)
            let _ = self.temple?.homeScreenConfig?.backgroundImageUrl
            let _ = temple.homeScreenConfig?.backgroundImageUrl
            
            await MainActor.run {
                self.temple = temple
                print("[AppState] ✅ Temple config refreshed (including theme)")
            }
            
            
            // Also refresh categories when temple config is refreshed (categories might have changed)
            await refreshCategories()
        } catch {
            print("[AppState] ❌ Failed to refresh temple config: \(error.localizedDescription)")
        }
    }
    
    func refreshCategories() async {
        guard let templeId = extractTempleId(from: deviceToken ?? "") else {
            print("[AppState] ⚠️ Cannot refresh categories - missing templeId")
            return
        }
        
        print("[AppState] 📡 Refreshing categories for templeId: \(templeId)")
        
        do {
            // Fetch fresh categories from kiosk endpoint (filtered by date/time)
            print("[AppState] 🔄 Starting category fetch...")
            let categories = try await APIService.shared.getKioskCategories(templeId: templeId)
            print("[AppState] 📦 Received \(categories.count) categories from API")
            
            await MainActor.run {
                print("[AppState] 🎯 Updating categories array on main thread...")
                print("[AppState] 📊 Current categories count before update: \(self.categories.count)")
                self.categories = categories
                print("[AppState] ✅ Categories array updated: \(self.categories.count) categories")
                
                if categories.isEmpty {
                    print("[AppState] ⚠️ No categories returned - check if categories are:")
                    print("[AppState]   1. Active (isActive = true)")
                    print("[AppState]   2. Show on kiosk (showOnKiosk = true)")
                    print("[AppState]   3. Within date range (if date range is set)")
                } else {
                    print("[AppState] 📋 Categories list:")
                    for (index, category) in categories.enumerated() {
                        print("[AppState]   \(index + 1). \(category.name) (ID: \(category.id))")
                    }
                }
            }
        } catch {
            print("[AppState] ❌ Failed to refresh categories: \(error.localizedDescription)")
            if let apiError = error as? APIError {
                print("[AppState] ❌ API Error: \(apiError)")
                print("[AppState] ❌ API Error description: \(apiError.localizedDescription)")
            }
            // Clear categories on error to show empty state
            await MainActor.run {
                self.categories = []
            }
        }
    }
    
    func refreshReligiousEvents() async {
        print("[AppState] 📡 Refreshing religious events")
        
        do {
            let events = try await APIService.shared.getReligiousEvents()
            await MainActor.run {
                self.religiousEvents = events
                print("[AppState] ✅ Religious events updated: \(events.count) events")
                if events.isEmpty {
                    print("[AppState] ⚠️ No religious events found. Make sure:")
                    print("[AppState]   1. Religious events are created in the admin portal")
                    print("[AppState]   2. Events are marked as active (isActive = true)")
                } else {
                    print("[AppState] 📋 Events list:")
                    for (index, event) in events.enumerated() {
                        print("[AppState]   \(index + 1). \(event.name) - Date: \(event.date), Active: \(event.isActive ?? false)")
                    }
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
        
        appLog("📡 Fetching temple config for templeId: \(templeId)", category: "AppState")
        appLog("📡 API Base URL: \(Config.apiBaseURL)", category: "AppState")
        
        // Optimized for faster startup - only 1 retry (2 total attempts) with shorter timeout
        let maxRetries = 1
        
        for attempt in 0..<maxRetries {
            if attempt > 0 {
                // Short backoff: 1s between retries
                await MainActor.run {
                    appLog("🔄 Retry attempt \(attempt + 1)/\(maxRetries) after 1s delay...", category: "AppState")
                }
                try? await Task.sleep(nanoseconds: 1_000_000_000)
            }
            
            do {
                // Use 8s timeout for all attempts (faster than 30s default, but not too aggressive)
                let timeout = 8.0
                await MainActor.run {
                    appLog("📡 Starting temple fetch request (attempt \(attempt + 1), timeout: \(timeout)s)...", category: "AppState")
                }
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
                    appLog("✅ Temple ID: \(temple.id)", category: "AppState")
                    
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
                    
                    // Still try to authorize SDK even if temple fetch failed (non-blocking)
                    Task.detached(priority: .utility) { [weak self] in
                        guard let self = self else { return }
                        await self.authorizeSquareSDK()
                        await MainActor.run {
                            self.startSquareConnectionMonitoring()
                        }
                    }
                    
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
    
    private func authorizeSquareSDK() async {
        // Step 2: Verify SDK is available
        let _ = MobilePaymentsSDK.shared
        print("[AppState] ✅ Square Mobile Payments SDK is available")
        
        // Step 5: Request required permissions first
        print("[AppState] Requesting location and Bluetooth permissions...")
        
        // Request location permission
        let locationGranted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
            PermissionsManager.shared.requestLocationPermission { granted in
                if granted {
                    print("[AppState] ✅ Location permission granted")
                } else {
                    print("[AppState] ⚠️ Location permission denied - payments may fail")
                }
                continuation.resume(returning: granted)
            }
        }
        
        // Request Bluetooth permission
        let bluetoothGranted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
            PermissionsManager.shared.requestBluetoothPermission { granted in
                if granted {
                    print("[AppState] ✅ Bluetooth permission granted")
                } else {
                    print("[AppState] ⚠️ Bluetooth permission denied - contactless payments may fail")
                }
                continuation.resume(returning: granted)
            }
        }
        
        // Log final permission status
        if locationGranted && bluetoothGranted {
            print("[AppState] ✅ All required permissions granted")
        } else {
            print("[AppState] ⚠️ Some permissions were denied - Square SDK may have limited functionality")
        }
        
        // Step 4: Authorize SDK with credentials from backend
        // Get Square credentials from backend
        // This may timeout if network is slow - catch and log but don't block app
        let credentials: SquareCredentials
        do {
            credentials = try await APIService.shared.getSquareCredentials()
        } catch {
            // Log the error but don't fail completely - Square authorization can happen later
            appLog("⚠️ Failed to get Square credentials: \(error.localizedDescription)", category: "AppState")
            if let urlError = error as? URLError {
                appLog("⚠️ URL Error code: \(urlError.code.rawValue)", category: "AppState")
                if urlError.code == .timedOut {
                    appLog("⚠️ Request timed out - network may be slow or backend unreachable", category: "AppState")
                }
            }
            appLog("💡 Square SDK authorization will be retried later", category: "AppState")
            return // Exit early - don't try to authorize without credentials
        }
        
        // Check if we need to force re-authorize (for periodic refresh)
        let shouldForceReauthorize: Bool
        if let lastAuth = lastSquareAuthorizationTime {
            shouldForceReauthorize = Date().timeIntervalSince(lastAuth) >= 15 * 60 // 15 minutes
        } else {
            shouldForceReauthorize = false
        }
        
        // Authorize Mobile Payments SDK (uses completion handler, not async/await)
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            SquareMobilePaymentsService.shared.authorize(
                accessToken: credentials.accessToken,
                locationId: credentials.locationId,
                forceReauthorize: shouldForceReauthorize
            ) { error in
                if let error = error {
                    print("[AppState] ❌ Failed to authorize Square SDK: \(error.localizedDescription)")
                } else {
                    print("[AppState] ✅ Square Mobile Payments SDK authorized successfully")
                    // Update last authorization time
                    Task { @MainActor in
                        self.lastSquareAuthorizationTime = Date()
                    }
                    // Reader detection is automatically checked after authorization
                }
                continuation.resume()
            }
        }
    }
    
    // Track last authorization time for periodic refresh
    private var lastSquareAuthorizationTime: Date?
    
    // Check Square SDK connection and reconnect if needed
    func checkAndReconnectSquareSDK() async {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd HH:mm:ss.SSS"
        let timestamp = formatter.string(from: Date())
        
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        print("[\(timestamp)] [AppState] 🔍 Checking Square SDK connection state: \(authState)")
        
        // Check if hardware is actually connected
        let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
        print("[\(timestamp)] [AppState] 🔌 Hardware connection check: \(hardwareConnected ? "✅ Connected" : "❌ Not detected")")
        
        // If not authorized, try to reconnect immediately
        if authState != .authorized {
            print("[AppState] ⚠️ Square SDK connection lost (state: \(authState)) - attempting reconnection...")
            await authorizeSquareSDK()
            
            // After re-authorization, wait and check hardware again (hardware might wake up)
            if !hardwareConnected {
                print("[AppState] ⏳ Waiting for hardware to wake up after re-authorization...")
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
                let hardwareStillConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                if hardwareStillConnected {
                    print("[AppState] ✅ Hardware detected after wait - connection established")
                } else {
                    print("[AppState] ⚠️ Hardware still not detected - may need physical reconnection")
                }
            }
            return
        }
        
        // If authorized but hardware not connected, try to reconnect
        if !hardwareConnected {
            print("[AppState] ⚠️ SDK authorized but hardware not detected - attempting reconnection...")
            await authorizeSquareSDK()
            
            // Wait for hardware to potentially wake up
            try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
            let hardwareStillConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
            if hardwareStillConnected {
                print("[AppState] ✅ Hardware detected after reconnection attempt")
            }
            return
        }
        
        // If authorized, check if we need to refresh the connection (every 15 minutes)
        // This prevents stale hardware connections after long idle periods
        let now = Date()
        if let lastAuth = lastSquareAuthorizationTime {
            let timeSinceLastAuth = now.timeIntervalSince(lastAuth)
            let refreshInterval: TimeInterval = 15 * 60 // 15 minutes
            
            if timeSinceLastAuth >= refreshInterval {
                print("[AppState] 🔄 Refreshing Square SDK authorization (last auth: \(Int(timeSinceLastAuth/60)) minutes ago)")
                print("[AppState] 💡 This ensures hardware connection stays active after idle periods")
                await authorizeSquareSDK()
            } else {
                let minutesRemaining = Int((refreshInterval - timeSinceLastAuth) / 60)
                print("[AppState] ✅ Square SDK connection is active (refresh in \(minutesRemaining) minutes)")
            }
        } else {
            // First check - just log that it's active
            print("[AppState] ✅ Square SDK connection is active")
            lastSquareAuthorizationTime = now
        }
    }
    
    // Start periodic monitoring of Square SDK connection
    private func startSquareConnectionMonitoring() {
        // Stop any existing timer
        squareConnectionCheckTimer?.invalidate()
        
        // Check connection every 30 seconds
        squareConnectionCheckTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self, self.isActivated else { return }
                await self.checkAndReconnectSquareSDK()
            }
        }
        print("[AppState] 🔄 Started Square SDK connection monitoring (every 30 seconds, refresh every 15 minutes)")
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

