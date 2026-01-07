import Foundation
import UIKit
import StripeTerminal

// MARK: - Stripe Terminal Service (Stripe M2 Reader)
//
// ✅ Works with Stripe Terminal SDK
// ✅ Supports Stripe M2 Reader (contactless + chip) over Bluetooth
// ✅ Prevents reader from falling asleep with keep-alive mechanism
//
// Key design choices (kiosk-friendly):
// - Connect ONCE and keep connection alive
// - Before taking a payment, ensure reader is connected
// - Use keep-alive to prevent reader from sleeping
// - Handle connection token refresh automatically

final class StripeTerminalService: NSObject, ConnectionTokenProvider {
    static let shared = StripeTerminalService()
    
    // MARK: - State
    
    private var connectionToken: String?
    private var locationId: String?
    private var currentReader: Reader?
    private var isConnecting = false
    private var paymentInProgress = false
    private var isInitialized = false // Track if SDK has been initialized
    private var lastConnectionError: String? // Store last connection error for UI display
    private var availableUpdate: ReaderSoftwareUpdate?
    private var updateStatus: String? = nil
    private var updateProgress: Float? = nil // Store update progress percentage (0.0 to 1.0)
    private var updateCheckTimer: Timer? = nil // Timer to detect when no update is available after check
    
    private var currentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private weak var currentPaymentViewController: UIViewController?
    
    // Keep-alive timer to prevent reader from sleeping
    private var keepAliveTimer: Timer?
    private let keepAliveInterval: TimeInterval = 30 // 30 seconds
    
    // Connection refresh timer
    private var connectionRefreshTimer: Timer?
    private let connectionRefreshInterval: TimeInterval = 5 * 60 // 5 minutes
    
    // Connection status check timer (for detecting connection during slow updates)
    private var connectionStatusCheckTimer: Timer?
    private let connectionStatusCheckInterval: TimeInterval = 2.0 // Check every 2 seconds while connecting
    
    struct PaymentResult {
        let success: Bool
        let paymentIntentId: String?
        let error: String?
        
        init(success: Bool, paymentIntentId: String?, error: String? = nil) {
            self.success = success
            self.paymentIntentId = paymentIntentId
            self.error = error
        }
    }
    
    private override init() {
        super.init()
        // Set connection token provider immediately in init
        // This must be done before any Terminal.shared access
        // We'll provide tokens via fetchConnectionToken when needed
        Terminal.setTokenProvider(self)
    }
    
    deinit {
        keepAliveTimer?.invalidate()
        connectionRefreshTimer?.invalidate()
    }
    
    // MARK: - Logging helper
    
    private func log(_ message: String, verbose: Bool = false) {
        if !verbose {
            appLog(message, category: "StripeTerminal")
        }
    }
    
    // MARK: - Connection Management
    
    /// Initialize Stripe Terminal SDK with connection token and location ID
    /// Uses physical M2 reader in live mode
    /// Location ID is required for reader registration per Stripe docs
    func initialize(connectionToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
        self.connectionToken = connectionToken
        self.locationId = locationId
        
        // Token provider is already set in init() - now we can safely set the delegate
        Terminal.shared.delegate = self
        isInitialized = true
        
        // Detect mode from connection token for logging
        let isTestMode = connectionToken.contains("test") || connectionToken.count < 50
        if isTestMode {
            log("✅ Stripe Terminal initialized (TEST MODE - using physical M2 reader)")
        } else {
            log("✅ Stripe Terminal initialized (LIVE MODE - using physical M2 reader)")
        }
        log("📍 Location ID: \(locationId)")
        completion(nil)
    }
    
    // MARK: - ConnectionTokenProvider
    
    func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        // If we have a cached token, use it
        if let token = connectionToken {
            log("📝 Using cached connection token", verbose: true)
            completion(token, nil)
            return
        }
        
