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
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if requiresAuth, let token = deviceToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
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
        donorEmail: String? = nil
    ) async throws -> Donation {
        struct Request: Codable {
            let squarePaymentId: String
            let status: String
            let donorName: String?
            let donorEmail: String?
        }
        
        let body = Request(
            squarePaymentId: squarePaymentId,
            status: status,
            donorName: donorName,
            donorEmail: donorEmail
        )
        
        return try await request(
            endpoint: "/donations/\(donationId)/complete",
            method: "POST",
            body: try encodeToDict(body),
            requiresAuth: true
        )
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

