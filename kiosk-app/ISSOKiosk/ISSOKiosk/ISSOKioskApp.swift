import SwiftUI
// TODO: Import Mobile Payments SDK when package is added
// import SquareMobilePaymentsSDK  // This is the correct SDK for Square Stand

@main
struct ISSOKioskApp: App {
    @StateObject private var appState = AppState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    
    init() {
        // TODO: Initialize Mobile Payments SDK when package is added
        // Mobile Payments SDK requires:
        // 1. OAuth access token (from backend - temple's Square access token)
        // 2. Location ID (from temple configuration)
        // 3. AuthorizationManager.authorize() call
        //
        // Reference: https://developer.squareup.com/docs/mobile-payments-sdk/ios
        
        print("[App] ISSO Donation Kiosk initialized")
        print("[App] NOTE: Mobile Payments SDK integration pending")
        print("[App] Current implementation uses backend payment processing")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light) // Force light mode for kiosk
                .onAppear {
                    // Lock orientation immediately on app launch
                    OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
                    startHeartbeat()
                }
        }
        .onChange(of: scenePhase) { newPhase in
            // Refresh theme, religious events, and reconnect Square SDK when app becomes active
            if newPhase == .active && appState.isActivated {
                print("[App] 🔄 App became active - refreshing theme settings, religious events, and checking Square connection")
                Task {
                    await appState.refreshTempleConfig()
                    // Refresh religious events when app comes to foreground (new events may have been synced)
                    await appState.refreshReligiousEvents()
                    // Check and reconnect Square SDK when app becomes active
                    await appState.checkAndReconnectSquareSDK()
                    
                    // After reboot, hardware might take time to appear - check aggressively
                    let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                    if !hardwareConnected {
                        print("[App] ⚠️ Hardware not detected when app became active - starting aggressive detection...")
                        // Try to detect hardware with retries
                        for attempt in 1...6 {
                            let totalSeconds = attempt * 5
                            if attempt > 1 {
                                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds between checks
                            }
                            let hardwareStillConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                            if hardwareStillConnected {
                                print("[App] ✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...")
                                await appState.checkAndReconnectSquareSDK()
                                break
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
        
        // Send telemetry every 5 minutes when device is activated
        Timer.scheduledTimer(withTimeInterval: 300.0, repeats: true) { _ in
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