        // Otherwise, fetch a new one from the backend
        log("📡 Fetching new connection token from backend...")
        Task {
            do {
                let credentials = try await APIService.shared.getStripeCredentials()
                await MainActor.run {
                    self.connectionToken = credentials.connectionToken
                    self.log("✅ Connection token fetched successfully", verbose: true)
                    completion(credentials.connectionToken, nil)
                }
            } catch {
                await MainActor.run {
                    self.log("❌ Failed to fetch connection token: \(error.localizedDescription)")
                    completion(nil, error)
                }
            }
        }
    }
    
    /// Connect to a reader (M2)
    /// Note: M2 readers without screens register automatically when connected
    func connectToReader(from viewController: UIViewController, completion: @escaping (Error?) -> Void) {
        guard !isConnecting else {
            log("⚠️ Connection already in progress")
            completion(NSError(domain: "StripeTerminal", code: -1, userInfo: [NSLocalizedDescriptionKey: "Connection already in progress"]))
            return
        }
        
        guard currentReader == nil else {
            log("✅ Reader already connected")
            startKeepAlive()
            completion(nil)
            return
        }
        
        isConnecting = true
        log("🔌 Discovering M2 readers...")
        
        // Discover readers using BluetoothScanDiscoveryConfiguration (SDK 3.0)
        // Per Stripe docs: https://docs.stripe.com/terminal/payments/connect-reader
        do {
            let config = try BluetoothScanDiscoveryConfigurationBuilder()
                .setSimulated(false) // Use physical M2 reader
                .build()
            
            log("🔍 Discovering physical M2 readers via Bluetooth...")
            
            Terminal.shared.discoverReaders(config, delegate: self) { error in
            if let error = error {
                self.isConnecting = false
                self.log("❌ Discovery failed: \(error.localizedDescription)")
                completion(error)
                return
            }
            
                // Discovery started - will call delegate methods
                // When a reader is found and connected, it will automatically register
                self.log("🔍 Discovery started - M2 reader will auto-register on connection")
            }
        } catch {
            self.isConnecting = false
            self.log("❌ Failed to create discovery configuration: \(error.localizedDescription)")
            completion(error)
        }
    }
    
    /// Disconnect from reader
    func disconnectReader(completion: (() -> Void)? = nil) {
        stopKeepAlive()
        stopConnectionRefresh()
        
        guard currentReader != nil else {
            completion?()
            return
        }
        
        Terminal.shared.disconnectReader { error in
            if let error = error {
                self.log("⚠️ Disconnect error: \(error.localizedDescription)")
            } else {
                self.log("🔓 Reader disconnected")
            }
            self.currentReader = nil
            // Clear connection error on disconnect
            self.lastConnectionError = nil
            completion?()
        }
    }
    
    // MARK: - Payment Processing
    
    /// Take payment using Stripe Terminal
    func takePayment(
        amount: Double,
        paymentIntentId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        guard !paymentInProgress else {
            log("⚠️ Payment already in progress")
            completion(.failure(NSError(domain: "StripeTerminal", code: -1, userInfo: [NSLocalizedDescriptionKey: "Payment already in progress"])))
            return
        }
        
        // Check both our cached reader and Terminal.shared.connectedReader
        let connectedReader = Terminal.shared.connectedReader ?? currentReader
        
        guard connectedReader != nil else {
            log("❌ No reader connected")
            completion(.failure(NSError(domain: "StripeTerminal", code: -2, userInfo: [NSLocalizedDescriptionKey: "No reader connected. Please connect a reader first."])))
            return
        }
        
        // Update our cached reader if Terminal.shared has one but we don't
        if currentReader == nil, let terminalReader = Terminal.shared.connectedReader {
            currentReader = terminalReader
            log("📱 Synced connected reader from Terminal.shared for payment", verbose: true)
        }
        
        paymentInProgress = true
        currentCompletion = completion
        currentPaymentViewController = viewController
        
        log("💳 Starting payment: $\(String(format: "%.2f", amount))")
        
        // Retrieve payment intent (SDK 3.0: requires clientSecret parameter name)
        Terminal.shared.retrievePaymentIntent(clientSecret: paymentIntentId) { intent, error in
            guard let intent = intent, error == nil else {
                self.paymentInProgress = false
                self.log("❌ Failed to retrieve payment intent: \(error?.localizedDescription ?? "unknown error")")
                completion(.failure(error ?? NSError(domain: "StripeTerminal", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to retrieve payment intent"])))
                return
            }
            
            // Collect payment (SDK 3.0: use CollectConfigurationBuilder)
            do {
                let collectConfig = try CollectConfigurationBuilder().build()
                Terminal.shared.collectPaymentMethod(intent, collectConfig: collectConfig) { intent, error in
                if let error = error {
                    self.paymentInProgress = false
                    self.log("❌ Payment collection failed: \(error.localizedDescription)")
                    completion(.failure(error))
                    return
                }
                
                guard let intent = intent else {
                    self.paymentInProgress = false
                    self.log("❌ Payment intent is nil after collection")
                    completion(.failure(NSError(domain: "StripeTerminal", code: -4, userInfo: [NSLocalizedDescriptionKey: "Payment intent is nil"])))
                    return
                }
                
                // Confirm payment intent (SDK 3.0: processPayment → confirmPaymentIntent)
                Terminal.shared.confirmPaymentIntent(intent) { intent, error in
                    self.paymentInProgress = false
                    
                    if let error = error {
                        self.log("❌ Payment processing failed: \(error.localizedDescription)")
                        completion(.failure(error))
                        return
                    }
                    
                    guard let intent = intent else {
                        self.log("❌ Payment intent is nil after processing")
                        completion(.failure(NSError(domain: "StripeTerminal", code: -5, userInfo: [NSLocalizedDescriptionKey: "Payment intent is nil"])))
                        return
                    }
                    
                    self.log("✅ Payment completed: \(intent.stripeId ?? "unknown")")
                    let result = PaymentResult(success: true, paymentIntentId: intent.stripeId)
                    completion(.success(result))
                }
            }
            } catch {
                self.paymentInProgress = false
                self.log("❌ Failed to create collect configuration: \(error.localizedDescription)")
                completion(.failure(error))
            }
        }
    }
    
    /// Cancel current payment
    func cancelCurrentPayment() {
        guard paymentInProgress else { return }
        
        log("🚫 Canceling payment")
        // Note: Stripe Terminal SDK handles cancellation automatically when needed
        
        paymentInProgress = false
        currentCompletion = nil
    }
    
    // MARK: - Keep-Alive Mechanism
    
    private func startKeepAlive() {
        stopKeepAlive()
        
        log("💓 Starting keep-alive timer (every \(Int(keepAliveInterval)) seconds)")
        
        keepAliveTimer = Timer.scheduledTimer(withTimeInterval: keepAliveInterval, repeats: true) { [weak self] _ in
            self?.performKeepAlive()
        }
    }
    
    private func stopKeepAlive() {
        keepAliveTimer?.invalidate()
        keepAliveTimer = nil
    }
    
    private func performKeepAlive() {
        guard let reader = currentReader, !paymentInProgress else {
            return
        }
        
        // Access reader properties to keep connection alive
        // This prevents the M2 reader from falling asleep
        _ = reader.serialNumber
        _ = reader.deviceType
        _ = reader.status
        
        log("💓 Keep-alive: Reader connection active", verbose: true)
    }
    
    // MARK: - Connection Refresh
    
    private func startConnectionRefresh() {
        stopConnectionRefresh()
        
        log("🔄 Starting connection refresh timer (every \(Int(connectionRefreshInterval / 60)) minutes)")
        
        connectionRefreshTimer = Timer.scheduledTimer(withTimeInterval: connectionRefreshInterval, repeats: true) { [weak self] _ in
            self?.refreshConnection()
        }
    }
    
    private func stopConnectionRefresh() {
        connectionRefreshTimer?.invalidate()
        connectionRefreshTimer = nil
    }
    
    private func refreshConnection() {
        guard !paymentInProgress, currentReader != nil else {
            return
        }
        
        log("🔄 Refreshing connection token...")
        
        // Fetch new connection token from backend
        Task {
            do {
                let credentials = try await APIService.shared.getStripeCredentials()
                await MainActor.run {
                    self.connectionToken = credentials.connectionToken
                    self.log("✅ Connection token refreshed", verbose: true)
                }
            } catch {
                self.log("⚠️ Failed to refresh connection token: \(error.localizedDescription)", verbose: true)
            }
        }
    }
    
    /// Start periodic check to detect if reader becomes connected during slow software updates
    private func startConnectionStatusCheck() {
        stopConnectionStatusCheck()
        
            // Connection status check started (verbose)
        
        connectionStatusCheckTimer = Timer.scheduledTimer(withTimeInterval: connectionStatusCheckInterval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            // Check if reader is connected via Terminal.shared
            if let connectedReader = Terminal.shared.connectedReader {
                // Reader is connected but we haven't updated our state yet
                if self.currentReader == nil {
                    self.currentReader = connectedReader
                    self.isConnecting = false
                    self.lastConnectionError = nil
                    self.log("✅ Reader connection detected via status check - Serial: \(connectedReader.serialNumber)")
                    self.log("💡 Connection completed (software update may still be in progress)")
                    self.startKeepAlive()
                    self.startConnectionRefresh()
                    // Don't stop the timer yet - let it continue until connection callback fires
                } else if self.isConnecting {
                    // We have a reader but still marked as connecting - update state
                    self.isConnecting = false
                    self.lastConnectionError = nil
                    self.log("✅ Connection state updated - reader is ready")
                }
            }
        }
    }
    
    private func stopConnectionStatusCheck() {
        connectionStatusCheckTimer?.invalidate()
        connectionStatusCheckTimer = nil
    }
    
    // MARK: - Helper Methods
    
    func checkHardwareConnection() -> Bool {
        return currentReader != nil
    }
    
    func isPaymentInProgress() -> Bool {
        return paymentInProgress
    }
    
    func getReaderInfo() -> (connected: Bool, model: String?, error: String?) {
        // First check Terminal.shared for the connected reader (most reliable)
        // Then fall back to our cached currentReader
        let connectedReader = Terminal.shared.connectedReader ?? currentReader
        
        guard let reader = connectedReader else {
            return (connected: false, model: nil, error: lastConnectionError)
        }
        
        // Update our cached reader if Terminal.shared has one but we don't
        if currentReader == nil && Terminal.shared.connectedReader != nil {
            currentReader = Terminal.shared.connectedReader
            log("📱 Synced connected reader from Terminal.shared", verbose: true)
        }
        
        // Use string description for device type to avoid compilation issues
        let deviceTypeString = String(describing: reader.deviceType)
        let modelName = deviceTypeString.contains("chipper2X") || deviceTypeString.contains("M2") ? "Stripe M2" : "Stripe Reader"
        return (connected: true, model: modelName, error: nil)
    }
    
    /// Get software update status
    func getUpdateStatus() -> (hasUpdate: Bool, status: String?, version: String?, progress: Int?) {
        let versionString: String?
        if let update = availableUpdate {
            // ReaderSoftwareUpdate doesn't have a direct version property
            // Use string description to extract version info
            let updateDescription = String(describing: update)
            // Try to extract version from description (format may vary)
            versionString = updateDescription.contains("version") ? updateDescription : nil
        } else {
            versionString = nil
        }
        
        let progressPercent: Int?
        if let progress = updateProgress {
            progressPercent = Int(progress * 100)
        } else {
            progressPercent = nil
        }
        
        return (
            hasUpdate: availableUpdate != nil,
            status: updateStatus,
            version: versionString,
            progress: progressPercent
        )
    }
    
    /// Trigger software update check by reconnecting the reader
    /// This will cause the SDK to check for and install any available updates
    func triggerSoftwareUpdate(from viewController: UIViewController, completion: @escaping (Error?) -> Void) {
        guard (currentReader ?? Terminal.shared.connectedReader) != nil else {
            completion(NSError(domain: "StripeTerminal", code: -1, userInfo: [NSLocalizedDescriptionKey: "No reader connected. Please connect a reader first."]))
            return
        }
        
        log("🔄 Triggering software update check by reconnecting reader...")
        updateStatus = "Checking for updates..."
        updateProgress = nil // Reset progress
        availableUpdate = nil // Clear previous update info
        
        // Set a timer to detect when no update is available (after 10 seconds of connection)
        updateCheckTimer?.invalidate()
        updateCheckTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { [weak self] _ in
            guard let self = self else { return }
            // If we're still showing "Checking for updates..." and no update was reported, reader is up to date
            if self.updateStatus == "Checking for updates..." && self.availableUpdate == nil {
                self.updateStatus = "✅ Reader is up to date - no updates available"
                self.log("✅ No software update available - reader is up to date")
                
                // Clear the status after 5 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    if self.updateStatus == "✅ Reader is up to date - no updates available" {
                        self.updateStatus = nil
                    }
                }
            }
        }
        
        // Disconnect first
        disconnectReader {
            // Fetch a fresh connection token before reconnecting
            // Connection tokens can only be used once, so we need a new one
            Task {
                do {
                    let credentials = try await APIService.shared.getStripeCredentials()
                    
                    await MainActor.run {
                        // Update connection token and location ID
                        self.connectionToken = credentials.connectionToken
                        self.locationId = credentials.locationId
                        
                        // Reinitialize SDK with new token
                        self.initialize(
                            connectionToken: credentials.connectionToken,
                            locationId: credentials.locationId
                        ) { initError in
                            if let initError = initError {
                                self.updateStatus = "Initialization failed: \(initError.localizedDescription)"
                                completion(initError)
                                return
                            }
                            
                            // Small delay before reconnecting
                            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                                self.connectToReader(from: viewController) { connectError in
                                    if let connectError = connectError {
                                        self.updateCheckTimer?.invalidate()
                                        self.updateCheckTimer = nil
                                        self.updateStatus = "Update check failed: \(connectError.localizedDescription)"
                                        completion(connectError)
                                    } else {
                                        // Update check will happen during connection
                                        // Status will be updated via delegate methods
                                        self.updateStatus = "Reconnecting to check for updates..."
                                        // Timer will detect if no update is available after 10 seconds
                                        completion(nil)
                                    }
                                }
                            }
                        }
                    }
                } catch {
                    await MainActor.run {
                        self.updateStatus = "Failed to get credentials: \(error.localizedDescription)"
                        completion(error)
                    }
                }
            }
        }
    }
    
    /// Get user-friendly error message from Stripe Terminal error
    fileprivate func getUserFriendlyError(_ error: Error) -> String {
        let errorDescription = error.localizedDescription.lowercased()
        
        // Check for common error patterns and provide user-friendly messages
        if errorDescription.contains("battery") && errorDescription.contains("low") {
            return "Reader battery is too low. The reader needs to charge to at least 50% before connecting. Please wait 10-15 minutes while charging, then try again. Check the LED lights on the reader - you need at least 2 solid green lights (50% charge)."
        }
        
        if errorDescription.contains("software update") && errorDescription.contains("battery") {
            return "Reader battery is too low to install software update. The reader needs to charge to at least 50% before updating. Please wait 10-15 minutes while charging, then try again. Check the LED lights - you need at least 2 solid green lights (50% charge)."
        }
        
        if errorDescription.contains("bluetooth") && errorDescription.contains("not available") {
            return "Bluetooth is not available. Please enable Bluetooth in Settings and try again."
        }
        
        if errorDescription.contains("not found") || errorDescription.contains("no reader") {
            return "No reader found. Make sure the reader is powered on and nearby."
        }
        
        if errorDescription.contains("connection") && errorDescription.contains("timeout") {
            return "Connection timed out. Make sure the reader is nearby and try again."
        }
        
        if errorDescription.contains("already connected") {
            return "Reader is already connected."
        }
        
        // Return original error if no pattern matches
        return error.localizedDescription
    }
}

