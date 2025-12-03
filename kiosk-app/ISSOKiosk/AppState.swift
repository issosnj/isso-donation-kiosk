import Foundation
import Combine

class AppState: ObservableObject {
    @Published var isActivated = false
    @Published var deviceToken: String?
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
            
            // Store in keychain
            if let token = response.deviceToken {
                keychain.save(token, forKey: "deviceToken")
            }
        }
    }
    
    private func loadStoredCredentials() {
        if let token = keychain.load(forKey: "deviceToken") {
            self.deviceToken = token
            self.isActivated = true
            // Load temple and categories from API
            Task {
                await loadTempleConfig()
            }
        }
    }
    
    private func loadTempleConfig() async {
        // This would load temple config using device token
        // For now, we'll load it during activation
    }
}

struct Temple: Codable {
    let id: String
    let name: String
    let logoUrl: String?
    let branding: Branding?
    let squareLocationId: String?
}

struct Branding: Codable {
    let primaryColor: String?
    let secondaryColor: String?
}

struct DonationCategory: Codable, Identifiable {
    let id: String
    let name: String
}

struct DeviceActivationResponse: Codable {
    let deviceToken: String
    let temple: Temple
    let categories: [DonationCategory]
}

