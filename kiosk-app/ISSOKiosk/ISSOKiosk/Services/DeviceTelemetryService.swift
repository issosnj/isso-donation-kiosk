import Foundation
import UIKit
import ExternalAccessory
import SystemConfiguration.CaptiveNetwork

class DeviceTelemetryService {
    static let shared = DeviceTelemetryService()
    
    private var logBuffer: [(timestamp: String, category: String, message: String, level: String)] = []
    private let maxLogBufferSize = 100
    
    private init() {
        // Telemetry is sent from ISSOKioskApp heartbeat timer
    }
    
    // Collect current device telemetry
    func collectTelemetry() -> [String: Any] {
        var telemetry: [String: Any] = [:]
        
        // Device Information
        telemetry["deviceModel"] = UIDevice.current.model
        telemetry["osVersion"] = UIDevice.current.systemVersion
        if let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
            telemetry["appVersion"] = appVersion
        }
        
        // Battery Information
        UIDevice.current.isBatteryMonitoringEnabled = true
        let batteryLevel = UIDevice.current.batteryLevel
        if batteryLevel >= 0 {
            telemetry["batteryLevel"] = Double(batteryLevel * 100)
        }
        
        let batteryState: String
        switch UIDevice.current.batteryState {
        case .charging:
            batteryState = "charging"
            telemetry["isCharging"] = true
        case .full:
            batteryState = "full"
            telemetry["isCharging"] = false
        case .unplugged:
            batteryState = "unplugged"
            telemetry["isCharging"] = false
        default:
            batteryState = "unknown"
            telemetry["isCharging"] = false
        }
        telemetry["batteryState"] = batteryState
        
        // Network Information
        let networkInfo = getNetworkInfo()
        telemetry["networkType"] = networkInfo.type
        telemetry["networkSSID"] = networkInfo.ssid
        telemetry["isConnected"] = networkInfo.isConnected
        
        // Disk Space
        if let diskSpace = getDiskSpace() {
            telemetry["diskSpaceUsed"] = diskSpace.used
            telemetry["diskSpaceTotal"] = diskSpace.total
        }
        
        // Memory (approximate)
        if let memory = getMemoryInfo() {
            telemetry["memoryUsed"] = memory.used
            telemetry["memoryTotal"] = memory.total
        }
        
        // Square Hardware Status
        let squareInfo = getSquareHardwareInfo()
        telemetry["squareHardwareConnected"] = squareInfo.connected
        if let model = squareInfo.model {
            telemetry["squareHardwareModel"] = model
        }
        
        // Include buffered logs
        if !logBuffer.isEmpty {
            let logs = logBuffer.map { log in
                [
                    "timestamp": log.timestamp,
                    "category": log.category,
                    "message": log.message,
                    "level": log.level
                ]
            }
            telemetry["logs"] = logs
            logBuffer.removeAll() // Clear buffer after sending
        }
        
        // Metadata
        telemetry["metadata"] = [
            "screenBrightness": UIScreen.main.brightness,
            "isIdleTimerDisabled": UIApplication.shared.isIdleTimerDisabled,
            "orientation": UIDevice.current.orientation.rawValue
        ]
        
        return telemetry
    }
    
    // Add log to buffer
    func addLog(category: String, message: String, level: String = "info") {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        let timestamp = formatter.string(from: Date())
        
        logBuffer.append((timestamp: timestamp, category: category, message: message, level: level))
        
        // Keep buffer size manageable
        if logBuffer.count > maxLogBufferSize {
            logBuffer.removeFirst()
        }
    }
    
    // Send telemetry to backend
    func sendTelemetry(deviceId: String) async throws {
        let telemetry = collectTelemetry()
        
        guard let url = URL(string: "\(Config.apiBaseURL)/devices/\(deviceId)/telemetry") else {
            throw NSError(domain: "DeviceTelemetry", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add device token for authentication
        let keychain = KeychainHelper()
        if let deviceToken = keychain.load(forKey: "deviceToken") {
            request.setValue("Bearer \(deviceToken)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONSerialization.data(withJSONObject: telemetry)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "DeviceTelemetry", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "DeviceTelemetry", code: -3, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"])
        }
        
        appLog("✅ Telemetry sent successfully", category: "DeviceTelemetry")
    }
    
    // Network Information
    private func getNetworkInfo() -> (type: String, ssid: String?, isConnected: Bool) {
        var networkType = "unknown"
        var ssid: String? = nil
        var isConnected = false
        
        // Check WiFi
        if let interfaces = CNCopySupportedInterfaces() as? [String] {
            for interface in interfaces {
                if let info = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any] {
                    ssid = info[kCNNetworkInfoKeySSID as String] as? String
                    networkType = "wifi"
                    isConnected = true
                    break
                }
            }
        }
        
        // Check cellular (basic check)
        if !isConnected {
            var zeroAddress = sockaddr_in()
            zeroAddress.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
            zeroAddress.sin_family = sa_family_t(AF_INET)
            
            let defaultRouteReachability = withUnsafePointer(to: &zeroAddress) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { zeroSockAddress in
                    SCNetworkReachabilityCreateWithAddress(nil, zeroSockAddress)
                }
            }
            
            var flags: SCNetworkReachabilityFlags = []
            if let reachability = defaultRouteReachability,
               SCNetworkReachabilityGetFlags(reachability, &flags) {
                if flags.contains(.reachable) && !flags.contains(.isWWAN) {
                    networkType = "wifi"
                    isConnected = true
                } else if flags.contains(.reachable) && flags.contains(.isWWAN) {
                    networkType = "cellular"
                    isConnected = true
                } else {
                    networkType = "none"
                    isConnected = false
                }
            } else {
                networkType = "none"
                isConnected = false
            }
        }
        
        return (networkType, ssid, isConnected)
    }
    
    // Disk Space
    private func getDiskSpace() -> (used: Double, total: Double)? {
        if let attributes = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory()),
           let totalSize = attributes[.systemSize] as? NSNumber,
           let freeSize = attributes[.systemFreeSize] as? NSNumber {
            let total = Double(truncating: totalSize) / (1024.0 * 1024.0 * 1024.0) // GB
            let free = Double(truncating: freeSize) / (1024.0 * 1024.0 * 1024.0) // GB
            let used = total - free
            return (used: used, total: total)
        }
        return nil
    }
    
    // Memory (approximate)
    private func getMemoryInfo() -> (used: Double, total: Double)? {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            let used = Double(info.resident_size) / (1024.0 * 1024.0) // MB
            // Approximate total memory (iOS devices have fixed RAM)
            let total = Double(ProcessInfo.processInfo.physicalMemory) / (1024.0 * 1024.0) // MB
            return (used: used, total: total)
        }
        
        return nil
    }
    
    // Square Hardware Info
    private func getSquareHardwareInfo() -> (connected: Bool, model: String?) {
        let manager = EAAccessoryManager.shared()
        let connectedAccessories = manager.connectedAccessories
        let squareProtocols = ["com.squareup.s020", "com.squareup.s025", "com.squareup.s089", "com.squareup.protocol.stand"]
        
        for accessory in connectedAccessories {
            let accessoryProtocols = accessory.protocolStrings
            let hasSquareProtocol = accessoryProtocols.contains { protocolString in
                squareProtocols.contains { $0 == protocolString }
            }
            
            if hasSquareProtocol {
                let model = accessory.modelNumber.isEmpty ? accessory.name : accessory.modelNumber
                return (connected: true, model: model)
            }
        }
        
        return (connected: false, model: nil)
    }
}

