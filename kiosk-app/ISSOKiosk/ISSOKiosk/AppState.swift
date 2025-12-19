import Foundation
import Combine
import SquareMobilePaymentsSDK

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
            APIService.shared.setDeviceToken(token)
            // Load temple config asynchronously
            Task {
                await loadTempleConfig()
            }
        }
    }
    
    func refreshCategories() async {
        guard let templeId = extractTempleId(from: deviceToken ?? "") else {
            print("[AppState] ⚠️ Cannot refresh categories - missing templeId")
            return
        }
        
        do {
            // Fetch fresh categories from kiosk endpoint (filtered by date/time)
            let categories = try await APIService.shared.getKioskCategories(templeId: templeId)
            await MainActor.run {
                self.categories = categories
                print("[AppState] ✅ Categories refreshed: \(categories.count) categories")
            }
        } catch {
            print("[AppState] ❌ Failed to refresh categories: \(error.localizedDescription)")
        }
    }
    
    private func loadTempleConfig() async {
        // Fetch temple config from backend using templeId from JWT token
        guard let token = deviceToken,
              let templeId = extractTempleId(from: token) else {
            print("[AppState] ⚠️ Cannot load temple config - missing token or templeId")
            await MainActor.run {
                self.isActivated = true
            }
            return
        }
        
        print("[AppState] 📡 Fetching temple config for templeId: \(templeId)")
        print("[AppState] 📡 API Base URL: \(Config.apiBaseURL)")
        
        do {
            // Fetch temple data from backend (no timeout wrapper - let URLSession handle it)
            print("[AppState] 📡 Starting temple fetch request...")
            let temple = try await APIService.shared.getTemple(templeId: templeId)
            
            await MainActor.run {
                self.temple = temple
                self.isActivated = true
                print("[AppState] ✅ Temple config loaded: \(temple.name)")
                print("[AppState] ✅ Temple ID: \(temple.id)")
            }
            
            // Authorize Square Mobile Payments SDK if device token exists
            Task {
                await authorizeSquareSDK()
            }
        } catch {
            print("[AppState] ❌ Failed to load temple config")
            print("[AppState] ❌ Error type: \(type(of: error))")
            print("[AppState] ❌ Error description: \(error.localizedDescription)")
            if let apiError = error as? APIError {
                print("[AppState] ❌ API Error details: \(apiError)")
            }
            // Still set activated so app can function, but temple will be nil
            await MainActor.run {
                self.isActivated = true
            }
            
            // Still try to authorize SDK even if temple fetch failed
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
        // Step 2: Verify SDK is available
        let sdk = MobilePaymentsSDK.shared
        print("[AppState] ✅ Square Mobile Payments SDK is available")
        
        // Step 5: Request required permissions first
        print("[AppState] Requesting location and Bluetooth permissions...")
        
        // Request location permission
        let locationGranted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
            PermissionsManager.shared.requestLocationPermission { granted in
                if granted {
                    print("[AppState] ✅ Location permission granted")
                } else {
                    print("[AppState] ⚠️ Location permission denied - payments may fail")
                }
                continuation.resume(returning: granted)
            }
        }
        
        // Request Bluetooth permission
        let bluetoothGranted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
            PermissionsManager.shared.requestBluetoothPermission { granted in
                if granted {
                    print("[AppState] ✅ Bluetooth permission granted")
                } else {
                    print("[AppState] ⚠️ Bluetooth permission denied - contactless payments may fail")
                }
                continuation.resume(returning: granted)
            }
        }
        
        // Log final permission status
        if locationGranted && bluetoothGranted {
            print("[AppState] ✅ All required permissions granted")
        } else {
            print("[AppState] ⚠️ Some permissions were denied - Square SDK may have limited functionality")
        }
        
        // Step 4: Authorize SDK with credentials from backend
        do {
            // Get Square credentials from backend
            let credentials = try await APIService.shared.getSquareCredentials()
            
            // Authorize Mobile Payments SDK (uses completion handler, not async/await)
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                SquareMobilePaymentsService.shared.authorize(
                    accessToken: credentials.accessToken,
                    locationId: credentials.locationId
                ) { error in
                    if let error = error {
                        print("[AppState] ❌ Failed to authorize Square SDK: \(error.localizedDescription)")
                    } else {
                        print("[AppState] ✅ Square Mobile Payments SDK authorized successfully")
                        // Reader detection is automatically checked after authorization
                    }
                    continuation.resume()
                }
            }
        } catch {
            let errorMessage: String
            if let apiError = error as? APIError {
                errorMessage = apiError.localizedDescription
            } else {
                errorMessage = error.localizedDescription
            }
            print("[AppState] ❌ Failed to get Square credentials: \(errorMessage)")
            print("[AppState] This usually means:")
            print("[AppState]   1. The temple hasn't connected Square in the admin portal, OR")
            print("[AppState]   2. The device token is invalid/expired, OR")
            print("[AppState]   3. The backend API is unavailable")
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
    let presetAmounts: [Double]? // Preset donation amounts configured by admin
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
    let defaultAmount: Double?
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

