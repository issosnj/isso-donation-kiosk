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
        requiresAuth: Bool = true,
        maxRetries: Int = 3,
        timeout: TimeInterval = 30.0
    ) async throws -> T {
        let fullURL = "\(baseURL)\(endpoint)"
        print("[APIService] 🌐 Request: \(method) \(fullURL)")
        
        guard let url = URL(string: fullURL) else {
            print("[APIService] ❌ Invalid URL: \(fullURL)")
            throw APIError.invalidURL
        }
        
        var lastError: Error?
        
        // Retry loop with exponential backoff
        for attempt in 0..<maxRetries {
            if attempt > 0 {
                // Exponential backoff: 1s, 2s, 4s
                let delay = pow(2.0, Double(attempt - 1))
                print("[APIService] 🔄 Retry attempt \(attempt + 1)/\(maxRetries) after \(delay)s delay...")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = timeout // Configurable timeout (default 30s)
            
            if requiresAuth, let token = deviceToken {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                if attempt == 0 {
                    print("[APIService] 🔐 Using authentication token")
                }
            } else if requiresAuth {
                print("[APIService] ⚠️ Auth required but no token available")
            }
            
            if let body = body {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                if attempt == 0 {
                    print("[APIService] 📦 Request body: \(body)")
                }
            }
            
            if attempt == 0 {
                print("[APIService] ⏳ Starting network request...")
            }
            
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                
                if attempt > 0 {
                    print("[APIService] ✅ Network request completed on retry \(attempt + 1)")
                } else {
                    print("[APIService] ✅ Network request completed")
                }
                
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
            } catch let error as NSError {
                lastError = error
                
                // Check if it's a network error that should be retried
                let isNetworkError = error.domain == NSURLErrorDomain && (
                    error.code == NSURLErrorTimedOut ||
                    error.code == NSURLErrorNetworkConnectionLost ||
                    error.code == NSURLErrorNotConnectedToInternet ||
                    error.code == NSURLErrorCannotConnectToHost ||
                    error.code == NSURLErrorCannotFindHost ||
                    error.code == NSURLErrorDNSLookupFailed ||
                    error.code == -1005 // Connection lost
                )
                
                if isNetworkError && attempt < maxRetries - 1 {
                    print("[APIService] ⚠️ Network error (code: \(error.code)): \(error.localizedDescription)")
                    print("[APIService] 💡 Will retry...")
                    continue
                } else {
                    // Not a retryable error or max retries reached
                    print("[APIService] ❌ Request failed: \(error.localizedDescription)")
                    if let apiError = error as? APIError {
                        throw apiError
                    }
                    throw APIError.networkError(error)
                }
            } catch {
                // Non-NSError, don't retry
                print("[APIService] ❌ Request failed: \(error.localizedDescription)")
                throw error
            }
        }
        
        // If we get here, all retries failed
        if let lastError = lastError {
            throw APIError.networkError(lastError)
        } else {
            throw APIError.networkError(NSError(domain: NSURLErrorDomain, code: NSURLErrorUnknown, userInfo: [NSLocalizedDescriptionKey: "Request failed after \(maxRetries) attempts"]))
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
            
            print("[APIService] 📊 HTTP Status: \(httpResponse.statusCode)")
            print("[APIService] 📊 Response data size: \(data.count) bytes")
            
            // Log response body for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIService] 📄 Response body: \(responseString.prefix(500))")
            }
            
            // Handle specific HTTP status codes
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    let result = try JSONDecoder().decode(DeviceActivationResponse.self, from: data)
                    print("[APIService] ✅ Successfully decoded activation response")
                    setDeviceToken(result.deviceToken)
                    return result
                } catch let decodingError {
                    print("[APIService] ❌ Decoding error: \(decodingError)")
                    // Try to extract error message from response if it's actually an error
                    if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let message = errorData["message"] as? String {
                        print("[APIService] ⚠️ Found error message in response: \(message)")
                        throw APIError.serverError(message)
                    }
                    throw APIError.decodingError(decodingError)
                }
            case 400:
                // Try to extract error message
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.invalidDeviceCode
            case 401, 404:
                // Try to extract error message
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.deviceNotFound
            case 409:
                // Try to extract error message
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.deviceAlreadyActivated
            case 500...599:
                // Try to extract error message from response
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.httpError(httpResponse.statusCode)
            default:
                // For any other status code, try to extract error message
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = errorData["message"] as? String {
                    throw APIError.serverError(message)
                }
                throw APIError.httpError(httpResponse.statusCode)
            }
        } catch let error as APIError {
            throw error
        } catch {
            // Network errors
            print("[APIService] ❌ Network error: \(error.localizedDescription)")
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
        stripePaymentIntentId: String? = nil,
        status: String,
        donorName: String? = nil,
        donorPhone: String? = nil,
        donorEmail: String? = nil,
        donorAddress: String? = nil
    ) async throws -> Donation {
        struct Request: Codable {
            let stripePaymentIntentId: String?
            let status: String
            let donorName: String?
            let donorPhone: String?
            let donorEmail: String?
            let donorAddress: String?
        }
        
        let body = Request(
            stripePaymentIntentId: stripePaymentIntentId,
            status: status,
            donorName: donorName,
            donorPhone: donorPhone,
            donorEmail: donorEmail,
            donorAddress: donorAddress
        )
        
        return try await request(
            endpoint: "/donations/\(donationId)/complete",
            method: "POST",
            body: try encodeToDict(body),
            requiresAuth: true
        )
    }
    
    func createPaymentIntent(donationId: String, amount: Double, currency: String = "usd") async throws -> PaymentIntentResponse {
        struct Request: Codable {
            let donationId: String
            let amount: Double
            let currency: String
        }
        
        let body = Request(
            donationId: donationId,
            amount: amount,
            currency: currency
        )
        
        return try await request(
            endpoint: "/donations/create-payment-intent",
            method: "POST",
            body: try encodeToDict(body),
            requiresAuth: true
        )
    }
    
    func confirmPaymentIntent(donationId: String, paymentIntentId: String) async throws -> ConfirmPaymentIntentResponse {
        struct Request: Codable {
            let donationId: String
            let paymentIntentId: String
        }
        
        let body = Request(
            donationId: donationId,
            paymentIntentId: paymentIntentId
        )
        
        return try await request(
            endpoint: "/donations/confirm-payment-intent",
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
    
    func createPledge(
        templeId: String,
        deviceId: String,
        amount: Double,
        categoryId: String?,
        donorName: String,
        donorPhone: String,
        donorEmail: String?
    ) async throws -> Donation {
        var body: [String: Any] = [
            "templeId": templeId,
            "deviceId": deviceId,
            "amount": amount,
            "donorName": donorName,
            "donorPhone": donorPhone,
        ]
        
        if let categoryId = categoryId {
            body["categoryId"] = categoryId
        }
        
        if let donorEmail = donorEmail, !donorEmail.isEmpty {
            body["donorEmail"] = donorEmail
        }
        
        return try await request(
            endpoint: "/donations/pledge",
            method: "POST",
            body: body,
            requiresAuth: true
        )
    }
    
    func getTemple(templeId: String, timeout: TimeInterval = 10.0) async throws -> Temple {
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
        request.timeoutInterval = timeout // Configurable timeout (default 10s for faster startup)
        
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
                    noAuthRequest.timeoutInterval = timeout
                    
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
    
    func getReligiousEvents() async throws -> [ReligiousEvent] {
        print("[APIService] 📡 Fetching religious events")
        print("[APIService] 📡 Endpoint: /religious-events/kiosk")
        print("[APIService] 📡 Device token available: \(deviceToken != nil)")
        
        do {
            let events: [ReligiousEvent] = try await request(
                endpoint: "/religious-events/kiosk",
                method: "GET",
                requiresAuth: true
            )
            print("[APIService] ✅ Successfully fetched \(events.count) religious events")
            return events
        } catch {
            print("[APIService] ❌ Failed to fetch religious events: \(error)")
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
    let pledgeToken: String?
    let pledgeExpiryDate: String?
    let pledgePaymentLink: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case templeId
        case deviceId
        case amount
        case status
        case pledgeToken
        case pledgeExpiryDate
        case pledgePaymentLink
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        templeId = try container.decode(String.self, forKey: .templeId)
        deviceId = try container.decode(String.self, forKey: .deviceId)
        
        // Handle amount as either String or Double
        if let amountString = try? container.decode(String.self, forKey: .amount) {
            amount = Double(amountString) ?? 0.0
        } else if let amountDouble = try? container.decode(Double.self, forKey: .amount) {
            amount = amountDouble
        } else {
            amount = 0.0
        }
        
        status = try container.decode(String.self, forKey: .status)
        pledgeToken = try container.decodeIfPresent(String.self, forKey: .pledgeToken)
        pledgeExpiryDate = try container.decodeIfPresent(String.self, forKey: .pledgeExpiryDate)
        pledgePaymentLink = try container.decodeIfPresent(String.self, forKey: .pledgePaymentLink)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(templeId, forKey: .templeId)
        try container.encode(deviceId, forKey: .deviceId)
        try container.encode(amount, forKey: .amount)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(pledgeToken, forKey: .pledgeToken)
        try container.encodeIfPresent(pledgeExpiryDate, forKey: .pledgeExpiryDate)
        try container.encodeIfPresent(pledgePaymentLink, forKey: .pledgePaymentLink)
    }
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
    
    func getStripeCredentials() async throws -> StripeCredentials {
        // Stripe credentials request - use default timeout (30s) and fewer retries
        return try await request(
            endpoint: "/devices/stripe-credentials",
            method: "GET",
            body: nil,
            requiresAuth: true,
            maxRetries: 1,
            timeout: 30.0
        )
    }
    
    func lookupDonor(phone: String) async throws -> DonorLookupResponse {
        let encodedPhone = phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? phone
        return try await request(
            endpoint: "/donors/device/lookup/\(encodedPhone)",
            method: "GET",
            body: nil,
            requiresAuth: true
        )
    }
    
    func autocompleteAddress(input: String, sessionToken: String? = nil) async throws -> AddressAutocompleteResponse {
        var endpoint = "/places/autocomplete?input=\(input.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? input)"
        if let token = sessionToken {
            endpoint += "&sessionToken=\(token.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? token)"
        }
        return try await request(
            endpoint: endpoint,
            method: "GET",
            body: nil,
            requiresAuth: true
        )
    }
    
    func getPlaceDetails(placeId: String, sessionToken: String? = nil) async throws -> PlaceDetailsResponse {
        var endpoint = "/places/details?placeId=\(placeId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? placeId)"
        if let token = sessionToken {
            endpoint += "&sessionToken=\(token.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? token)"
        }
        return try await request(
            endpoint: endpoint,
            method: "GET",
            body: nil,
            requiresAuth: true
        )
    }
}

struct StripeCredentials: Codable {
    let connectionToken: String
    let locationId: String
}

struct DonorLookupResponse: Codable {
    let found: Bool
    let donor: DonorInfo?
}

struct DonorInfo: Codable {
    let id: String
    let name: String?
    let email: String?
    let phone: String
    let address: String?
}

struct AddressAutocompleteResponse: Codable {
    let predictions: [AddressPrediction]
}

struct AddressPrediction: Codable, Identifiable {
    let description: String
    let place_id: String
    let structured_formatting: StructuredFormatting
    
    var id: String { place_id }
}

struct StructuredFormatting: Codable {
    let main_text: String
    let secondary_text: String
}

struct PlaceDetailsResponse: Codable {
    let formatted_address: String?
    let address_components: [AddressComponent]?
}

struct AddressComponent: Codable {
    let long_name: String
    let short_name: String
    let types: [String]
}

struct PaymentIntentResponse: Codable {
    let clientSecret: String
    let paymentIntentId: String
}

struct ConfirmPaymentIntentResponse: Codable {
    let success: Bool
    let paymentIntentId: String
    let status: String
}

