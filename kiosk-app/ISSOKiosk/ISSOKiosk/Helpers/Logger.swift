import Foundation

// Centralized logging utility with timestamps
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

