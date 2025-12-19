import Foundation

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
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        let result = try JSONDecoder().decode(DeviceActivationResponse.self, from: data)
        setDeviceToken(result.deviceToken)
        return result
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
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
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

