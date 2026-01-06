import SwiftUI
import UIKit

struct AdminMenuView: View {
    @SwiftUI.Environment(\.dismiss) var dismiss: DismissAction
    @EnvironmentObject var appState: AppState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var hardwareMonitor = HardwareMonitor.shared
    @State private var logs: [String] = []
    @State private var isLoadingLogs = false
    @State private var showingReconnectAlert = false
    @State private var reconnectStatus = ""
    @State private var isConnectingReader = false
    @State private var isDisconnectingReader = false
    @State private var connectionStatus = ""
    @State private var connectionError: String? = nil
    @State private var readerInfo: (connected: Bool, model: String?) = (false, nil)
    @State private var refreshTimer: Timer? = nil
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Stripe Terminal")) {
                    // Reader Status
                    HStack {
                        Image(systemName: "creditcard")
                            .foregroundColor(.blue)
                        Text("Reader Status")
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(readerInfo.connected ? "Connected" : "Disconnected")
                                .font(.caption)
                                .foregroundColor(readerInfo.connected ? .green : .red)
                            if let model = readerInfo.model {
                                Text(model)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    // Connection Status Message
                    if !connectionStatus.isEmpty {
                        HStack {
                            Image(systemName: connectionStatus.contains("✅") ? "checkmark.circle.fill" : "info.circle.fill")
                                .foregroundColor(connectionStatus.contains("✅") ? .green : .blue)
                            Text(connectionStatus)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Error Message
                    if let error = connectionError {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                    
                    // Connect/Disconnect Buttons
                    if readerInfo.connected {
                        Button(action: {
                            disconnectReader()
                        }) {
                            HStack {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                                Text("Disconnect Reader")
                                Spacer()
                                if isDisconnectingReader {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                }
                            }
                        }
                        .disabled(isDisconnectingReader)
                    } else {
                        Button(action: {
                            connectReader()
                        }) {
                            HStack {
                                Image(systemName: "link.circle.fill")
                                    .foregroundColor(.green)
                                Text("Connect Reader")
                                Spacer()
                                if isConnectingReader {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                }
                            }
                        }
                        .disabled(isConnectingReader)
                    }
                }
                
                Section(header: Text("System Information")) {
                    HStack {
                        Text("Device ID")
                        Spacer()
                        Text(appState.deviceId ?? "Unknown")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Temple")
                        Spacer()
                        Text(appState.temple?.name ?? "Unknown")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Stripe Terminal Status")
                        Spacer()
                        let readerInfo = StripeTerminalService.shared.getReaderInfo()
                        Text(readerInfo.connected ? "Connected" : "Disconnected")
                            .font(.caption)
                            .foregroundColor(readerInfo.connected ? .green : .orange)
                    }
                }
                
                Section(header: Text("Diagnostics")) {
                    // Stripe Terminal Status
                    HStack {
                        Image(systemName: "creditcard")
                            .foregroundColor(.blue)
                        Text("Stripe Terminal")
                        Spacer()
                        Text(readerInfo.connected ? "✅ Connected" : "❌ Disconnected")
                            .font(.caption)
                            .foregroundColor(readerInfo.connected ? .green : .red)
                    }
                }
                
                Section(header: Text("Logs")) {
                    Button(action: {
                        loadLogs()
                    }) {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .foregroundColor(.blue)
                            Text("View System Info")
                            Spacer()
                            if isLoadingLogs {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                        }
                    }
                    
                    if !logs.isEmpty {
                        ForEach(Array(logs.enumerated()), id: \.offset) { index, log in
                            Text(log)
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section(header: Text("Stripe SDK Settings")) {
                    Button(action: {
                        initializeStripeSDK()
                    }) {
                        HStack {
                            Image(systemName: "gear.circle.fill")
                                .foregroundColor(.blue)
                            Text("Initialize Stripe SDK")
                        }
                    }
                    
                    Button(action: {
                        refreshReaderStatus()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise.circle.fill")
                                .foregroundColor(.blue)
                            Text("Refresh Reader Status")
                        }
                    }
                }
                
                Section(header: Text("Actions")) {
                    Button(action: {
                        refreshTempleConfig()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(.blue)
                            Text("Refresh Temple Config")
                        }
                    }
                    
                    Button(action: {
                        refreshCategories()
                    }) {
                        HStack {
                            Image(systemName: "list.bullet")
                                .foregroundColor(.blue)
                            Text("Refresh Categories")
                        }
                    }
                }
            }
            .navigationTitle("Admin Menu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                refreshReaderStatus()
                // Start timer to refresh reader status every 2 seconds
                refreshTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
                    refreshReaderStatus()
                }
            }
            .onDisappear {
                refreshTimer?.invalidate()
                refreshTimer = nil
            }
        }
    }
    
    private func refreshReaderStatus() {
        readerInfo = StripeTerminalService.shared.getReaderInfo()
    }
    
    private func initializeStripeSDK() {
        guard appState.deviceId != nil else {
            connectionError = "Device ID not available"
            return
        }
        
        connectionStatus = "Initializing Stripe SDK..."
        connectionError = nil
        
        Task {
            do {
                let credentials = try await APIService.shared.getStripeCredentials()
                
                await MainActor.run {
                    StripeTerminalService.shared.initialize(
                        connectionToken: credentials.connectionToken,
                        locationId: credentials.locationId
                    ) { error in
                        if let error = error {
                            connectionError = "Initialization failed: \(error.localizedDescription)"
                            connectionStatus = ""
                        } else {
                            connectionStatus = "✅ Stripe SDK initialized successfully"
                            refreshReaderStatus()
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    // Extract more detailed error message
                    let errorMessage: String
                    if let apiError = error as? APIError {
                        errorMessage = apiError.localizedDescription
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    connectionError = "Failed to get credentials: \(errorMessage)"
                    connectionStatus = ""
                }
            }
        }
    }
    
    private func connectReader() {
        guard appState.deviceId != nil else {
            connectionError = "Device ID not available"
            return
        }
        
        isConnectingReader = true
        connectionStatus = "Getting credentials and connecting to reader..."
        connectionError = nil
        
        // First ensure SDK is initialized
        Task {
            do {
                let credentials = try await APIService.shared.getStripeCredentials()
                
                await MainActor.run {
                    // Initialize SDK (will skip if already initialized)
                    StripeTerminalService.shared.initialize(
                        connectionToken: credentials.connectionToken,
                        locationId: credentials.locationId
                    ) { initError in
                        if let initError = initError {
                            isConnectingReader = false
                            connectionError = "Initialization failed: \(initError.localizedDescription)"
                            connectionStatus = ""
                            return
                        }
                        
                        connectionStatus = "Discovering readers..."
                        
                        // Now connect to reader - need to get the current view controller
                        // Try to get the view controller from the navigation controller
                        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                           let window = windowScene.windows.first,
                           let rootViewController = window.rootViewController {
                            
                            // Find the topmost view controller
                            var topViewController = rootViewController
                            while let presented = topViewController.presentedViewController {
                                topViewController = presented
                            }
                            
                            // If it's a navigation controller, get the top view controller
                            if let navController = topViewController as? UINavigationController {
                                topViewController = navController.topViewController ?? topViewController
                            }
                            
                            StripeTerminalService.shared.connectToReader(from: topViewController) { connectError in
                                isConnectingReader = false
                                
                                if let connectError = connectError {
                                    connectionError = "Connection failed: \(connectError.localizedDescription)"
                                    connectionStatus = ""
                                } else {
                                    connectionStatus = "✅ Reader connected successfully"
                                    connectionError = nil
                                    refreshReaderStatus()
                                    
                                    // Clear status message after 3 seconds
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                        if connectionStatus.contains("✅") {
                                            connectionStatus = ""
                                        }
                                    }
                                }
                            }
                        } else {
                            isConnectingReader = false
                            connectionError = "Could not find view controller"
                            connectionStatus = ""
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    isConnectingReader = false
                    // Extract more detailed error message
                    let errorMessage: String
                    if let apiError = error as? APIError {
                        errorMessage = apiError.localizedDescription
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    connectionError = "Failed to get credentials: \(errorMessage)"
                    connectionStatus = ""
                }
            }
        }
    }
    
    private func disconnectReader() {
        isDisconnectingReader = true
        connectionStatus = "Disconnecting reader..."
        connectionError = nil
        
        StripeTerminalService.shared.disconnectReader {
            isDisconnectingReader = false
            connectionStatus = "✅ Reader disconnected"
            refreshReaderStatus()
            
            // Clear status message after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                if connectionStatus.contains("✅") {
                    connectionStatus = ""
                }
            }
        }
    }
    
    
    private func loadLogs() {
        isLoadingLogs = true
        appLog("🔧 Admin: Loading system info", category: "AdminMenu")
        
        // Get system information
        let currentReaderInfo = StripeTerminalService.shared.getReaderInfo()
        let deviceId = appState.deviceId ?? "Unknown"
        let templeName = appState.temple?.name ?? "Unknown"
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            logs = [
                "=== System Information ===",
                "Device ID: \(deviceId)",
                "Temple: \(templeName)",
                "",
                "=== Stripe Terminal Status ===",
                "Reader Connected: \(currentReaderInfo.connected ? "Yes" : "No")",
                "Reader Model: \(currentReaderInfo.model ?? "Unknown")",
                "",
                "=== Network Status ===",
                "Connected: \(networkMonitor.isConnected ? "Yes" : "No")",
                "",
                "=== Hardware Status ===",
                "Reader Connected: \(hardwareMonitor.isHardwareConnected ? "Yes" : "No")",
                "",
                "Note: Detailed logs are available in Xcode console."
            ]
            isLoadingLogs = false
        }
    }
    
    private func refreshTempleConfig() {
        appLog("🔧 Admin: Refreshing temple config", category: "AdminMenu")
        Task {
            await appState.refreshTempleConfig()
        }
    }
    
    private func refreshCategories() {
        appLog("🔧 Admin: Refreshing categories", category: "AdminMenu")
        Task {
            await appState.refreshCategories()
        }
    }
}

struct AdminPasswordView: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var appState: AppState
    @FocusState private var isPasswordFocused: Bool
    @State private var password: String = ""
    @State private var errorMessage: String = ""
    @State private var isAuthenticated: Bool = false
    
    // Default password - should be configurable or stored securely
    private let adminPassword = "isso2024"
    
    var body: some View {
        ZStack {
            // Blurred background overlay
            Color.white.opacity(0.85)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Main card
                VStack(spacing: 28) {
                    // Header with icon
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.purple.opacity(0.15), Color.blue.opacity(0.15)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 80, height: 80)
                            
                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 36))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.purple, Color.blue],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        }
                        
                        Text("Admin Access")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        
                        Text("Enter your password to continue")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                    
                    // Password input section
                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.primary)
                                .padding(.horizontal, 4)
                            
                            HStack {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(.secondary)
                                    .frame(width: 20)
                                
                                SecureField("", text: $password, prompt: Text("Enter password").foregroundColor(.secondary.opacity(0.6)))
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(.primary)
                                    .textContentType(.password)
                                    .autocorrectionDisabled()
                                    .textInputAutocapitalization(.never)
                                    .focused($isPasswordFocused)
                                    .onSubmit {
                                        if !password.isEmpty {
                                            checkPassword()
                                        }
                                    }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color(.systemGray6))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(
                                                errorMessage.isEmpty 
                                                    ? Color(.systemGray4) 
                                                    : Color.red,
                                                lineWidth: errorMessage.isEmpty ? 1 : 2
                                            )
                                    )
                            )
                        }
                        
                        // Error message with animation
                        if !errorMessage.isEmpty {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                                
                                Text(errorMessage)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.red)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.red.opacity(0.1))
                            )
                            .transition(.opacity.combined(with: .scale(scale: 0.95)))
                        }
                    }
                    
                    // Action buttons
                    HStack(spacing: 12) {
                        Button {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                password = ""
                                errorMessage = ""
                                isPresented = false
                            }
                        } label: {
                            Text("Cancel")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color(.systemGray5))
                                )
                        }
                        
                        Button {
                            checkPassword()
                        } label: {
                            Text("Submit")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    LinearGradient(
                                        colors: password.isEmpty 
                                            ? [Color.gray.opacity(0.4), Color.gray.opacity(0.4)]
                                            : [Color.purple, Color.blue],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(12)
                                .shadow(color: password.isEmpty ? Color.clear : Color.purple.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                        .disabled(password.isEmpty)
                    }
                }
                .padding(32)
                .background(
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color(.systemBackground))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24)
                                .stroke(
                                    Color(.systemGray4),
                                    lineWidth: 1
                                )
                        )
                        .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                )
                .padding(.horizontal, 32)
                
                Spacer()
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: errorMessage.isEmpty)
        .onAppear {
            // Auto-focus password field when view appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isPasswordFocused = true
            }
        }
        .fullScreenCover(isPresented: $isAuthenticated) {
            AdminMenuView()
                .environmentObject(appState)
        }
    }
    
    private func checkPassword() {
        if password == adminPassword {
            isAuthenticated = true
            password = ""
            errorMessage = ""
        } else {
            errorMessage = "Incorrect password"
            password = ""
        }
    }
}

