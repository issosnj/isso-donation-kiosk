import Foundation
import ExternalAccessory
import Combine
import SquareMobilePaymentsSDK

class HardwareMonitor: ObservableObject {
    static let shared = HardwareMonitor()
    
    @Published var isHardwareConnected = false
    
    private var checkTimer: Timer?
    private let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
    
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
        
        // Also listen for accessory connection/disconnection notifications (for Square Stand compatibility)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(accessoryConnected),
            name: .EAAccessoryDidConnect,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(accessoryDisconnected),
            name: .EAAccessoryDidDisconnect,
            object: nil
        )
        
        // Register with EAAccessoryManager to receive notifications
        EAAccessoryManager.shared().registerForLocalNotifications()
    }
    
    func stopMonitoring() {
        checkTimer?.invalidate()
        checkTimer = nil
        NotificationCenter.default.removeObserver(self)
    }
    
    private func checkHardware() {
        // First check for Bluetooth reader using Square SDK (primary method for Square Reader 2nd Gen)
        var foundBluetoothReader = false
        
        // Check if SDK is authorized and has readers
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        if authState == .authorized {
            let readerManager = MobilePaymentsSDK.shared.readerManager
            let readers = readerManager.readers
            foundBluetoothReader = !readers.isEmpty
        }
        
        // Also check for Square Stand (External Accessory) for backward compatibility
        var foundSquareStand = false
        let manager = EAAccessoryManager.shared()
        let connectedAccessories = manager.connectedAccessories
        
        for accessory in connectedAccessories {
            let accessoryProtocols = accessory.protocolStrings
            let hasSquareProtocol = accessoryProtocols.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            
            if hasSquareProtocol {
                foundSquareStand = true
                break
            }
        }
        
        // Hardware is connected if either Bluetooth reader or Square Stand is found
        let isConnected = foundBluetoothReader || foundSquareStand
        
        DispatchQueue.main.async { [weak self] in
            self?.isHardwareConnected = isConnected
        }
    }
    
    @objc private func accessoryConnected(notification: Notification) {
        if let accessory = notification.userInfo?[EAAccessoryKey] as? EAAccessory {
            let accessoryProtocols = accessory.protocolStrings
            let hasSquareProtocol = accessoryProtocols.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            
            if hasSquareProtocol {
                DispatchQueue.main.async { [weak self] in
                    self?.isHardwareConnected = true
                }
            }
        }
    }
    
    @objc private func accessoryDisconnected(notification: Notification) {
        // Re-check hardware status after disconnection
        checkHardware()
    }
    
    deinit {
        stopMonitoring()
    }
}

