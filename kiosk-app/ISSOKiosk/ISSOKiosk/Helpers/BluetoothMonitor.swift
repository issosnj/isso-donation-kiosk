import Foundation
import CoreBluetooth
import Combine

/// Observes system Bluetooth state. iOS does not allow apps to toggle Bluetooth;
/// this only reports the current state for display in the admin menu.
class BluetoothMonitor: NSObject, ObservableObject {
    static let shared = BluetoothMonitor()

    @Published var state: CBManagerState = .unknown
    @Published var stateDescription: String = "Checking..."

    private var centralManager: CBCentralManager?

    override private init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: .main)
    }

    var isPoweredOn: Bool {
        state == .poweredOn
    }
}

extension BluetoothMonitor: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        state = central.state
        switch central.state {
        case .poweredOn:
            stateDescription = "On"
        case .poweredOff:
            stateDescription = "Off"
        case .resetting:
            stateDescription = "Resetting"
        case .unauthorized:
            stateDescription = "Unauthorized"
        case .unsupported:
            stateDescription = "Unsupported"
        case .unknown:
            stateDescription = "Unknown"
        @unknown default:
            stateDescription = "Unauthorized"
        }
    }
}