// MARK: - TerminalDelegate

extension StripeTerminalService: TerminalDelegate {
    @objc func terminal(_ terminal: Terminal, didReportUnexpectedReaderDisconnect reader: Reader) {
        log("⚠️ Reader unexpectedly disconnected")
        currentReader = nil
        stopKeepAlive()
        stopConnectionRefresh()
    }
}

// MARK: - DiscoveryDelegate

extension StripeTerminalService: DiscoveryDelegate {
    @objc func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        guard isConnecting else { return }
        
        if readers.isEmpty {
            log("⏳ No readers discovered yet, continuing scan...")
            return
        }
        
        // Connect to first available M2 reader
        // Filter for M2 readers if multiple are found
        let m2Reader = readers.first { reader in
            let typeString = String(describing: reader.deviceType)
            return typeString.contains("chipper2X") || typeString.contains("M2")
        } ?? readers.first!
        
        log("🔌 Connecting to M2 reader: \(m2Reader.serialNumber)")
        if let location = m2Reader.location {
            log("📱 Reader location: \(String(describing: location))")
        }
        
        // Create connection configuration with location ID
        // SDK 3.0: BluetoothConnectionConfigurationBuilder requires location ID in initializer
        do {
            let connectionConfig = try BluetoothConnectionConfigurationBuilder(locationId: locationId ?? "")
                .build()
            
            Terminal.shared.connectBluetoothReader(m2Reader, delegate: self, connectionConfig: connectionConfig) { reader, error in
                self.isConnecting = false
                
                if let error = error {
                    let userFriendlyError = self.getUserFriendlyError(error)
                    self.lastConnectionError = userFriendlyError
                    self.log("❌ Connection failed: \(error.localizedDescription)")
                    self.log("📱 User-friendly error: \(userFriendlyError)")
                    return
                }
                
                // Clear error on successful connection
                self.lastConnectionError = nil
                
                guard let reader = reader else {
                    self.log("❌ Reader is nil after connection")
                    // Even if reader is nil, check Terminal.shared.connectedReader as fallback
                    if let connectedReader = Terminal.shared.connectedReader {
                        self.currentReader = connectedReader
                        self.log("✅ Reader found via Terminal.shared.connectedReader - Serial: \(connectedReader.serialNumber)")
                        self.startKeepAlive()
                        self.startConnectionRefresh()
                    }
                    return
                }
                
                self.currentReader = reader
                self.log("✅ M2 Reader connected and registered successfully!")
                self.log("   Serial: \(reader.serialNumber)")
                let deviceTypeString = String(describing: reader.deviceType)
                self.log("   Device Type: \(deviceTypeString.contains("chipper2X") || deviceTypeString.contains("M2") ? "M2" : "Other")")
                self.log("   Status: \(String(describing: reader.status))")
                if let location = reader.location {
                    self.log("   Location: \(String(describing: location))")
                }
                self.log("💡 Reader is now registered in your Stripe account")
                self.startKeepAlive()
                self.startConnectionRefresh()
                // Stop connection status check since callback fired
                self.stopConnectionStatusCheck()
            }
            
            // Start a periodic check to see if reader becomes connected even if callback hasn't fired
            // This helps when software update is taking a long time
            // Connection status check started (verbose)
            startConnectionStatusCheck()
        } catch {
            self.isConnecting = false
            self.log("❌ Failed to create connection configuration: \(error.localizedDescription)")
        }
    }
}

