import Foundation

// Centralized logging utility with timestamps
// Format: [MM/dd HH:mm:ss.SSS] [Category] Message
class Logger {
    static func log(_ message: String, category: String = "App") {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd HH:mm:ss.SSS"
        let timestamp = formatter.string(from: Date())
        print("[\(timestamp)] [\(category)] \(message)")
    }
}

// Convenience extension for easy logging
extension String {
    func log(category: String = "App") {
        Logger.log(self, category: category)
    }
}

// Global function for easy logging (can be used anywhere)
// Using appLog to avoid conflict with Swift's built-in log() function for numeric types
func appLog(_ message: String, category: String = "App") {
    Logger.log(message, category: category)
    // Also buffer log for telemetry (lazy initialization ensures service exists)
    DeviceTelemetryService.shared.addLog(category: category, message: message, level: "info")
}

