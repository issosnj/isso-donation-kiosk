import Foundation
import Combine

class AppState: ObservableObject {
    @Published var isActivated = false
    @Published var deviceToken: String?
    @Published var deviceId: String?
    @Published var temple: Temple?
    @Published var categories: [DonationCategory] = []
    
    private let keychain = KeychainHelper()
    
    init() {
        loadStoredCredentials()
    }
    
    func activate(deviceCode: String) async throws {
        let response = try await APIService.shared.activateDevice(deviceCode: deviceCode)
        
        await MainActor.run {
            self.deviceToken = response.deviceToken
            self.temple = response.temple
            self.categories = response.categories
            self.isActivated = true
            
            // Extract device ID from JWT token
            let token = response.deviceToken
            self.deviceId = extractDeviceId(from: token)
            keychain.save(token, forKey: "deviceToken")
        }
    }
    
    private func loadStoredCredentials() {
        if let token = keychain.load(forKey: "deviceToken") {
            self.deviceToken = token
            self.deviceId = extractDeviceId(from: token)
            // Don't set isActivated to true until we verify the token is still valid
            // Load temple and categories from API first
            APIService.shared.setDeviceToken(token)
            Task {
                await loadTempleConfig()
            }
        }
    }
    
    private func loadTempleConfig() async {
        // For now, we can't fetch temple config separately
        // The temple data is only returned during activation
        // So if we have a stored token, we'll assume activation is valid
        // and set isActivated to true
        // In the future, we could add a /devices/me endpoint to fetch current config
        
        // Set activated immediately on main thread to ensure UI renders
        // The UI should handle nil temple gracefully
        await MainActor.run {
            self.isActivated = true
        }
        
        // Authorize Square Mobile Payments SDK if Square is connected
        if let templeId = extractTempleId(from: deviceToken ?? ""),
           let token = deviceToken {
            Task {
                await authorizeSquareSDK()
            }
        }
    }
    
    private func extractTempleId(from token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        
        guard let payloadData = base64URLDecode(parts[1]) else { return nil }
        
        do {
            if let payload = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
               let templeId = payload["templeId"] as? String {
                return templeId
            }
        } catch {
            print("Error decoding JWT payload: \(error)")
        }
        
        return nil
    }
    
    private func authorizeSquareSDK() async {
        do {
            // Get Square credentials from backend
            let credentials = try await APIService.shared.getSquareCredentials()
            
            // Authorize Mobile Payments SDK
            try await SquareMobilePaymentsService.shared.authorize(
                accessToken: credentials.accessToken,
                locationId: credentials.locationId
            )
            
            print("[AppState] Square Mobile Payments SDK authorized successfully")
        } catch {
            print("[AppState] Failed to authorize Square SDK: \(error.localizedDescription)")
            // Don't block app - Square SDK authorization can happen later
        }
    }
    
    // Extract device ID from JWT token payload
    private func extractDeviceId(from token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        
        // Decode the payload (second part)
        guard let payloadData = base64URLDecode(parts[1]) else { return nil }
        
        do {
            if let payload = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
               let deviceId = payload["deviceId"] as? String {
                return deviceId
            }
        } catch {
            print("Error decoding JWT payload: \(error)")
        }
        
        return nil
    }
    
    // Base64 URL decode helper
    private func base64URLDecode(_ string: String) -> Data? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 = base64.padding(toLength: base64.count + 4 - remainder, withPad: "=", startingAt: 0)
        }
        
        return Data(base64Encoded: base64)
    }
}

struct Temple: Codable {
    let id: String
    let name: String
    let address: String?
    let logoUrl: String?
    let branding: Branding?
    let squareLocationId: String?
    let homeScreenConfig: HomeScreenConfig?
}

struct HomeScreenConfig: Codable {
    let idleTimeoutSeconds: Int? // Time in seconds before returning to home
    let customMessage: String?
    let whatsAppLink: String?
    let eventsText: String? // Deprecated
    let googleCalendarLink: String?
    let localEvents: [LocalEvent]?
    let socialMedia: [SocialMediaLink]?
}

struct LocalEvent: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let date: String // ISO date string (YYYY-MM-DD)
    let startTime: String?
    let endTime: String?
    let isAllDay: Bool?
}

struct Branding: Codable {
    let primaryColor: String?
    let secondaryColor: String?
}

struct DonationCategory: Codable, Identifiable {
    let id: String
    let name: String
}

struct SocialMediaLink: Codable {
    let platform: String
    let url: String
}

struct DeviceActivationResponse: Codable {
    let deviceToken: String
    let temple: Temple
    let categories: [DonationCategory]
}

