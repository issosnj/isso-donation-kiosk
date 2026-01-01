import Foundation
import SquareMobilePaymentsSDK

/// Monitors Square Reader connection state to detect when it becomes unresponsive
/// 
/// Detects two failure modes:
/// 1. Reader count goes 1 → 0: Reader disappearing (pairing/power/firmware issue)
/// 2. Reader count stays 1 but payments fail: "Stuck connection" (needs reconnect)
final class SquareReaderWatchdog {
    static let shared = SquareReaderWatchdog()
    
    private var timer: DispatchSourceTimer?
    private(set) var lastSeenReaderCount: Int = 0
    private(set) var consecutiveZeroCount: Int = 0
    private(set) var lastCheckTime: Date?
    
    // Track if we've detected a stuck connection (reader count = 1 but payments failing)
    private(set) var hasStuckConnection: Bool = false
    
    private init() {}
    
    /// Start monitoring reader state every 30 seconds
    func start() {
        stop()
        
        // Reset state
        lastSeenReaderCount = 0
        consecutiveZeroCount = 0
        hasStuckConnection = false
        
        let t = DispatchSource.makeTimerSource(queue: .main)
        // Start after 10 seconds, then repeat every 30 seconds
        t.schedule(deadline: .now() + 10, repeating: 30)
        t.setEventHandler { [weak self] in
            self?.checkReaderState()
        }
        timer = t
        t.resume()
        
        print("[ReaderWatchdog] ✅ Started monitoring (every 30 seconds)")
    }
    
    /// Stop monitoring
    func stop() {
        timer?.cancel()
        timer = nil
        print("[ReaderWatchdog] ⏹️ Stopped monitoring")
    }
    
    /// Check current reader state
    private func checkReaderState() {
        let count = MobilePaymentsSDK.shared.readerManager.readers.count
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        lastCheckTime = Date()
        
        print("[ReaderWatchdog] readers=\(count), auth=\(authState), lastSeen=\(lastSeenReaderCount), consecutiveZero=\(consecutiveZeroCount)")
        
        // Track reader count changes
        if count == 0 {
            consecutiveZeroCount += 1
            
            // If we previously had a reader and now it's gone, log it
            if lastSeenReaderCount > 0 {
                print("[ReaderWatchdog] ⚠️ Reader disappeared: \(lastSeenReaderCount) → 0 (pairing/power/firmware issue)")
            }
        } else {
            consecutiveZeroCount = 0
            
            // If we had 0 and now have a reader, log recovery
            if lastSeenReaderCount == 0 && count > 0 {
                print("[ReaderWatchdog] ✅ Reader recovered: 0 → \(count)")
            }
        }
        
        lastSeenReaderCount = count
        
        // If reader count is 0 and SDK is authorized, this indicates a pairing/power/firmware issue
        if count == 0 && authState == .authorized {
            print("[ReaderWatchdog] ⚠️ SDK authorized but no readers found - may need re-pairing")
        }
    }
    
    /// Mark that a payment failed even though reader count is 1 (stuck connection)
    func markStuckConnection() {
        let count = MobilePaymentsSDK.shared.readerManager.readers.count
        if count == 1 {
            hasStuckConnection = true
            print("[ReaderWatchdog] ⚠️ STUCK CONNECTION detected: reader count = 1 but payment failed")
        }
    }
    
    /// Clear stuck connection flag (e.g., after successful payment or reconnect)
    func clearStuckConnection() {
        if hasStuckConnection {
            print("[ReaderWatchdog] ✅ Cleared stuck connection flag")
        }
        hasStuckConnection = false
    }
    
    /// Get current diagnostic info
    func getDiagnosticInfo() -> (readerCount: Int, lastSeenCount: Int, consecutiveZero: Int, isStuck: Bool) {
        let currentCount = MobilePaymentsSDK.shared.readerManager.readers.count
        return (
            readerCount: currentCount,
            lastSeenCount: lastSeenReaderCount,
            consecutiveZero: consecutiveZeroCount,
            isStuck: hasStuckConnection
        )
    }
}

