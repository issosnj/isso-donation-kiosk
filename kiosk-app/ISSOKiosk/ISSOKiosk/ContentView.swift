import SwiftUI
import Combine

class AppNavigationState: ObservableObject {
    @Published var showDonationFlow = false
    /// New value discards the previous donation, including a Review & Payment cover left open at idle timeout.
    @Published var donationSessionID = UUID()
}

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var idleTimer = IdleTimer.shared
    @StateObject private var navigationState = AppNavigationState()
    
    var body: some View {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-previewStep3") {
            Step3KeyboardPreviewHost()
        } else {
            kioskContent
        }
        #else
        kioskContent
        #endif
    }

    private var kioskContent: some View {
        ZStack {
            // Background color - always show immediately
            Color.white
                .ignoresSafeArea(.all)
            
            // Show loading state only if we have a token and are waiting for temple config
            // If no token, show activation screen
            if appState.deviceToken != nil && (!appState.isActivated || (appState.isActivated && appState.temple == nil)) {
                // Loading state - waiting for temple config from server
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
                            endDonationSession()
                        })
                        .id(navigationState.donationSessionID)
                        .environmentObject(appState)
                        .transition(.asymmetric(
                            insertion: .move(edge: .bottom).combined(with: .opacity),
                            removal: .move(edge: .bottom).combined(with: .opacity)
                        ))
                        .zIndex(1)
                    }
                }
                .animation(.spring(response: 0.45, dampingFraction: 0.9), value: navigationState.showDonationFlow)
                .detectTouches()
                .onAppear {
                    setupIdleTimer()
                }
                .onReceive(NotificationCenter.default.publisher(for: .idleTimeoutReached)) { _ in
                    guard navigationState.showDonationFlow else { return }
                    // Let DonationHomeView close Review & Payment first. Removing the flow in this
                    // same turn keeps that cover presented, so the next Tap to Donate reopens it.
                    DispatchQueue.main.async {
                        endDonationSession()
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

    /// Leaves the donation flow and drops its screen state. The next Tap to Donate opens a blank selection page.
    private func endDonationSession() {
        navigationState.donationSessionID = UUID()
        withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
            navigationState.showDonationFlow = false
        }
    }
}

#if DEBUG
/// Development-only Step 3 host. Release builds omit this. It does not activate a device or skip payment checks.
private struct Step3KeyboardPreviewHost: View {
    @EnvironmentObject private var appState: AppState
    @State private var donationLines: [CheckoutDonationLine] = [
        .primary(amount: 51, category: nil)
    ]

    private var requestedFocus: DonorInlineFocus {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-previewFocus"), arguments.indices.contains(index + 1) else {
            return .none
        }
        switch arguments[index + 1] {
        case "first": return .firstName
        case "last": return .lastName
        case "phone": return .phone
        case "email": return .email
        case "address": return .address
        default: return .none
        }
    }

    var body: some View {
        ModernDonationDetailsView(
            donationLines: $donationLines,
            category: nil,
            initialDonorName: nil,
            initialDonorPhone: nil,
            initialDonorEmail: nil,
            initialDonorAddress: nil,
            initialAnonymousSeva: false,
            onConfirm: { _, _, _, _, _ in },
            onCancel: {},
            onAddAdditionalSeva: nil,
            debugInitialFocus: requestedFocus,
            debugSeedSuggestions: ProcessInfo.processInfo.arguments.contains("-previewAddressSuggestions")
        )
        .environmentObject(appState)
    }
}
#endif

