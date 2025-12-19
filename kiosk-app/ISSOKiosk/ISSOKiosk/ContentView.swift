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
            // Background color - should be visible if view renders
            Color.red.opacity(0.5)
                .ignoresSafeArea()
            
            // Test view to verify rendering - make it very visible
            VStack(spacing: 20) {
                Text("TEST - ContentView is rendering")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.blue)
                    .padding(40)
                    .background(Color.yellow)
                    .cornerRadius(20)
                
                Text("App State: \(appState.isActivated ? "Activated" : "Not Activated")")
                    .font(.title)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.black)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            if appState.isActivated {
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
        .onAppear {
            print("✅ ContentView appeared - isActivated: \(appState.isActivated)")
            print("✅ AppState object: \(appState)")
        }
    }
    
    private func setupIdleTimer() {
        let timeout = TimeInterval(appState.temple?.homeScreenConfig?.idleTimeoutSeconds ?? 60)
        idleTimer.configure(timeout: timeout)
    }
}

