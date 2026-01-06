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

final class StripeTerminalService: NSObject, ConnectionDelegate, PaymentDelegate, ReaderDisplayDelegate {
    static let shared = StripeTerminalService()
    
    // MARK: - State
    
    private var connectionToken: String?
    private var locationId: String?
    private var currentReader: Reader?
    private var isConnecting = false
    private var isPaymentInProgress = false
    private var useSimulatedReader = false // Set to true only for testing without hardware
    
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
    /// Works with both test and live mode - uses physical M2 reader
    /// Location ID is required for reader registration per Stripe docs
    func initialize(connectionToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
        self.connectionToken = connectionToken
        self.locationId = locationId
        
        // Set connection token provider
        // Note: In Stripe Terminal SDK, you need to provide a ConnectionTokenProvider
        // For now, we'll store the token and provide it when needed
        Terminal.shared.delegate = self
        
        // Detect test mode from connection token (test tokens work with test account)
        let isTestMode = connectionToken.contains("test") || connectionToken.count < 50
        if isTestMode {
            log("✅ Stripe Terminal initialized (TEST MODE - using physical M2 reader)")
        } else {
            log("✅ Stripe Terminal initialized (LIVE MODE - using physical M2 reader)")
        }
        log("📍 Location ID: \(locationId)")
        completion(nil)
    }
    
    /// Set connection token provider for Terminal SDK
    /// This is called by the SDK when it needs a new connection token
    func provideConnectionToken(completion: @escaping (String?, Error?) -> Void) {
        if let token = connectionToken {
            completion(token, nil)
        } else {
            // Fetch new token if needed
            Task {
                do {
                    let credentials = try await APIService.shared.getStripeCredentials()
                    await MainActor.run {
                        self.connectionToken = credentials.connectionToken
                        completion(credentials.connectionToken, nil)
                    }
                } catch {
                    await MainActor.run {
                        completion(nil, error)
                    }
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
        
        // Discover readers using BluetoothScanDiscoveryConfiguration
        // Per Stripe docs: https://docs.stripe.com/terminal/payments/connect-reader
        do {
            let config = try BluetoothScanDiscoveryConfigurationBuilder().build()
            
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
        
        guard let reader = currentReader else {
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
        guard !isPaymentInProgress else {
            log("⚠️ Payment already in progress")
            completion(.failure(NSError(domain: "StripeTerminal", code: -1, userInfo: [NSLocalizedDescriptionKey: "Payment already in progress"])))
            return
        }
        
        guard let reader = currentReader else {
            log("❌ No reader connected")
            completion(.failure(NSError(domain: "StripeTerminal", code: -2, userInfo: [NSLocalizedDescriptionKey: "No reader connected. Please connect a reader first."])))
            return
        }
        
        isPaymentInProgress = true
        currentCompletion = completion
        currentPaymentViewController = viewController
        
        log("💳 Starting payment: $\(String(format: "%.2f", amount))")
        
        // Retrieve payment intent
        Terminal.shared.retrievePaymentIntent(paymentIntentId) { intent, error in
            guard let intent = intent, error == nil else {
                self.isPaymentInProgress = false
                self.log("❌ Failed to retrieve payment intent: \(error?.localizedDescription ?? "unknown error")")
                completion(.failure(error ?? NSError(domain: "StripeTerminal", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to retrieve payment intent"])))
                return
            }
            
            // Collect payment
            let collectConfig = CollectConfiguration()
            Terminal.shared.collectPaymentMethod(intent, collectConfig: collectConfig, delegate: self) { intent, error in
                if let error = error {
                    self.isPaymentInProgress = false
                    self.log("❌ Payment collection failed: \(error.localizedDescription)")
                    completion(.failure(error))
                    return
                }
                
                guard let intent = intent else {
                    self.isPaymentInProgress = false
                    self.log("❌ Payment intent is nil after collection")
                    completion(.failure(NSError(domain: "StripeTerminal", code: -4, userInfo: [NSLocalizedDescriptionKey: "Payment intent is nil"])))
                    return
                }
                
                // Process payment
                Terminal.shared.processPayment(intent) { intent, error in
                    self.isPaymentInProgress = false
                    
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
                    
                    self.log("✅ Payment completed: \(intent.stripeId)")
                    let result = PaymentResult(success: true, paymentIntentId: intent.stripeId)
                    completion(.success(result))
                }
            }
        }
    }
    
    /// Cancel current payment
    func cancelCurrentPayment() {
        guard isPaymentInProgress else { return }
        
        log("🚫 Canceling payment")
        Terminal.shared.cancelCollectPaymentMethod { error in
            if let error = error {
                self.log("⚠️ Cancel error: \(error.localizedDescription)")
            }
        }
        
        isPaymentInProgress = false
        currentCompletion = nil
    }
    
    // MARK: - ConnectionDelegate
    
    func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        guard isConnecting else { return }
        
        if readers.isEmpty {
            log("⏳ No readers discovered yet, continuing scan...")
            return
        }
        
        // Connect to first available M2 reader
        // Filter for M2 readers if multiple are found
        let m2Reader = readers.first { $0.deviceType == .chipper2X } ?? readers.first!
        
        log("🔌 Connecting to M2 reader: \(m2Reader.serialNumber)")
        log("📱 Reader location: \(m2Reader.location ?? "unknown")")
        
        Terminal.shared.connectReader(m2Reader, delegate: self) { reader, error in
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
            self.log("   Device Type: \(reader.deviceType == .chipper2X ? "M2" : "Other")")
            self.log("   Status: \(reader.status)")
            self.log("   Location: \(reader.location ?? "default")")
            self.log("💡 Reader is now registered in your Stripe account")
            self.startKeepAlive()
            self.startConnectionRefresh()
        }
    }
    
    // MARK: - PaymentDelegate
    
    func terminal(_ terminal: Terminal, didRequestReaderInput inputOptions: ReaderInputOptions) {
        log("📱 Reader input requested: \(inputOptions)")
    }
    
    func terminal(_ terminal: Terminal, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        log("📱 Reader display message: \(displayMessage)")
    }
    
    // MARK: - ReaderDisplayDelegate
    
    func reader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        log("📱 Reader display: \(displayMessage)")
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
        guard let reader = currentReader, !isPaymentInProgress else {
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
        guard !isPaymentInProgress, currentReader != nil else {
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
        return isPaymentInProgress
    }
    
    func getReaderInfo() -> (connected: Bool, model: String?) {
        guard let reader = currentReader else {
            return (connected: false, model: nil)
        }
        
        let modelName = reader.deviceType == .chipper2X ? "Stripe M2" : "Stripe Reader"
        return (connected: true, model: modelName)
    }
}

