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
                        // Check and reconnect Square SDK when app becomes active
                        await appState.checkAndReconnectSquareSDK()
                        
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
                    
                    // After reboot, hardware might take time to appear - check in background
                    // This is critical - hardware may not be detected immediately after iPad reboot
                    let hardwareConnected = await SquareMobilePaymentsService.shared.checkHardwareConnection()
                    if !hardwareConnected {
                        await MainActor.run {
                            appLog("⚠️ Hardware not detected when app became active - checking in background...", category: "App")
                        }
                        // Try to detect hardware with retries (up to 30 seconds) - all in background
                        for attempt in 1...10 {
                            let totalSeconds = attempt * 3
                            if attempt > 1 {
                                await MainActor.run {
                                    appLog("⏳ Attempt \(attempt)/10: Waiting 3 seconds, then checking hardware (total: \(totalSeconds)s)...", category: "App")
                                }
                                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds between checks
                            } else {
                                await MainActor.run {
                                    appLog("⏳ Attempt \(attempt)/10: Checking hardware immediately...", category: "App")
                                }
                            }
                            
                            // Try to wake hardware on each attempt
                            await SquareMobilePaymentsService.shared.attemptHardwareWakeUp()
                            
                            let hardwareStillConnected = await SquareMobilePaymentsService.shared.checkHardwareConnection()
                            if hardwareStillConnected {
                                await MainActor.run {
                                    appLog("✅ Hardware detected after \(totalSeconds) seconds - re-authorizing...", category: "App")
                                }
                                await appState.checkAndReconnectSquareSDK()
                                break
                            } else {
                                await MainActor.run {
                                    appLog("❌ Hardware still not detected after \(totalSeconds) seconds", category: "App")
                                }
                            }
                        }
                        await MainActor.run {
                            appLog("⚠️ Hardware detection complete (may still not be visible, but will be checked before payment)", category: "App")
                        }
                    } else {
                        await MainActor.run {
                            appLog("✅ Hardware detected immediately when app became active", category: "App")
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

