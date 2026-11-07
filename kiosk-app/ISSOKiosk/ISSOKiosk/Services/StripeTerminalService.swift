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
// - Keep a live reader connection. Do not disconnect it just because it has been idle.
// - The M2 can still look online and reject the first collect after a long sleep.
//   That rejection is collected again on the same payment, on the same screen.
// - A fresh connection token is minted whenever the SDK asks (tokens are single-use).

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
    private var currentPaymentIntent: PaymentIntent? // Store current intent being collected for cancellation
    private var currentPaymentIntentId: String? // Store PaymentIntent ID for backend cancellation
    private var cancelRequested = false
    private var didFinishPayment = false
    private var collectStartedAt: Date?
    
    // Completions waiting on an in-flight discover/connect.
    private let connectStateLock = NSLock()
    private var connectCompletions: [(Error?) -> Void] = []
    private var didAttemptConnect = false
    private var discoveryTimeoutTimer: Timer?
    
    /// Last successful connect or completed payment. Reading cached reader
    /// properties does not count — that does not talk to the M2.
    private var lastReaderActivityAt: Date?
    /// After this much silence the reader can still look online while the
    /// next payment is rejected. Reconnect before collecting.
    private let staleSessionInterval: TimeInterval = 5 * 60
    private let discoveryTimeout: TimeInterval = 25
    
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
        discoveryTimeoutTimer?.invalidate()
        connectionStatusCheckTimer?.invalidate()
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
        // Stripe connection tokens are single-use. Returning a cached token
        // makes the next reader command fail after the session has been idle,
        // while the reader still looks connected.
        log("📡 Fetching a new connection token from backend...")
        Task {
            do {
                let credentials = try await APIService.shared.getStripeCredentials()
                await MainActor.run {
                    self.connectionToken = credentials.connectionToken
                    if self.locationId == nil || self.locationId?.isEmpty == true {
                        self.locationId = credentials.locationId
                    }
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
        connectToReader(from: viewController, forceReconnect: false, completion: completion)
    }
    
    /// Connect only when the SDK has actually dropped the reader.
    /// A connected M2 that has been idle is left alone; disconnecting it
    /// is what makes the next donation fail before the card is collected.
    func prepareReaderIfStale(completion: @escaping (Error?) -> Void) {
        if paymentInProgress {
            completion(nil)
            return
        }
        guard !isSdkReaderConnected else {
            completion(nil)
            return
        }
        guard let viewController = UIViewController.topViewController() else {
            log("⚠️ No view controller available to connect the reader")
            completion(nil)
            return
        }
        log("🔄 Reader is offline — connecting before the donor pays")
        connectToReader(from: viewController, forceReconnect: false, completion: completion)
    }
    
    func isReaderConnected() -> Bool {
        isSdkReaderConnected
    }
    
    /// True only after a card collect was rejected for a reader/session reason
    /// and the in-place retry also failed. Card declines and cancellations are not included.
    func isSilentRetryableReaderError(_ error: Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == "StripeTerminal" && nsError.code == -100 {
            return false
        }
        return nsError.userInfo["silentReaderRetry"] as? Bool == true
    }
    
    private func connectToReader(from _: UIViewController, forceReconnect: Bool, completion: @escaping (Error?) -> Void) {
        let sdkConnected = isSdkReaderConnected
        
        connectStateLock.lock()
        if isConnecting {
            connectCompletions.append(completion)
            connectStateLock.unlock()
            log("⏳ Reader connection already in progress — waiting for it")
            return
        }
        
        let mustReconnect = forceReconnect || !sdkConnected
        if sdkConnected && !mustReconnect {
            if let reader = Terminal.shared.connectedReader {
                currentReader = reader
            }
            connectStateLock.unlock()
            log("✅ Reader already connected")
            startKeepAlive()
            completion(nil)
            return
        }
        
        connectCompletions.append(completion)
        isConnecting = true
        connectStateLock.unlock()
        
        let startDiscovery = { [weak self] in
            self?.beginDiscovery()
        }
        
        if Terminal.shared.connectedReader != nil || currentReader != nil {
            log("🔄 Clearing the previous reader session before discovery")
            disconnectReader {
                startDiscovery()
            }
        } else {
            startDiscovery()
        }
    }
    
    private var isSdkReaderConnected: Bool {
        Terminal.shared.connectedReader != nil
    }
    
    private var isReaderSessionStale: Bool {
        guard let lastReaderActivityAt else {
            return false
        }
        return Date().timeIntervalSince(lastReaderActivityAt) >= staleSessionInterval
    }
    
    private func beginDiscovery() {
        log("🔌 Discovering M2 readers...")
        scheduleDiscoveryTimeout()
        
        // Discover readers using BluetoothScanDiscoveryConfiguration (SDK 3.0)
        // Per Stripe docs: https://docs.stripe.com/terminal/payments/connect-reader
        do {
            let config = try BluetoothScanDiscoveryConfigurationBuilder()
                .setSimulated(false) // Use physical M2 reader
                .build()
            
            log("🔍 Discovering physical M2 readers via Bluetooth...")
            
            Terminal.shared.discoverReaders(config, delegate: self) { error in
                if let error = error {
                    self.log("❌ Discovery failed: \(error.localizedDescription)")
                    self.finishConnect(error)
                    return
                }
                
                // A nil error means discovery ended, or the SDK accepted the scan.
                // Only adopt a reader here after we have already asked to connect.
                // Otherwise this races a stale connectedReader from the session we just dropped.
                if self.didAttemptConnect, let reader = Terminal.shared.connectedReader {
                    self.handleConnected(reader)
                    return
                }
                
                self.log("🔍 Discovery started - M2 reader will auto-register on connection")
            }
        } catch {
            self.log("❌ Failed to create discovery configuration: \(error.localizedDescription)")
            finishConnect(error)
        }
    }
    
    private func scheduleDiscoveryTimeout() {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.discoveryTimeoutTimer?.invalidate()
            self.discoveryTimeoutTimer = Timer.scheduledTimer(withTimeInterval: self.discoveryTimeout, repeats: false) { [weak self] _ in
                guard let self, self.isConnecting else { return }
                self.log("❌ Reader reconnect timed out")
                let error = NSError(
                    domain: "StripeTerminal",
                    code: -6,
                    userInfo: [NSLocalizedDescriptionKey: "Card reader didn't respond. Tap Proceed to Payment to try again."]
                )
                self.finishConnect(error)
            }
        }
    }
    
    private func handleConnected(_ reader: Reader) {
        currentReader = reader
        lastConnectionError = nil
        lastReaderActivityAt = Date()
        log("✅ M2 Reader connected and registered successfully!")
        log("   Serial: \(reader.serialNumber)")
        let deviceTypeString = String(describing: reader.deviceType)
        log("   Device Type: \(deviceTypeString.contains("chipper2X") || deviceTypeString.contains("M2") ? "M2" : "Other")")
        log("   Status: \(String(describing: reader.status))")
        log("💡 Reader is now registered in your Stripe account")
        finishConnect(nil)
    }
    
    private func finishConnect(_ error: Error?) {
        connectStateLock.lock()
        let callbacks = connectCompletions
        let shouldFinish = isConnecting || !callbacks.isEmpty
        if shouldFinish {
            isConnecting = false
            didAttemptConnect = false
            connectCompletions.removeAll()
        }
        connectStateLock.unlock()
        guard shouldFinish else { return }
        
        DispatchQueue.main.async { [weak self] in
            self?.discoveryTimeoutTimer?.invalidate()
            self?.discoveryTimeoutTimer = nil
            self?.stopConnectionStatusCheck()
            if error == nil {
                self?.startKeepAlive()
                self?.startConnectionRefresh()
            }
            callbacks.forEach { $0(error) }
        }
    }
    
    private func markReaderActivity() {
        lastReaderActivityAt = Date()
    }
    
    /// Disconnect from reader
    func disconnectReader(completion: (() -> Void)? = nil) {
        stopKeepAlive()
        stopConnectionRefresh()
        
        guard Terminal.shared.connectedReader != nil || currentReader != nil else {
            currentReader = nil
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
    
    /// Take payment using Stripe Terminal.
    /// `clientSecret` is the PaymentIntent client secret (`pi_..._secret_...`).
    /// `paymentIntentId` is the `pi_...` id stored for cancellation and the backend.
    func takePayment(
        amount: Double,
        clientSecret: String,
        paymentIntentId: String,
        from viewController: UIViewController,
        completion: @escaping (Result<PaymentResult, Error>) -> Void
    ) {
        guard !paymentInProgress else {
            log("⚠️ Payment already in progress")
            completion(.failure(NSError(domain: "StripeTerminal", code: -1, userInfo: [NSLocalizedDescriptionKey: "Payment already in progress"])))
            return
        }
        
        paymentInProgress = true
        didFinishPayment = false
        cancelRequested = false
        collectStartedAt = nil
        currentCompletion = completion
        currentPaymentViewController = viewController
        currentPaymentIntentId = paymentIntentId
        
        log("💳 Starting payment: $\(String(format: "%.2f", amount))")
        
        let startCollect = { [weak self] in
            guard let self else { return }
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            self.retrieveAndCollect(clientSecret: clientSecret, allowReaderRetry: true)
        }
        
        // Same path as a normal donation when the reader is already online.
        // Idle readers stay connected; a rejected wake-up is retried below.
        if isSdkReaderConnected {
            if isReaderSessionStale {
                log("💤 Reader has been idle. Collecting, and retrying automatically if it rejects this attempt.")
            }
            startCollect()
            return
        }
        
        log("🔄 Reader is offline — connecting before collecting payment")
        connectToReader(from: viewController, forceReconnect: false) { error in
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            if let error = error, !self.isSdkReaderConnected {
                self.log("❌ Reader was not ready for payment: \(error.localizedDescription)")
                self.finishPayment(.failure(error))
                return
            }
            startCollect()
        }
    }
    
    private func retrieveAndCollect(clientSecret: String, allowReaderRetry: Bool) {
        if cancelRequested {
            finishPayment(.failure(userCanceledError()))
            return
        }
        if allowReaderRetry {
            collectStartedAt = Date()
        }
        
        Terminal.shared.retrievePaymentIntent(clientSecret: clientSecret) { intent, error in
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            guard let intent = intent, error == nil else {
                let retrieveError = error ?? NSError(domain: "StripeTerminal", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to retrieve payment intent"])
                self.log("❌ Failed to retrieve payment intent: \(retrieveError.localizedDescription)")
                self.retryOrFail(retrieveError, clientSecret: clientSecret, allowReaderRetry: allowReaderRetry)
                return
            }
            
            self.currentPaymentIntent = intent
            self.collectPaymentMethod(on: intent, clientSecret: clientSecret, allowReaderRetry: allowReaderRetry)
        }
    }
    
    private func collectPaymentMethod(on intent: PaymentIntent, clientSecret: String, allowReaderRetry: Bool) {
        // skipTipping: true — donations are a fixed amount; avoids the tipping screen.
        do {
            let collectConfig = try CollectConfigurationBuilder()
                .setSkipTipping(true)
                .build()
            Terminal.shared.collectPaymentMethod(intent, collectConfig: collectConfig) { collectedIntent, error in
                if self.cancelRequested {
                    self.finishPayment(.failure(self.userCanceledError()))
                    return
                }
                if let error = error {
                    let errorDescription = error.localizedDescription.lowercased()
                    if errorDescription.contains("canceled") || errorDescription.contains("cancelled") {
                        self.log("ℹ️ Payment collection canceled: \(error.localizedDescription)")
                    } else {
                        self.log("❌ Payment collection failed: \(error.localizedDescription)")
                    }
                    self.retryOrFail(error, clientSecret: clientSecret, allowReaderRetry: allowReaderRetry)
                    return
                }
                
                guard let collectedIntent = collectedIntent else {
                    let missingIntent = NSError(domain: "StripeTerminal", code: -4, userInfo: [NSLocalizedDescriptionKey: "Payment intent is nil"])
                    self.log("❌ Payment intent is nil after collection")
                    self.retryOrFail(missingIntent, clientSecret: clientSecret, allowReaderRetry: allowReaderRetry)
                    return
                }
                
                self.currentPaymentIntent = collectedIntent
                self.confirmCollectedPayment(collectedIntent)
            }
        } catch {
            log("❌ Failed to create collect configuration: \(error.localizedDescription)")
            retryOrFail(error, clientSecret: clientSecret, allowReaderRetry: allowReaderRetry)
        }
    }
    
    private func confirmCollectedPayment(_ intent: PaymentIntent) {
        // Confirm on the reader. Do not automatically re-collect after confirm:
        // a retry there can authorize the card twice.
        Terminal.shared.confirmPaymentIntent(intent) { confirmedIntent, error in
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            if let error = error {
                self.log("❌ Payment processing failed: \(error.localizedDescription)")
                self.finishPayment(.failure(error))
                return
            }
            guard let confirmedIntent = confirmedIntent else {
                self.log("❌ Payment intent is nil after processing")
                self.finishPayment(.failure(NSError(domain: "StripeTerminal", code: -5, userInfo: [NSLocalizedDescriptionKey: "Payment intent is nil"])))
                return
            }
            
            self.markReaderActivity()
            self.log("✅ Payment completed: \(confirmedIntent.stripeId ?? "unknown")")
            let result = PaymentResult(success: true, paymentIntentId: confirmedIntent.stripeId)
            self.finishPayment(.success(result))
        }
    }
    
    /// The M2 often rejects the first collect after it has been asleep, then
    /// accepts the next one. Retry that collect before the donation is failed.
    private func retryOrFail(_ error: Error, clientSecret: String, allowReaderRetry: Bool) {
        if cancelRequested || isUserCancel(error) {
            finishPayment(.failure(userCanceledError()))
            return
        }
        // Only the fast rejection is the asleep-reader case. A failure after the
        // reader has already been waiting for a card is left for the donor.
        let rejectedImmediately = failedBeforeCardPrompt()
        guard allowReaderRetry, rejectedImmediately, isTransientReaderError(error) else {
            if allowReaderRetry == false && rejectedImmediately && isTransientReaderError(error) {
                finishRecoverableFailure(error)
            } else {
                finishPayment(.failure(error))
            }
            return
        }
        
        let collectAgain = { [weak self] in
            guard let self else { return }
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            self.retrieveAndCollect(clientSecret: clientSecret, allowReaderRetry: false)
        }
        
        // Still connected: the failed command woke the reader. Collect again
        // on this PaymentIntent. Do not drop the Bluetooth session.
        if isSdkReaderConnected && !errorRequiresReconnect(error) {
            log("↻ Reader rejected the first attempt (\(error.localizedDescription)). Collecting again.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0, execute: collectAgain)
            return
        }
        
        log("↻ Reader dropped the first attempt. Reconnecting, then collecting again.")
        lastReaderActivityAt = nil
        guard let viewController = currentPaymentViewController ?? UIViewController.topViewController() else {
            finishRecoverableFailure(error)
            return
        }
        
        connectToReader(from: viewController, forceReconnect: isSdkReaderConnected) { reconnectError in
            if self.cancelRequested {
                self.finishPayment(.failure(self.userCanceledError()))
                return
            }
            if let reconnectError = reconnectError, !self.isSdkReaderConnected {
                self.log("❌ Reconnect before retry failed: \(reconnectError.localizedDescription)")
                self.finishPayment(.failure(error))
                return
            }
            collectAgain()
        }
    }
    
    /// The idle rejection comes back within a couple of seconds. A donor who
    /// was shown the card prompt and then timed out is not the same case.
    private func failedBeforeCardPrompt() -> Bool {
        guard let collectStartedAt else { return true }
        return Date().timeIntervalSince(collectStartedAt) < 15
    }
    
    private func errorRequiresReconnect(_ error: Error) -> Bool {
        let message = error.localizedDescription.lowercased()
        let markers = ["not connected", "disconnected", "disconnect", "no active reader"]
        return markers.contains { message.contains($0) }
    }
    
    private func isUserCancel(_ error: Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == "StripeTerminal" && nsError.code == -100 {
            return true
        }
        return error.localizedDescription.lowercased().contains("canceled by user")
            || error.localizedDescription.lowercased().contains("cancelled by user")
    }
    
    private func finishRecoverableFailure(_ error: Error) {
        let nsError = error as NSError
        var info = nsError.userInfo
        info["silentReaderRetry"] = true
        finishPayment(.failure(NSError(domain: nsError.domain, code: nsError.code, userInfo: info)))
    }
    
    private func isTransientReaderError(_ error: Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == "StripeTerminal" && (nsError.code == -100 || nsError.code == -1 || nsError.code == -6 || nsError.code == -7) {
            return false
        }
        
        let message = error.localizedDescription.lowercased()
        let hardFailures = [
            "declin", "insufficient", "do not honor", "lost card", "stolen",
            "incorrect pin", "expired card", "not permitted", "fraud"
        ]
        if hardFailures.contains(where: { message.contains($0) }) {
            return false
        }
        
        let transientMarkers = [
            "not connected", "disconnected", "disconnect", "bluetooth",
            "reader is busy", "reader busy", "session", "timed out", "timeout",
            "communicate", "interrupted", "connection token", "connection was lost",
            "could not connect", "unable to connect", "network", "offline",
            "try again", "unexpected", "canceled", "cancelled", "no active reader",
            "reader error"
        ]
        if transientMarkers.contains(where: { message.contains($0) }) {
            return true
        }
        // Stripe often surfaces the idle rejection as a numeric SDK error
        // ("The operation couldn’t be completed. (com.stripe-terminal error …)").
        // One retry is safe: card declines are excluded above, and confirm is not retried.
        return nsError.domain.lowercased().contains("stripe")
    }
    
    private func userCanceledError() -> NSError {
        NSError(
            domain: "StripeTerminal",
            code: -100,
            userInfo: [NSLocalizedDescriptionKey: "Payment canceled by user"]
        )
    }
    
    private func finishPayment(_ result: Result<PaymentResult, Error>) {
        guard !didFinishPayment else { return }
        didFinishPayment = true
        paymentInProgress = false
        currentPaymentIntent = nil
        currentPaymentIntentId = nil
        currentPaymentViewController = nil
        let completion = currentCompletion
        currentCompletion = nil
        completion?(result)
    }
    
    /// Cancel current payment
    func cancelCurrentPayment() {
        guard paymentInProgress else { return }
        
        log("🚫 Canceling payment")
        cancelRequested = true
        
        // Stripe Terminal has no direct cancel for an in-flight collect.
        // Canceling the PaymentIntent on the backend makes collectPaymentMethod
        // fail, and cancelRequested stops the idle-session retry from starting it again.
        if let paymentIntentId = currentPaymentIntentId {
            log("💡 PaymentIntent ID available for backend cancellation: \(paymentIntentId)", verbose: true)
        }
        
        finishPayment(.failure(userCanceledError()))
    }
    
    // MARK: - Keep-Alive Mechanism
    
    private func startKeepAlive() {
        let start = { [weak self] in
            guard let self else { return }
            self.keepAliveTimer?.invalidate()
            self.log("💓 Starting keep-alive timer (every \(Int(self.keepAliveInterval)) seconds)")
            self.keepAliveTimer = Timer.scheduledTimer(withTimeInterval: self.keepAliveInterval, repeats: true) { [weak self] _ in
                self?.performKeepAlive()
            }
        }
        if Thread.isMainThread {
            start()
        } else {
            DispatchQueue.main.async(execute: start)
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
        
        // These fields are cached on the Reader object. Touching them does not
        // wake the M2, so this timer must not reset the stale-session clock.
        _ = reader.serialNumber
        _ = reader.deviceType
        _ = reader.status
        
        log("💓 Keep-alive: cached reader object still present", verbose: true)
    }
    
    // MARK: - Connection Refresh
    
    private func startConnectionRefresh() {
        let start = { [weak self] in
            guard let self else { return }
            self.connectionRefreshTimer?.invalidate()
            self.log("🔄 Starting connection refresh timer (every \(Int(self.connectionRefreshInterval / 60)) minutes)")
            self.connectionRefreshTimer = Timer.scheduledTimer(withTimeInterval: self.connectionRefreshInterval, repeats: true) { [weak self] _ in
                self?.refreshConnection()
            }
        }
        if Thread.isMainThread {
            start()
        } else {
            DispatchQueue.main.async(execute: start)
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
        
        let start = { [weak self] in
            guard let self else { return }
            self.connectionStatusCheckTimer?.invalidate()
            self.connectionStatusCheckTimer = Timer.scheduledTimer(withTimeInterval: self.connectionStatusCheckInterval, repeats: true) { [weak self] _ in
                guard let self else { return }
                
                if let connectedReader = Terminal.shared.connectedReader {
                    let waitingForConnect = self.isConnecting || !self.connectCompletions.isEmpty
                    if self.currentReader == nil || waitingForConnect {
                        self.currentReader = connectedReader
                        self.lastConnectionError = nil
                        self.lastReaderActivityAt = Date()
                        self.log("✅ Reader connection detected via status check - Serial: \(connectedReader.serialNumber)")
                        if waitingForConnect {
                            self.log("💡 Connection completed (software update may still be in progress)")
                            self.finishConnect(nil)
                        } else {
                            self.startKeepAlive()
                            self.startConnectionRefresh()
                        }
                    }
                }
            }
        }
        if Thread.isMainThread {
            start()
        } else {
            DispatchQueue.main.async(execute: start)
        }
    }
    
    private func stopConnectionStatusCheck() {
        connectionStatusCheckTimer?.invalidate()
        connectionStatusCheckTimer = nil
    }
    
    // MARK: - Helper Methods
    
    func checkHardwareConnection() -> Bool {
        return Terminal.shared.connectedReader != nil
    }
    
    func isPaymentInProgress() -> Bool {
        return paymentInProgress
    }
    
    func getReaderInfo() -> (connected: Bool, model: String?, error: String?) {
        // Only the SDK's live reader counts. A cached Reader stays non-nil after
        // the Bluetooth session dies, which is why the kiosk showed "online"
        // and then rejected the first payment.
        guard let reader = Terminal.shared.connectedReader else {
            if !isConnecting {
                currentReader = nil
            }
            return (connected: false, model: nil, error: lastConnectionError)
        }
        
        if currentReader == nil {
            currentReader = reader
            log("📱 Synced connected reader from Terminal.shared", verbose: true)
        }
        
        // Use string description for device type to avoid compilation issues
        let deviceTypeString = String(describing: reader.deviceType)
        let modelName = deviceTypeString.contains("chipper2X") || deviceTypeString.contains("M2") ? "Stripe M2" : "Stripe Reader"
        return (connected: true, model: modelName, error: nil)
    }
    
    /// Get reader battery level (0-100, or nil if not available)
    func getReaderBatteryLevel() -> Int? {
        guard let reader = Terminal.shared.connectedReader else {
            return nil
        }
        
        // Update our cached reader if Terminal.shared has one but we don't
        if currentReader == nil && Terminal.shared.connectedReader != nil {
            currentReader = Terminal.shared.connectedReader
        }
        
        // Try different ways to access battery level from Stripe Terminal Reader
        // M2 readers expose battery level as a property (0.0 to 1.0)
        
        // Method 1: Try direct KVC access
        if let batteryLevel = reader.value(forKeyPath: "batteryLevel") as? NSNumber {
            let percentage = Int(batteryLevel.doubleValue * 100)
            log("🔋 Battery level: \(percentage)%", verbose: true)
            return percentage
        }
        
        // Method 2: Try using responds(to:) to check if property exists
        if reader.responds(to: Selector(("batteryLevel"))) {
            if let result = reader.perform(Selector(("batteryLevel"))) {
                if let batteryLevel = result.takeUnretainedValue() as? NSNumber {
                    let percentage = Int(batteryLevel.doubleValue * 100)
                    log("🔋 Battery level: \(percentage)%", verbose: true)
                    return percentage
                }
            }
        }
        
        // Method 3: Try accessing via string description parsing (fallback)
        let readerDescription = String(describing: reader)
        if readerDescription.contains("batteryLevel") {
            log("⚠️ Battery level property exists but cannot be accessed directly", verbose: true)
        }
        
        log("⚠️ Battery level not available for reader: \(reader.serialNumber)", verbose: true)
        return nil
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
        lastReaderActivityAt = nil
        stopKeepAlive()
        stopConnectionRefresh()
    }
}

// MARK: - DiscoveryDelegate

extension StripeTerminalService: DiscoveryDelegate {
    @objc func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        connectStateLock.lock()
        let shouldConnect = isConnecting && !didAttemptConnect && !readers.isEmpty
        if shouldConnect {
            didAttemptConnect = true
        }
        let stillScanning = isConnecting && readers.isEmpty
        connectStateLock.unlock()
        
        guard shouldConnect else {
            if stillScanning {
                log("⏳ No readers discovered yet, continuing scan...")
            }
            return
        }
        
        // Connect to first available M2 reader
        // Filter for M2 readers if multiple are found
        let m2Reader = readers.first { reader in
            let typeString = String(describing: reader.deviceType)
            return typeString.contains("chipper2X") || typeString.contains("M2")
        } ?? readers.first!
        
        didAttemptConnect = true
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
                if let error = error {
                    let userFriendlyError = self.getUserFriendlyError(error)
                    self.lastConnectionError = userFriendlyError
                    self.log("❌ Connection failed: \(error.localizedDescription)")
                    self.log("📱 User-friendly error: \(userFriendlyError)")
                    self.finishConnect(error)
                    return
                }
                
                if let reader = reader ?? Terminal.shared.connectedReader {
                    self.handleConnected(reader)
                    return
                }
                
                self.log("❌ Reader is nil after connection")
                self.finishConnect(NSError(
                    domain: "StripeTerminal",
                    code: -7,
                    userInfo: [NSLocalizedDescriptionKey: "Reader is nil after connection"]
                ))
            }
            
            // The connect callback can lag behind a software update. If the SDK
            // already has a reader, unblock whoever is waiting to take payment.
            startConnectionStatusCheck()
        } catch {
            self.log("❌ Failed to create connection configuration: \(error.localizedDescription)")
            self.finishConnect(error)
        }
    }
}

// MARK: - BluetoothReaderDelegate

extension StripeTerminalService: BluetoothReaderDelegate {
    @objc func reader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions) {
        markReaderActivity()
        log("📱 Reader input requested: \(String(describing: inputOptions))")
    }
    
    @objc func reader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        markReaderActivity()
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
            if let connectedReader = Terminal.shared.connectedReader, currentReader == nil || isConnecting {
                currentReader = connectedReader
                lastReaderActivityAt = Date()
                log("📱 Reader connected detected during update (progress: 0%) - Serial: \(connectedReader.serialNumber)")
                if isConnecting || !connectCompletions.isEmpty {
                    finishConnect(nil)
                } else {
                    startKeepAlive()
                    startConnectionRefresh()
                }
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
