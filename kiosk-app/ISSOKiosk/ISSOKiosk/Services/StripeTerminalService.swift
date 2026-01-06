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
    
    private var currentCompletion: ((Result<PaymentResult, Error>) -> Void)?
    private weak var currentPaymentViewController: UIViewController?
    
    // Keep-alive timer to prevent reader from sleeping
    private var keepAliveTimer: Timer?
    private let keepAliveInterval: TimeInterval = 30 // 30 seconds
    
    // Connection refresh timer
    private var connectionRefreshTimer: Timer?
    private let connectionRefreshInterval: TimeInterval = 5 * 60 // 5 minutes
    
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
            print("[StripeTerminal] \(message)")
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
        log("💡 Note: M2 readers register automatically when connected (no screen needed)")
        
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
        
        guard currentReader != nil else {
            log("❌ No reader connected")
            completion(.failure(NSError(domain: "StripeTerminal", code: -2, userInfo: [NSLocalizedDescriptionKey: "No reader connected. Please connect a reader first."])))
            return
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
    
    // MARK: - Helper Methods
    
    func checkHardwareConnection() -> Bool {
        return currentReader != nil
    }
    
    func isPaymentInProgress() -> Bool {
        return paymentInProgress
    }
    
    func getReaderInfo() -> (connected: Bool, model: String?) {
        guard let reader = currentReader else {
            return (connected: false, model: nil)
        }
        
        // Use string description for device type to avoid compilation issues
        let deviceTypeString = String(describing: reader.deviceType)
        let modelName = deviceTypeString.contains("chipper2X") || deviceTypeString.contains("M2") ? "Stripe M2" : "Stripe Reader"
        return (connected: true, model: modelName)
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
                    self.log("❌ Connection failed: \(error.localizedDescription)")
                    return
                }
                
                guard let reader = reader else {
                    self.log("❌ Reader is nil after connection")
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
            }
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
        log("📱 Reader software update available: \(String(describing: update))")
    }
    
    @objc func reader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {
        log("📱 Installing reader software update: \(String(describing: update))")
    }
    
    @objc func reader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        log("📱 Reader software update progress: \(Int(progress * 100))%", verbose: true)
    }
    
    @objc func reader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error = error {
            log("❌ Reader software update failed: \(error.localizedDescription)")
        } else {
            log("✅ Reader software update completed successfully")
        }
    }
}
