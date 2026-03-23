import SwiftUI

@main
struct ISSOKioskApp: App {
    @StateObject private var appState = AppState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    
    init() {
        print("[App] ISSO Donation Kiosk initialized")
        print("[App] Using Stripe Terminal SDK for payment processing")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light) // Force light mode for kiosk
                .lockOrientation(.landscape) // Lock to landscape orientation
                .onAppear {
                    // Lock orientation immediately on app launch (redundant but ensures it's locked)
                    OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
                    startHeartbeat()
                }
                .onChange(of: scenePhase) { newPhase in
                    // Re-lock orientation when app becomes active (e.g., returning from background)
                    if newPhase == .active {
                        OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
                    }
                }
                .onChange(of: scenePhase) { newPhase in
                    // Refresh theme and religious events when app becomes active
                    // All operations run in background - don't block UI
                    // Skip if temple config is still loading (during startup)
                    if newPhase == .active && appState.isActivated && appState.temple != nil {
                        print("[App] 🔄 App became active - refreshing in background (non-blocking)")
                        Task.detached(priority: .utility) { [weak appState] in
                            guard let appState = appState else { return }
                            // Only refresh if temple config is already loaded (skip during startup)
                            if await appState.temple != nil {
                                await appState.refreshTempleConfig()
                                // Refresh religious events when app comes to foreground (new events may have been synced)
                                await appState.refreshReligiousEvents()
                                
                                // Send telemetry when app becomes active (so status page has recent data)
                                if let deviceId = await appState.deviceId {
                                    do {
                                        try await DeviceTelemetryService.shared.sendTelemetry(deviceId: deviceId)
                                        await MainActor.run {
                                            appLog("✅ Telemetry sent when app became active", category: "DeviceTelemetry")
                                        }
                                    } catch {
                                        await MainActor.run {
                                            appLog("⚠️ Failed to send telemetry when app became active: \(error.localizedDescription)", category: "DeviceTelemetry")
                                        }
                                    }
                                }
                            }
                        }
                    }
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
        
        // Send telemetry every 30 seconds when device is activated
        Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            Task { @MainActor in
                if appState.isActivated, let deviceId = appState.deviceId {
                    do {
                        try await DeviceTelemetryService.shared.sendTelemetry(deviceId: deviceId)
                    } catch {
                        appLog("⚠️ Failed to send telemetry: \(error.localizedDescription)", category: "DeviceTelemetry")
                    }
                }
            }
        }
    }
}

