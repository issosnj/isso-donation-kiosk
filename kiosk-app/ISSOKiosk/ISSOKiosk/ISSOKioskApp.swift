import SwiftUI
// Temporarily comment out Square SDK import until dependencies are resolved
// import SquareInAppPaymentsSDK

@main
struct ISSOKioskApp: App {
    @StateObject private var appState = AppState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
        // Square SDK initialization temporarily disabled
        // The Square SDK requires ThreeDS_SDK.framework which is missing
        // This will be re-enabled once Square SDK is properly configured
        // For now, payment processing uses a placeholder service
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light) // Force light mode for kiosk
                .lockOrientation(.landscape) // Lock to landscape orientation
                .onAppear {
                    startHeartbeat()
                }
        }
    }
    
    private func startHeartbeat() {
        // Send heartbeat every 30 seconds when device is activated
        Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            Task { @MainActor in
                if appState.isActivated, let deviceId = appState.deviceId {
                    do {
                        try await APIService.shared.sendHeartbeat(deviceId: deviceId)
                    } catch {
                        print("Heartbeat failed: \(error.localizedDescription)")
                    }
                }
            }
        }
    }
}

