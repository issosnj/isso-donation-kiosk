import Foundation
import Combine

class APIService {
    static let shared = APIService()
    
    private let baseURL = Config.apiBaseURL
    private var deviceToken: String?
    
    private init() {}
    
    func setDeviceToken(_ token: String) {
        self.deviceToken = token
    }
    
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        let fullURL = "\(baseURL)\(endpoint)"
        print("[APIService] 🌐 Request: \(method) \(fullURL)")
        
        guard let url = URL(string: fullURL) else {
            print("[APIService] ❌ Invalid URL: \(fullURL)")
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30.0 // 30 second timeout (increased from 15)
        
        if requiresAuth, let token = deviceToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("[APIService] 🔐 Using authentication token")
        } else if requiresAuth {
            print("[APIService] ⚠️ Auth required but no token available")
        }
        
        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            print("[APIService] 📦 Request body: \(body)")
        }
        
        print("[APIService] ⏳ Starting network request...")
        let (data, response) = try await URLSession.shared.data(for: request)
        print("[APIService] ✅ Network request completed")
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("[APIService] ❌ Invalid response type")
            throw APIError.invalidResponse
        }
        
        print("[APIService] 📊 HTTP Status: \(httpResponse.statusCode)")
        print("[APIService] 📊 Response data size: \(data.count) bytes")
        
        guard (200...299).contains(httpResponse.statusCode) else {
            print("[APIService] ❌ HTTP Error: \(httpResponse.statusCode)")
            // Try to parse error message from response body
            if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = errorData["message"] as? String {
                print("[APIService] ❌ Server error message: \(message)")
                throw APIError.serverError(message)
            }
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIService] ❌ Response body: \(responseString)")
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        do {
            let decoded = try JSONDecoder().decode(T.self, from: data)
            print("[APIService] ✅ Successfully decoded response")
            return decoded
        } catch {
            print("[APIService] ❌ Decoding error: \(error)")
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIService] ❌ Response body (for debugging): \(responseString.prefix(500))")
            }
            throw APIError.decodingError(error)
        }
    }
    
    func activateDevice(deviceCode: String) async throws -> DeviceActivationResponse {
        // Validate device code format
        guard deviceCode.count == 8, deviceCode.allSatisfy({ $0.isLetter || $0.isNumber }) else {
            throw APIError.invalidDeviceCode
        }
        
        // Check network connectivity
        if !NetworkMonitor.shared.isConnected {
            throw APIError.noConnection
        }
        
        struct Request: Codable {
            let deviceCode: String
        }
        
        let body = try JSONEncoder().encode(Request(deviceCode: deviceCode))
        
        guard let url = URL(string: "\(baseURL)/devices/activate") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        request.timeoutInterval = 10.0 // 10 second timeout
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            // Handle specific HTTP status codes
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    let result = try JSONDecoder().decode(DeviceActivationResponse.self, from: data)
                    setDeviceToken(result.deviceToken)
                    return result
                } catch {
                    throw APIError.decodingError(error)
                }
            case 400:
                throw APIError.invalidDeviceCode
            case 401, 404:
                throw APIError.deviceNotFound
            case 409:
                throw APIError.deviceAlreadyActivated
            case 500...599:
                // Try to extract error message from response
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.httpError(httpResponse.statusCode)
            default:
                throw APIError.httpError(httpResponse.statusCode)
            }
        } catch let error as APIError {
            throw error
        } catch {
            // Network errors
            throw APIError.networkError(error)
        }
    }
    
    func initiateDonation(
        templeId: String,
        deviceId: String,
        amount: Double,
        categoryId: String?
    ) async throws -> Donation {
        struct Request: Codable {
            let templeId: String
            let deviceId: String
            let amount: Double
            let currency: String
            let categoryId: String?
        }
        
        let body = Request(
            templeId: templeId,
            deviceId: deviceId,
            amount: amount,
            currency: "USD",
            categoryId: categoryId
        )
        
        return try await request(
            endpoint: "/donations/initiate",
            method: "POST",
            body: try encodeToDict(body),
            requiresAuth: true
        )
    }
    
    func sendHeartbeat(deviceId: String) async throws {
        guard let url = URL(string: "\(baseURL)/devices/\(deviceId)/heartbeat") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = deviceToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
    }
    
    func completeDonation(
        donationId: String,
        squarePaymentId: String,
        status: String,
        donorName: String? = nil,
        donorPhone: String? = nil,
        donorEmail: String? = nil
    ) async throws -> Donation {
        struct Request: Codable {
            let squarePaymentId: String
            let status: String
            let donorName: String?
            let donorPhone: String?
            let donorEmail: String?
        }
        
        let body = Request(
            squarePaymentId: squarePaymentId,
            status: status,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail
        )
        
        return try await request(
            endpoint: "/donations/\(donationId)/complete",
            method: "POST",
            body: try encodeToDict(body),
            requiresAuth: true
        )
    }
    
    func cancelDonation(donationId: String) async throws -> Donation {
        return try await request(
            endpoint: "/donations/\(donationId)/cancel",
            method: "POST",
            body: nil,
            requiresAuth: true
        )
    }
    
    func getTemple(templeId: String) async throws -> Temple {
        print("[APIService] 📡 Fetching temple: \(templeId)")
        print("[APIService] 📡 Endpoint: /temples/\(templeId)")
        print("[APIService] 📡 Base URL: \(baseURL)")
        print("[APIService] 📡 Device token available: \(deviceToken != nil)")
        
        guard let url = URL(string: "\(baseURL)/temples/\(templeId)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30.0 // Increased timeout to 30 seconds for temple fetch
        
        // Try with auth first (device token), fallback to no auth if needed
        if let token = deviceToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                // If auth failed, try without auth
                if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                    print("[APIService] ⚠️ Request with auth failed (status: \(httpResponse.statusCode)), trying without auth...")
                    var noAuthRequest = URLRequest(url: url)
                    noAuthRequest.httpMethod = "GET"
                    noAuthRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    noAuthRequest.timeoutInterval = 30.0
                    
                    let (noAuthData, noAuthResponse) = try await URLSession.shared.data(for: noAuthRequest)
                    
                    guard let noAuthHttpResponse = noAuthResponse as? HTTPURLResponse else {
                        throw APIError.invalidResponse
                    }
                    
                    guard (200...299).contains(noAuthHttpResponse.statusCode) else {
                        if let errorData = try? JSONSerialization.jsonObject(with: noAuthData) as? [String: Any],
                           let message = errorData["message"] as? String {
                            throw APIError.serverError(message)
                        }
                        throw APIError.httpError(noAuthHttpResponse.statusCode)
                    }
                    
                    let result = try JSONDecoder().decode(Temple.self, from: noAuthData)
                    print("[APIService] ✅ Temple fetched successfully (no auth): \(result.name)")
                    return result
                }
                
                // Try to parse error message from response body
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.httpError(httpResponse.statusCode)
            }
            
            let result = try JSONDecoder().decode(Temple.self, from: data)
            print("[APIService] ✅ Temple fetched successfully: \(result.name)")
            return result
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    func getKioskCategories(templeId: String) async throws -> [DonationCategory] {
        print("[APIService] 📡 Fetching kiosk categories for temple: \(templeId)")
        print("[APIService] 📡 Endpoint: /donation-categories/kiosk/\(templeId)")
        print("[APIService] 📡 Device token available: \(deviceToken != nil)")
        
        do {
            let categories: [DonationCategory] = try await request(
                endpoint: "/donation-categories/kiosk/\(templeId)",
                method: "GET",
                requiresAuth: true
            )
            print("[APIService] ✅ Successfully fetched \(categories.count) categories")
            if categories.count > 0 {
                print("[APIService] 📋 Category details:")
                for (index, cat) in categories.enumerated() {
                    print("[APIService]   \(index + 1). \(cat.name) (ID: \(cat.id), defaultAmount: \(cat.defaultAmount ?? 0))")
                }
            }
            return categories
        } catch {
            print("[APIService] ❌ Failed to fetch categories: \(error)")
            print("[APIService] ❌ Error type: \(type(of: error))")
            if let apiError = error as? APIError {
                print("[APIService] ❌ API Error: \(apiError.localizedDescription)")
            }
            throw error
        }
    }
    
    private func encodeToDict<T: Codable>(_ value: T) throws -> [String: Any] {
        let data = try JSONEncoder().encode(value)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)
    case noConnection
    case deviceNotFound
    case deviceAlreadyActivated
    case invalidDeviceCode
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server configuration. Please contact support."
        case .invalidResponse:
            return "Invalid response from server. Please try again."
        case .httpError(let code):
            switch code {
            case 400:
                return "Invalid device code. Please check and try again."
            case 401:
                return "Device code not found or already activated."
            case 404:
                return "Device not found. Please verify the device code."
            case 409:
                return "This device has already been activated."
            case 500...599:
                return "Server error. Please try again in a moment."
            default:
                return "Connection error (Code: \(code)). Please try again."
            }
        case .decodingError:
            return "Failed to process server response. Please try again."
        case .networkError(let error):
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet:
                    return "No internet connection. Please check your network and try again."
                case NSURLErrorTimedOut:
                    return "Connection timed out. Please check your network and try again."
                case NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost:
                    return "Cannot connect to server. Please check your network connection."
                default:
                    return "Network error. Please check your connection and try again."
                }
            }
            return "Network error: \(error.localizedDescription)"
        case .noConnection:
            return "No internet connection. Please check your network settings and try again."
        case .deviceNotFound:
            return "Device code not found. Please verify the code and try again."
        case .deviceAlreadyActivated:
            return "This device has already been activated."
        case .invalidDeviceCode:
            return "Invalid device code format. Please enter an 8-character code."
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .noConnection, .networkError:
            return "Check your Wi-Fi or network connection and try again."
        case .deviceNotFound, .invalidDeviceCode:
            return "Verify the device code is correct and try again."
        case .deviceAlreadyActivated:
            return "This device is already set up. If you need to reactivate, contact your administrator."
        case .httpError(let code) where code >= 500:
            return "The server is temporarily unavailable. Please wait a moment and try again."
        default:
            return "Please try again. If the problem persists, contact support."
        }
    }
}

struct Donation: Codable {
    let id: String
    let templeId: String
    let deviceId: String
    let amount: Double
    let status: String
}

// Suggestion submission
struct SubmitSuggestionRequest: Codable {
    let templeId: String
    let deviceId: String
    let suggestion: String
}

struct SubmitSuggestionResponse: Codable {
    let id: String
    let message: String
}

extension APIService {
    func submitSuggestion(templeId: String, deviceId: String, suggestion: String) async throws -> SubmitSuggestionResponse {
        let body: [String: Any] = [
            "templeId": templeId,
            "deviceId": deviceId,
            "suggestion": suggestion
        ]
        
        return try await request(
            endpoint: "/suggestions",
            method: "POST",
            body: body,
            requiresAuth: true
        )
    }
    
    func getSquareCredentials() async throws -> SquareCredentials {
        return try await request(
            endpoint: "/devices/square-credentials",
            method: "GET",
            body: nil,
            requiresAuth: true
        )
    }
}

struct SquareCredentials: Codable {
    let accessToken: String
    let locationId: String
}

