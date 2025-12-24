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
                    // This is critical - hardware may not be detected immediately after iPad reboot
                    let hardwareConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                    if !hardwareConnected {
                        appLog("⚠️ Hardware not detected when app became active - starting aggressive detection...", category: "App")
                        // Try to detect hardware with retries (up to 30 seconds)
                        // After reboot, Square Stand may need time to initialize
                        for attempt in 1...10 {
                            let totalSeconds = attempt * 3
                            if attempt > 1 {
                                appLog("⏳ Attempt \(attempt)/10: Waiting 3 seconds, then checking hardware (total: \(totalSeconds)s)...", category: "App")
                                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds between checks
                            } else {
                                appLog("⏳ Attempt \(attempt)/10: Checking hardware immediately...", category: "App")
                            }
                            
                            // Try to wake hardware on each attempt
                            SquareMobilePaymentsService.shared.attemptHardwareWakeUp()
                            
                            let hardwareStillConnected = SquareMobilePaymentsService.shared.checkHardwareConnection()
                            if hardwareStillConnected {
                                appLog("✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...", category: "App")
                                await appState.checkAndReconnectSquareSDK()
                                break
                            } else {
                                appLog("❌ Hardware still not detected after \(totalSeconds) seconds", category: "App")
                            }
                        }
                        appLog("⚠️ Hardware detection complete (may still not be visible, but will be checked before payment)", category: "App")
                    } else {
                        appLog("✅ Hardware detected immediately when app became active", category: "App")
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

