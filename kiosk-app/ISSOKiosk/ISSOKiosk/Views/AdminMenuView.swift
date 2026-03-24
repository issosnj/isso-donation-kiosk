import SwiftUI
import UIKit

struct AdminMenuView: View {
    @SwiftUI.Environment(\.dismiss) var dismiss: DismissAction
    @EnvironmentObject var appState: AppState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var hardwareMonitor = HardwareMonitor.shared
    @ObservedObject private var bluetoothMonitor = BluetoothMonitor.shared
    @State private var logs: [String] = []
    @State private var isLoadingLogs = false
    @State private var showingReconnectAlert = false
    @State private var reconnectStatus = ""
    @State private var isConnectingReader = false
    @State private var isDisconnectingReader = false
    @State private var connectionStatus = ""
    @State private var connectionError: String? = nil
    @State private var readerInfo: (connected: Bool, model: String?, error: String?) = (false, nil, nil)
    @State private var refreshTimer: Timer? = nil
    @State private var isCheckingUpdate = false
    
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
                    
                    // Error Message - Show connection error or service error
                    if let error = connectionError ?? readerInfo.error {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("Connection Error")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                            }
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.vertical, 4)
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

                Section(header: Text("Wi‑Fi")) {
                    HStack {
                        Image(systemName: "wifi")
                            .foregroundColor(networkMonitor.connectionType == .wifi ? .green : .secondary)
                        Text("Status")
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(networkMonitor.isConnected ? "Connected" : "Disconnected")
                                .font(.caption)
                                .foregroundColor(networkMonitor.isConnected ? .green : .red)
                            Text(connectionTypeLabel)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    Button(action: openSettings) {
                        HStack {
                            Image(systemName: "gear")
                                .foregroundColor(.blue)
                            Text("Open Settings to change Wi‑Fi")
                                .foregroundColor(.primary)
                        }
                    }
                }

                Section(header: Text("Bluetooth")) {
                    HStack {
                        Image(systemName: "bluetooth")
                            .foregroundColor(bluetoothMonitor.isPoweredOn ? .green : .secondary)
                        Text("Status")
                        Spacer()
                        Text(bluetoothMonitor.stateDescription)
                            .font(.caption)
                            .foregroundColor(bluetoothMonitor.isPoweredOn ? .green : .secondary)
                    }
                    Button(action: openSettings) {
                        HStack {
                            Image(systemName: "gear")
                                .foregroundColor(.blue)
                            Text("Open Settings to change Bluetooth")
                                .foregroundColor(.primary)
                        }
                    }
                }
                
                Section(header: Text("Diagnostics")) {
                    // Stripe Terminal Status
                    let readerInfo = StripeTerminalService.shared.getReaderInfo()
                    HStack {
                        Image(systemName: "creditcard")
                            .foregroundColor(.blue)
                        Text("Stripe Terminal")
                        Spacer()
                        Text(readerInfo.connected ? "✅ Connected" : "❌ Disconnected")
                            .font(.caption)
                            .foregroundColor(readerInfo.connected ? .green : .red)
                    }
                    
                    // Display error message if available
                    if let error = readerInfo.error {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("Connection Error")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                            }
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.vertical, 4)
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
                    
                    // Software Update Section - Always show if there's a status or update
                    let updateInfo = StripeTerminalService.shared.getUpdateStatus()
                    if updateInfo.hasUpdate || updateInfo.status != nil {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: updateInfo.status?.contains("✅") ?? false ? "checkmark.circle.fill" : "arrow.down.circle.fill")
                                    .foregroundColor(updateInfo.status?.contains("✅") ?? false ? .green : .orange)
                                Text("Software Update")
                                    .font(.headline)
                            }
                            if let status = updateInfo.status {
                                Text(status)
                                    .font(.caption)
                                    .foregroundColor(status.contains("✅") ? .green : .secondary)
                            }
                            if let progress = updateInfo.progress {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Progress: \(progress)%")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        Spacer()
                                    }
                                    // Progress bar
                                    GeometryReader { geometry in
                                        ZStack(alignment: .leading) {
                                            // Background
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.gray.opacity(0.2))
                                                .frame(height: 8)
                                            
                                            // Progress
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.orange)
                                                .frame(width: geometry.size.width * CGFloat(progress) / 100, height: 8)
                                        }
                                    }
                                    .frame(height: 8)
                                }
                                .padding(.top, 4)
                            }
                            if let version = updateInfo.version {
                                Text("Version: \(version)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    
                    Button(action: {
                        triggerSoftwareUpdate()
                    }) {
                        HStack {
                            Image(systemName: "arrow.down.circle.fill")
                                .foregroundColor(.orange)
                            Text("Check for Software Update")
                            Spacer()
                            if isCheckingUpdate {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                        }
                    }
                    .disabled(isCheckingUpdate || !readerInfo.connected)
                }
                
                Section(header: Text("Actions")) {
                    Button(action: {
                        refreshKioskConfig()
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
    
    private var connectionTypeLabel: String {
        switch networkMonitor.connectionType {
        case .wifi: return "Wi‑Fi"
        case .cellular: return "Cellular"
        case .ethernet: return "Ethernet"
        case .none: return "No connection"
        case .unknown: return "Unknown"
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
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
                                    // Get user-friendly error message from service
                                    let readerInfo = StripeTerminalService.shared.getReaderInfo()
                                    connectionError = readerInfo.error ?? "Connection failed: \(connectError.localizedDescription)"
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
    
    private func refreshKioskConfig() {
        appLog("🔧 Admin: Refreshing temple config", category: "AdminMenu")
        Task {
            await appState.refreshKioskConfig()
        }
    }
    
    private func refreshCategories() {
        appLog("🔧 Admin: Refreshing categories", category: "AdminMenu")
        Task {
            await appState.refreshCategories()
        }
    }
    
    private func triggerSoftwareUpdate() {
        guard readerInfo.connected else {
            connectionError = "Reader must be connected to check for updates"
            return
        }
        
        isCheckingUpdate = true
        connectionStatus = "Checking for software updates..."
        connectionError = nil
        
        // Get the current view controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootViewController = window.rootViewController {
            
            var topViewController = rootViewController
            while let presented = topViewController.presentedViewController {
                topViewController = presented
            }
            
            if let navController = topViewController as? UINavigationController {
                topViewController = navController.topViewController ?? topViewController
            }
            
            StripeTerminalService.shared.triggerSoftwareUpdate(from: topViewController) { error in
                isCheckingUpdate = false
                
                if let error = error {
                    connectionError = "Update check failed: \(error.localizedDescription)"
                    connectionStatus = ""
                } else {
                    connectionStatus = "✅ Update check initiated - updates will install automatically during connection"
                    refreshReaderStatus()
                    
                    // Clear status after 5 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                        if connectionStatus.contains("✅") {
                            connectionStatus = ""
                        }
                    }
                }
            }
        } else {
            isCheckingUpdate = false
            connectionError = "Could not find view controller"
            connectionStatus = ""
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

    // SECURITY: This should be moved to Keychain or secure config. Do not use in production without rotation.
    // Consider fetching from backend or storing securely per-device.
    private let adminPassword = "admin123"

    var body: some View {
        PremiumKioskModal(showBottomCloseButton: false) {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 40))
                        .foregroundColor(Color(red: 0.35, green: 0.34, blue: 0.84))

                    Text("Admin Access")
                        .font(.custom("Inter-Bold", size: 24))
                        .foregroundColor(Color(red: 0.12, green: 0.13, blue: 0.17))

                    Text("Enter your password to continue")
                        .font(.custom("Inter-Regular", size: 15))
                        .foregroundColor(Color(red: 0.55, green: 0.57, blue: 0.62))
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 28)

                // Password field
                VStack(alignment: .leading, spacing: 10) {
                    Text("Password")
                        .font(.custom("Inter-SemiBold", size: 14))
                        .foregroundColor(Color(red: 0.2, green: 0.21, blue: 0.27))

                    SecureField("", text: $password, prompt: Text("Enter password").foregroundColor(Color(red: 0.6, green: 0.62, blue: 0.68)))
                        .font(.custom("Inter-Regular", size: 16))
                        .foregroundColor(Color(red: 0.12, green: 0.13, blue: 0.17))
                        .textContentType(.password)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($isPasswordFocused)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(red: 0.96, green: 0.962, blue: 0.97))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(errorMessage.isEmpty ? Color(red: 0.9, green: 0.905, blue: 0.92) : Color.red.opacity(0.6), lineWidth: errorMessage.isEmpty ? 1 : 2)
                                )
                        )
                        .onSubmit {
                            if !password.isEmpty { checkPassword() }
                        }
                }
                .padding(.bottom, 16)

                // Error message
                if !errorMessage.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                        Text(errorMessage)
                            .font(.custom("Inter-Medium", size: 14))
                            .foregroundColor(.red)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.red.opacity(0.08))
                    )
                    .padding(.bottom, 20)
                }

                // Buttons
                HStack(spacing: 12) {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        password = ""
                        errorMessage = ""
                        isPresented = false
                    } label: {
                        Text("Cancel")
                            .font(.custom("Inter-SemiBold", size: 15))
                            .foregroundColor(Color(red: 0.35, green: 0.37, blue: 0.42))
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .buttonStyle(PremiumCloseButtonStyle())

                    Button {
                        checkPassword()
                    } label: {
                        Text("Submit")
                            .font(.custom("Inter-SemiBold", size: 15))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(password.isEmpty ? Color(red: 0.75, green: 0.76, blue: 0.78) : Color(red: 0.35, green: 0.34, blue: 0.84))
                            )
                    }
                    .disabled(password.isEmpty)
                }
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity)
        }
        .animation(.easeOut(duration: 0.2), value: errorMessage.isEmpty)
        .onAppear {
            DispatchQueue.main.async { isPasswordFocused = true }
        }
        .fullScreenCover(isPresented: $isAuthenticated, onDismiss: {
            isPresented = false
        }) {
            AdminMenuView()
                .environmentObject(appState)
        }
    }

    private func checkPassword() {
        if password == adminPassword {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            isAuthenticated = true
            password = ""
            errorMessage = ""
        } else {
            errorMessage = "Incorrect password"
            password = ""
        }
    }
}

