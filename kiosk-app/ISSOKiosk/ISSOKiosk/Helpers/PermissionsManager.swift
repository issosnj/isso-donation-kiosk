import Foundation
import CoreLocation
import CoreBluetooth
import UIKit

// Step 5: Request location and Bluetooth permissions for Square Mobile Payments SDK
class PermissionsManager: NSObject {
    static let shared = PermissionsManager()
    
    private lazy var locationManager = CLLocationManager()
    private var centralManager: CBCentralManager?
    private var locationPermissionCompletion: ((Bool) -> Void)?
    private var bluetoothPermissionCompletion: ((Bool) -> Void)?
    
    private override init() {
        super.init()
        locationManager.delegate = self
    }
    
    // Request location permission (required for Square payments)
    func requestLocationPermission(completion: @escaping (Bool) -> Void) {
        switch CLLocationManager.authorizationStatus() {
        case .notDetermined:
            print("[PermissionsManager] Requesting location permission...")
            locationPermissionCompletion = completion
            locationManager.requestWhenInUseAuthorization()
            // Note: Completion will be called in delegate method when user responds
        case .restricted, .denied:
            print("[PermissionsManager] ⚠️ Location permission denied - user must enable in Settings")
            completion(false)
        case .authorizedAlways, .authorizedWhenInUse:
            print("[PermissionsManager] ✅ Location permission already granted")
            completion(true)
        @unknown default:
            print("[PermissionsManager] ⚠️ Unknown location authorization status")
            completion(false)
        }
    }
    
    // Request Bluetooth permission (required for contactless readers)
    func requestBluetoothPermission(completion: @escaping (Bool) -> Void) {
        // Check current authorization state
        let authStatus = CBManager.authorization
        switch authStatus {
        case .notDetermined:
            print("[PermissionsManager] Requesting Bluetooth permission...")
            bluetoothPermissionCompletion = completion
            // Create CBCentralManager to trigger permission prompt
            // Note: Completion will be called in delegate method when state updates
            centralManager = CBCentralManager(
                delegate: self,
                queue: .main,
                options: nil
            )
        case .restricted, .denied:
            print("[PermissionsManager] ⚠️ Bluetooth permission denied - user must enable in Settings")
            completion(false)
        case .allowedAlways:
            print("[PermissionsManager] ✅ Bluetooth permission already granted")
            completion(true)
        @unknown default:
            print("[PermissionsManager] ⚠️ Unknown Bluetooth authorization status")
            completion(false)
        }
    }
    
    // Check if all required permissions are granted
    func hasAllRequiredPermissions() -> Bool {
        let locationGranted = CLLocationManager.authorizationStatus() == .authorizedWhenInUse ||
                             CLLocationManager.authorizationStatus() == .authorizedAlways
        let bluetoothGranted = CBManager.authorization == .allowedAlways
        
        return locationGranted && bluetoothGranted
    }
}

// MARK: - CLLocationManagerDelegate
extension PermissionsManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        // Only call completion if we have one waiting and status is determined
        guard let completion = locationPermissionCompletion else {
            return
        }
        
        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            locationPermissionCompletion = nil
            print("[PermissionsManager] ✅ Location permission granted")
            completion(true)
        case .denied, .restricted:
            locationPermissionCompletion = nil
            print("[PermissionsManager] ⚠️ Location permission denied")
            completion(false)
        case .notDetermined:
            // Still waiting for user response - keep completion for next update
            break
        @unknown default:
            locationPermissionCompletion = nil
            completion(false)
        }
    }
}

// MARK: - CBCentralManagerDelegate
extension PermissionsManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        // Only call completion if we have one waiting
        guard let completion = bluetoothPermissionCompletion else {
            return
        }
        
        let authStatus = CBManager.authorization
        
        // Check authorization status - this is what we care about, not just the state
        switch authStatus {
        case .allowedAlways:
            bluetoothPermissionCompletion = nil
            print("[PermissionsManager] ✅ Bluetooth permission granted")
            completion(true)
        case .denied, .restricted:
            bluetoothPermissionCompletion = nil
            print("[PermissionsManager] ⚠️ Bluetooth permission denied")
            completion(false)
        case .notDetermined:
            // Still waiting for user response
            // Only keep waiting if Bluetooth is in a valid state (not unsupported/unauthorized)
            switch central.state {
            case .poweredOn, .poweredOff, .resetting:
                // Valid states - poll authorization status periodically
                // Start polling after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                    self?.checkBluetoothAuthorization(completion: completion)
                }
            case .unauthorized:
                bluetoothPermissionCompletion = nil
                print("[PermissionsManager] ⚠️ Bluetooth unauthorized")
                completion(false)
            case .unsupported:
                bluetoothPermissionCompletion = nil
                print("[PermissionsManager] ⚠️ Bluetooth not supported on this device")
                completion(false)
            @unknown default:
                bluetoothPermissionCompletion = nil
                completion(false)
            }
        @unknown default:
            bluetoothPermissionCompletion = nil
            completion(false)
        }
    }
    
    private func checkBluetoothAuthorization(completion: @escaping (Bool) -> Void) {
        let authStatus = CBManager.authorization
        
        switch authStatus {
        case .allowedAlways:
            bluetoothPermissionCompletion = nil
            print("[PermissionsManager] ✅ Bluetooth permission granted (polled)")
            completion(true)
        case .denied, .restricted:
            bluetoothPermissionCompletion = nil
            print("[PermissionsManager] ⚠️ Bluetooth permission denied (polled)")
            completion(false)
        case .notDetermined:
            // Still waiting - poll again after another delay (max 5 seconds total)
            if bluetoothPermissionCompletion != nil {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                    self?.checkBluetoothAuthorization(completion: completion)
                }
            }
        @unknown default:
            bluetoothPermissionCompletion = nil
            completion(false)
        }
    }
}

