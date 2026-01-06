import Foundation
import Combine

class HardwareMonitor: ObservableObject {
    static let shared = HardwareMonitor()
    
    @Published var isHardwareConnected = false
    
    private var checkTimer: Timer?
    
    private init() {
        startMonitoring()
    }
    
    func startMonitoring() {
        // Check immediately
        checkHardware()
        
        // Check every 5 seconds
        checkTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.checkHardware()
        }
    }
    
    func stopMonitoring() {
        checkTimer?.invalidate()
        checkTimer = nil
    }
    
    private func checkHardware() {
        // Check for Stripe Terminal reader
        let readerInfo = StripeTerminalService.shared.getReaderInfo()
        let isConnected = readerInfo.connected
        
        DispatchQueue.main.async { [weak self] in
            self?.isHardwareConnected = isConnected
        }
    }
    
    deinit {
        stopMonitoring()
    }
}

