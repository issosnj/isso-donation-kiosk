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
            
            // After initial authorization, aggressively check for hardware (iPad might be waking up after reboot)
            // This helps when iPad powers on and Square Stand is already connected
            // Run in background - doesn't block UI
            appLog("🔍 Starting aggressive hardware detection after startup (background)...", category: "AppState")
            for attempt in 1...6 {
                let totalSeconds = attempt * 5
                if attempt > 1 {
                    appLog("⏳ Attempt \(attempt)/6: Waiting 5 seconds, then checking hardware (total: \(totalSeconds)s)...", category: "AppState")
                    try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                } else {
                    appLog("⏳ Attempt \(attempt)/6: Checking hardware immediately...", category: "AppState")
                }
                let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                if hardwareConnected {
                    appLog("✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...", category: "AppState")
                    await self.authorizeSquareSDK()
                    return // Success - exit retry loop
                } else {
                    appLog("❌ Hardware still not detected after \(totalSeconds) seconds", category: "AppState")
                }
            }
            appLog("⚠️ Hardware not detected after 30 seconds - will keep checking periodically", category: "AppState")
        }
    }
    
    private func loadStoredCredentials() {
        if let token = keychain.load(forKey: "deviceToken") {
            self.deviceToken = token
            self.deviceId = extractDeviceId(from: token)
            APIService.shared.setDeviceToken(token)
            
            // Set activated immediately so UI can show - don't wait for temple config
            // Temple config will load in background and update UI when ready
            self.isActivated = true
            appLog("✅ Activated immediately with stored credentials - loading temple config in background", category: "AppState")
            
            // Load temple config asynchronously in background - don't block UI
            Task.detached(priority: .utility) { [weak self] in
                guard let self = self else { return }
                await self.loadTempleConfig()
            }
            
            // Start Square SDK authorization in background (non-blocking)
            Task.detached(priority: .utility) { [weak self] in
                guard let self = self else { return }
                await self.authorizeSquareSDK()
                await MainActor.run {
                    self.startSquareConnectionMonitoring()
                }
                
                // Aggressively check for hardware after reboot (background task, doesn't block UI)
                appLog("🔍 Starting aggressive hardware detection after loading stored credentials...", category: "AppState")
                for attempt in 1...6 {
                    let totalSeconds = attempt * 5
                    if attempt > 1 {
                        appLog("⏳ Attempt \(attempt)/6: Waiting 5 seconds, then checking hardware (total: \(totalSeconds)s)...", category: "AppState")
                        try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                    } else {
                        appLog("⏳ Attempt \(attempt)/6: Checking hardware immediately...", category: "AppState")
                    }
                    let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                    if hardwareConnected {
                        appLog("✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...", category: "AppState")
                        await self.authorizeSquareSDK()
                        return // Success - exit retry loop
                    } else {
                        appLog("❌ Hardware still not detected after \(totalSeconds) seconds", category: "AppState")
                    }
                }
                appLog("⚠️ Hardware not detected after 30 seconds - will keep checking periodically", category: "AppState")
            }
        }
    }
    
    func refreshTempleConfig() async {
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
    
    private func loadTempleConfig() async {
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
        
        appLog("📡 Fetching temple config for templeId: \(templeId)", category: "AppState")
        appLog("📡 API Base URL: \(Config.apiBaseURL)", category: "AppState")
        
        // Retry logic for initial load - keep trying until successful
        let maxRetries = 5
        
        for attempt in 0..<maxRetries {
            if attempt > 0 {
                // Exponential backoff: 2s, 4s, 8s, 16s
                let delay = pow(2.0, Double(attempt))
                print("[AppState] 🔄 Retry attempt \(attempt + 1)/\(maxRetries) after \(delay)s delay...")
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            
            do {
                // Fetch temple data from backend
                print("[AppState] 📡 Starting temple fetch request (attempt \(attempt + 1))...")
                let temple = try await APIService.shared.getTemple(templeId: templeId)
                
                await MainActor.run {
                    self.temple = temple
                    // isActivated should already be true from loadStoredCredentials()
                    // but set it here too in case this is called from activate()
                    if !self.isActivated {
                        self.isActivated = true
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
                
                
                // Load categories after temple config is loaded
                await refreshCategories()
                
                // Load religious events
                await refreshReligiousEvents()
                
                // Authorize Square Mobile Payments SDK if device token exists (non-blocking background task)
                Task.detached(priority: .utility) { [weak self] in
                    guard let self = self else { return }
                    await self.authorizeSquareSDK()
                    await MainActor.run {
                        self.startSquareConnectionMonitoring()
                    }
                    
                    // After initial authorization, aggressively check for hardware (iPad might be waking up after reboot)
                    // This helps when iPad powers on and Square Stand is already connected
                    // Run in background - doesn't block UI
                    appLog("🔍 Starting aggressive hardware detection after startup (background)...", category: "AppState")
                    for attempt in 1...6 {
                        let totalSeconds = attempt * 5
                        if attempt > 1 {
                            appLog("⏳ Attempt \(attempt)/6: Waiting 5 seconds, then checking hardware (total: \(totalSeconds)s)...", category: "AppState")
                            try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                        } else {
                            appLog("⏳ Attempt \(attempt)/6: Checking hardware immediately...", category: "AppState")
                        }
                        let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                        if hardwareConnected {
                            appLog("✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...", category: "AppState")
                            await self.authorizeSquareSDK()
                            return // Success - exit retry loop
                        } else {
                            appLog("❌ Hardware still not detected after \(totalSeconds) seconds", category: "AppState")
                        }
                    }
                    appLog("⚠️ Hardware not detected after 30 seconds - will keep checking periodically", category: "AppState")
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
                
                // If this was the last attempt, give up and set activated anyway
                if attempt == maxRetries - 1 {
                    print("[AppState] ⚠️ Max retries reached. Setting activated with nil temple.")
                    await MainActor.run {
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
                    
                    // Continue trying to refresh in background
                    Task.detached(priority: .background) { [weak self] in
                        // Keep trying to refresh every 10 seconds until successful
                        while await self?.temple == nil {
                            try? await Task.sleep(nanoseconds: 10_000_000_000) // 10 seconds
                            await self?.refreshTempleConfig()
                            if await self?.temple != nil {
                                print("[AppState] ✅ Successfully loaded temple config in background retry")
                                break
                            }
                        }
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
        do {
            // Get Square credentials from backend
            let credentials = try await APIService.shared.getSquareCredentials()
            
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
        } catch {
            let errorMessage: String
            if let apiError = error as? APIError {
                errorMessage = apiError.localizedDescription
            } else {
                errorMessage = error.localizedDescription
            }
            print("[AppState] ❌ Failed to get Square credentials: \(errorMessage)")
            print("[AppState] This usually means:")
            print("[AppState]   1. The temple hasn't connected Square in the admin portal, OR")
            print("[AppState]   2. The device token is invalid/expired, OR")
            print("[AppState]   3. The backend API is unavailable")
            // Don't block app - Square SDK authorization can happen later
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
        
        // Refresh immediately on first start
        Task {
            await refreshTempleConfig()
        }
        
        // Then refresh every 30 seconds
        themeRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task {
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
        
        // Refresh immediately on first start
        Task {
            await refreshCategories()
        }
        
        // Then refresh every 30 seconds
        categoryRefreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task {
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
        
        // Refresh immediately on first start
        Task {
            await refreshReligiousEvents()
        }
        
        // Then refresh every 5 minutes (300 seconds) - more frequent than categories since events change more often
        religiousEventsRefreshTimer = Timer.scheduledTimer(withTimeInterval: 300.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isActivated else {
                return
            }
            Task {
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

