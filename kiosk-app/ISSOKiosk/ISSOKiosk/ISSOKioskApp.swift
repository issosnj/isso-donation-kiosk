import SwiftUI
import SquareInAppPaymentsSDK

@main
struct ISSOKioskApp: App {
    @StateObject private var appState = AppState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
        // Initialize Square SDK
        if let appId = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String,
           !appId.isEmpty && appId != "YOUR_SQUARE_APPLICATION_ID" {
            SQIPInAppPaymentsSDK.squareApplicationID = appId
            print("Square SDK initialized with Application ID: \(appId.prefix(8))...")
        } else {
            print("Warning: Square Application ID not configured in Info.plist")
        }
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
            Task {
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

