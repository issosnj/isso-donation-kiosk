import SwiftUI

struct DeviceActivationView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @State private var deviceCode = ""
    @State private var isActivating = false
    @State private var errorMessage: String?
    @State private var retryCount = 0
    @State private var showRetryButton = false
    @State private var showQRScanner = false
    @State private var scannedCode: String?
    private let maxRetries = 3
    
    var body: some View {
        ZStack {
            Color.white
                .ignoresSafeArea()
            
            VStack(spacing: 50) {
                Image(systemName: "qrcode.viewfinder")
                    .font(.system(size: 120))
                    .foregroundColor(.blue)
            
            VStack(spacing: 15) {
                Text("Enter Device Code")
                    .font(.system(size: 42, weight: .bold))
                
                Text("Enter the 8-character device code or scan the QR code")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 60)
                
                // QR Code Scanner Button
                Button(action: {
                    showQRScanner = true
                }) {
                    HStack {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 20))
                        Text("Scan QR Code")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .foregroundColor(.blue)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.top, 10)
            }
            
            VStack(spacing: 20) {
                // Connection status indicator
                if !networkMonitor.isConnected {
                    HStack {
                        Image(systemName: "wifi.slash")
                            .foregroundColor(.orange)
                        Text("No Internet Connection")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(10)
                }
                
                TextField("Device Code", text: $deviceCode)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(size: 36, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 400)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 20)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(deviceCode.count == 8 ? Color.blue : Color.gray, lineWidth: 2)
                    )
                    .onChange(of: deviceCode) { newValue in
                        deviceCode = String(newValue.prefix(8).uppercased())
                        // Clear error when user starts typing
                        if errorMessage != nil {
                            errorMessage = nil
                            showRetryButton = false
                            retryCount = 0
                        }
                    }
                
                // Error message with recovery suggestion
                if let error = errorMessage {
                    VStack(spacing: 10) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.red)
                        }
                        
                        if let error = errorMessage, (error.contains("No internet") || error.contains("network") || error.contains("connection")) {
                            Text("Check your Wi-Fi or network connection")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 40)
                    
                    // Retry button
                    if showRetryButton && retryCount < maxRetries {
                        Button(action: {
                            retryActivation()
                        }) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Retry (\(retryCount + 1)/\(maxRetries))")
                            }
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: 300)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .padding(.top, 10)
                    }
                }
            }
            
            Button(action: activateDevice) {
                if isActivating {
                    HStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Activating...")
                            .font(.system(size: 20, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: 400)
                    .padding(.vertical, 20)
                    .background(Color.blue.opacity(0.7))
                    .cornerRadius(16)
                } else {
                    Text("Activate Device")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: 400)
                        .padding(.vertical, 20)
                        .background((deviceCode.count == 8 && networkMonitor.isConnected) ? Color.blue : Color.gray)
                        .cornerRadius(16)
                }
            }
            .disabled(deviceCode.count != 8 || isActivating || !networkMonitor.isConnected)
            }
            .padding(40)
        }
        .sheet(isPresented: $showQRScanner) {
            QRCodeScannerView(scannedCode: $scannedCode)
        }
        .onChange(of: scannedCode) { newValue in
            if let code = newValue {
                // Extract device code from QR (might be just the code or a URL)
                if code.count == 8 {
                    deviceCode = code.uppercased()
                } else if let url = URL(string: code),
                          let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                          let codeParam = components.queryItems?.first(where: { $0.name == "code" })?.value,
                          codeParam.count == 8 {
                    deviceCode = codeParam.uppercased()
                } else if code.count > 8, let last8 = code.suffix(8).description.uppercased().allSatisfy({ $0.isLetter || $0.isNumber }) ? code.suffix(8).description.uppercased() : nil {
                    deviceCode = last8
                }
            }
        }
    }
    
    private func activateDevice() {
        guard deviceCode.count == 8 else { return }
        guard networkMonitor.isConnected else {
            errorMessage = "No internet connection. Please check your network and try again."
            return
        }
        
        isActivating = true
        errorMessage = nil
        showRetryButton = false
        retryCount = 0
        
        performActivation()
    }
    
    private func performActivation() {
        Task {
            do {
                try await appState.activate(deviceCode: deviceCode)
                // Success - view will automatically navigate via ContentView
            } catch let error as APIError {
                await MainActor.run {
                    errorMessage = error.errorDescription ?? error.localizedDescription
                    isActivating = false
                    
                    // Show retry button for network errors or server errors
                    if case .networkError = error,
                       case .noConnection = error,
                       case .httpError(let code) = error, code >= 500 {
                        if retryCount < maxRetries {
                            showRetryButton = true
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isActivating = false
                }
            }
        }
    }
    
    private func retryActivation() {
        guard retryCount < maxRetries else { return }
        guard networkMonitor.isConnected else {
            errorMessage = "No internet connection. Please check your network and try again."
            return
        }
        
        retryCount += 1
        isActivating = true
        errorMessage = nil
        
        // Add a small delay before retry
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
            performActivation()
        }
    }
}

