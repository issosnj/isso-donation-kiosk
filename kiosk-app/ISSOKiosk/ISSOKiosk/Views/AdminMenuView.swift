import SwiftUI
import SquareMobilePaymentsSDK

struct AdminMenuView: View {
    @SwiftUI.Environment(\.dismiss) var dismiss: DismissAction
    @EnvironmentObject var appState: AppState
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var hardwareMonitor = HardwareMonitor.shared
    @State private var logs: [String] = []
    @State private var isLoadingLogs = false
    @State private var showingReconnectAlert = false
    @State private var reconnectStatus = ""
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Square Reader")) {
                    Button(action: {
                        reconnectSquareReader()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise.circle.fill")
                                .foregroundColor(.blue)
                            Text("Reconnect Square Reader")
                            Spacer()
                            if !reconnectStatus.isEmpty {
                                Text(reconnectStatus)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    Button(action: {
                        wakeUpSquareReader()
                    }) {
                        HStack {
                            Image(systemName: "power.circle.fill")
                                .foregroundColor(.green)
                            Text("Wake Up Square Reader")
                        }
                    }
                    
                    // Reader Status
                    HStack {
                        Image(systemName: "info.circle")
                            .foregroundColor(.blue)
                        Text("Reader Status")
                        Spacer()
                        let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
                        let authState = MobilePaymentsSDK.shared.authorizationManager.state
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(readerCount > 0 ? "Connected (\(readerCount))" : "Disconnected")
                                .font(.caption)
                                .foregroundColor(readerCount > 0 ? .green : .red)
                            Text("Auth: \(authStateDescription(authState))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
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
                        Text("Square SDK Status")
                        Spacer()
                        let authState = MobilePaymentsSDK.shared.authorizationManager.state
                        Text(authStateDescription(authState))
                            .font(.caption)
                            .foregroundColor(authState == .authorized ? .green : .orange)
                    }
                }
                
                Section(header: Text("Diagnostics")) {
                    // Reader Watchdog Info
                    HStack {
                        Image(systemName: "heart.circle")
                            .foregroundColor(.blue)
                        Text("Reader Watchdog")
                        Spacer()
                        let diagnostic = SquareReaderWatchdog.shared.getDiagnosticInfo()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Count: \(diagnostic.readerCount)")
                                .font(.caption)
                            Text(diagnostic.isStuck ? "⚠️ Stuck" : "✅ OK")
                                .font(.caption2)
                                .foregroundColor(diagnostic.isStuck ? .orange : .green)
                        }
                    }
                    
                    // Health Monitor Status
                    HStack {
                        Image(systemName: "heart.text.square")
                            .foregroundColor(.blue)
                        Text("Health Monitor")
                        Spacer()
                        Text("Active")
                            .font(.caption)
                            .foregroundColor(.green)
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
        }
    }
    
    private func authStateDescription(_ state: AuthorizationState) -> String {
        switch state {
        case .authorized:
            return "Authorized"
        case .notAuthorized:
            return "Not Authorized"
        case .authorizing:
            return "Authorizing..."
        @unknown default:
            return "Unknown"
        }
    }
    
    private func reconnectSquareReader() {
        reconnectStatus = "Reconnecting..."
        appLog("🔧 Admin: Reconnecting Square Reader", category: "AdminMenu")
        
        Task {
            // Get credentials and force reauthorization
            do {
                let credentials = try await APIService.shared.getSquareCredentials()
                
                await MainActor.run {
                    SquareMobilePaymentsService.shared.authorize(
                        accessToken: credentials.accessToken,
                        locationId: credentials.locationId,
                        forceReauthorize: true
                    ) { error in
                        DispatchQueue.main.async {
                            let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
                            if error != nil {
                                reconnectStatus = "❌ Error: \(error!.localizedDescription)"
                            } else if readerCount > 0 {
                                reconnectStatus = "✅ Connected"
                            } else {
                                reconnectStatus = "⚠️ No reader found"
                            }
                            
                            // Show alert with detailed instructions
                            if let viewController = UIViewController.topViewController() {
                                SquareMobilePaymentsService.shared.presentReconnectReaderAlert(
                                    from: viewController,
                                    error: error
                                ) {
                                    // Refresh status after alert
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                                        reconnectStatus = ""
                                    }
                                }
                            }
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    reconnectStatus = "❌ Failed to get credentials"
                    appLog("❌ Admin: Failed to get Square credentials: \(error.localizedDescription)", category: "AdminMenu")
                }
            }
        }
    }
    
    private func wakeUpSquareReader() {
        appLog("🔧 Admin: Waking up Square Reader", category: "AdminMenu")
        
        Task {
            // Get credentials and ensure authorization
            do {
                let credentials = try await APIService.shared.getSquareCredentials()
                
                await MainActor.run {
                    SquareMobilePaymentsService.shared.authorize(
                        accessToken: credentials.accessToken,
                        locationId: credentials.locationId,
                        forceReauthorize: false
                    ) { error in
                        DispatchQueue.main.async {
                            let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
                            if readerCount > 0 {
                                appLog("✅ Square Reader is connected (\(readerCount) reader(s))", category: "AdminMenu")
                            } else {
                                appLog("⚠️ No Square Reader found - try reconnecting", category: "AdminMenu")
                            }
                        }
                    }
                }
            } catch {
                appLog("❌ Admin: Failed to get Square credentials: \(error.localizedDescription)", category: "AdminMenu")
            }
        }
    }
    
    private func loadLogs() {
        isLoadingLogs = true
        appLog("🔧 Admin: Loading system info", category: "AdminMenu")
        
        // Get system information
        let readerCount = MobilePaymentsSDK.shared.readerManager.readers.count
        let authState = MobilePaymentsSDK.shared.authorizationManager.state
        let diagnostic = SquareReaderWatchdog.shared.getDiagnosticInfo()
        let deviceId = appState.deviceId ?? "Unknown"
        let templeName = appState.temple?.name ?? "Unknown"
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            logs = [
                "=== System Information ===",
                "Device ID: \(deviceId)",
                "Temple: \(templeName)",
                "",
                "=== Square Reader Status ===",
                "Reader Count: \(readerCount)",
                "Auth State: \(authStateDescription(authState))",
                "Watchdog: \(diagnostic.isStuck ? "⚠️ Stuck Connection" : "✅ OK")",
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