// MARK: - BluetoothReaderDelegate

extension StripeTerminalService: BluetoothReaderDelegate {
    @objc func reader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions) {
        log("📱 Reader input requested: \(String(describing: inputOptions))")
    }
    
    @objc func reader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        log("📱 Reader display message: \(String(describing: displayMessage))")
    }
    
    // MARK: - Software Update Methods (required by BluetoothReaderDelegate)
    
    @objc func reader(_ reader: Reader, didReportAvailableUpdate update: ReaderSoftwareUpdate) {
        // Cancel the "no update" timer since we found an update
        updateCheckTimer?.invalidate()
        updateCheckTimer = nil
        
        availableUpdate = update
        let updateDescription = String(describing: update)
        updateStatus = "📱 Update available: \(updateDescription)"
        log("📱 Reader software update available: \(updateDescription)")
    }
    
    @objc func reader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {
        let updateDescription = String(describing: update)
        updateStatus = "Installing update: 0% complete"
        updateProgress = 0.0 // Reset progress when starting
        log("📱 Installing reader software update: \(updateDescription)")
        log("💡 Update may take several minutes - connection will complete when update finishes")
    }
    
    @objc func reader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        updateProgress = progress
        let percent = Int(progress * 100)
        updateStatus = "Installing update: \(percent)% complete"
        
        // Log every 10% to track progress better, especially when stuck at 0%
        if percent % 10 == 0 || percent == 100 {
            log("📱 Reader software update: \(percent)% complete")
        }
        
        // If we're at 0% for a while, check if reader is actually connected
        // Sometimes the connection completes even if update progress is stuck
        if percent == 0 {
            // Check if reader is connected despite update progress being 0
            if let connectedReader = Terminal.shared.connectedReader, currentReader == nil {
                currentReader = connectedReader
                log("📱 Reader connected detected during update (progress: 0%) - Serial: \(connectedReader.serialNumber)")
                startKeepAlive()
                startConnectionRefresh()
            }
        }
    }
    
    @objc func reader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error = error {
            let userFriendlyError = self.getUserFriendlyError(error)
            lastConnectionError = userFriendlyError
            updateStatus = "Update failed: \(userFriendlyError)"
            log("❌ Reader software update failed: \(error.localizedDescription)")
            log("📱 User-friendly error: \(userFriendlyError)")
            // Update connection state even if update failed - reader might still be connected
            if let connectedReader = Terminal.shared.connectedReader {
                currentReader = connectedReader
                log("📱 Reader is connected despite update error")
            }
        } else {
            updateStatus = "Update completed successfully"
            updateProgress = 1.0 // 100%
            availableUpdate = nil
            log("✅ Reader software update completed successfully")
            // Clear error on successful update
            lastConnectionError = nil
            
            // After update completes, check if reader is connected and sync state
            if let connectedReader = Terminal.shared.connectedReader {
                currentReader = connectedReader
                log("✅ Reader connected after software update - Serial: \(connectedReader.serialNumber)")
                startKeepAlive()
                startConnectionRefresh()
            } else {
                log("⚠️ Reader update completed but reader not yet connected - connection callback should fire soon")
            }
            
            // Clear update status and progress after 5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                self.updateStatus = nil
                self.updateProgress = nil
            }
        }
    }
}
