import SwiftUI
import Combine

class AppNavigationState: ObservableObject {
    @Published var showDonationFlow = false
}

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var idleTimer = IdleTimer.shared
    @StateObject private var navigationState = AppNavigationState()
    
    var body: some View {
        ZStack {
            // Background color - always show immediately
            Color.white
                .ignoresSafeArea(.all)
            
            // Show loading state ONLY while checking activation (not waiting for temple config)
            // Temple config loads in background and UI updates when ready
            if !appState.isActivated && appState.deviceToken == nil {
                // Loading state - only show while waiting for initial activation
                LoadingView()
                    .environmentObject(appState)
            } else if appState.isActivated {
                // Activated state
                ZStack {
                    // Always show home screen as base
                    KioskHomeView()
                        .environmentObject(appState)
                        .environmentObject(navigationState)
                    
                    // Show donation flow on top when active
                    if navigationState.showDonationFlow {
                        DonationHomeView(onDismiss: {
                            navigationState.showDonationFlow = false
                        })
                        .environmentObject(appState)
                        .transition(.move(edge: .bottom))
                        .zIndex(1)
                    }
                }
                .detectTouches()
                .onAppear {
                    setupIdleTimer()
                }
                .onReceive(NotificationCenter.default.publisher(for: .idleTimeoutReached)) { _ in
                    withAnimation {
                        navigationState.showDonationFlow = false
                    }
                }
            } else {
                // Not activated - showing activation view
                DeviceActivationView()
                    .environmentObject(appState)
            }
        }
    }
    
    private func setupIdleTimer() {
        let timeout = TimeInterval(appState.temple?.homeScreenConfig?.idleTimeoutSeconds ?? 60)
        idleTimer.configure(timeout: timeout)
    }
}

