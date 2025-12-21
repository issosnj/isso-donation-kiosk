import SwiftUI
import Combine

class IdleTimer: ObservableObject {
    static let shared = IdleTimer()
    
    @Published var isIdle = false
    private var idleTimer: Timer?
    private var idleTimeout: TimeInterval = 60.0 // Default 60 seconds
    
    private init() {}
    
    func configure(timeout: TimeInterval) {
        idleTimeout = timeout
        resetTimer()
    }
    
    func userDidInteract() {
        isIdle = false
        resetTimer()
    }
    
    private func resetTimer() {
        idleTimer?.invalidate()
        
        idleTimer = Timer.scheduledTimer(withTimeInterval: idleTimeout, repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                self?.isIdle = true
                NotificationCenter.default.post(name: .idleTimeoutReached, object: nil)
            }
        }
    }
    
    func stopMonitoring() {
        idleTimer?.invalidate()
    }
}

extension Notification.Name {
    static let userDidInteract = Notification.Name("userDidInteract")
    static let idleTimeoutReached = Notification.Name("idleTimeoutReached")
}

// View modifier to detect all touches and interactions
struct TouchDetector: ViewModifier {
    func body(content: Content) -> some View {
        content
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        IdleTimer.shared.userDidInteract()
                    }
            )
            .onTapGesture {
                IdleTimer.shared.userDidInteract()
            }
            // Listen for keyboard notifications to detect when user starts typing
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
                IdleTimer.shared.userDidInteract()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardDidShowNotification)) { _ in
                IdleTimer.shared.userDidInteract()
            }
    }
}

extension View {
    func detectTouches() -> some View {
        modifier(TouchDetector())
    }
}

