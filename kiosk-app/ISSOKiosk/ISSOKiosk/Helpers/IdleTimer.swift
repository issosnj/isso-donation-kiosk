import SwiftUI
import Combine

class IdleTimer: ObservableObject {
    static let shared = IdleTimer()
    
    @Published var isIdle = false
    private var idleTimer: Timer?
    private var idleTimeout: TimeInterval = 60.0 // Default 60 seconds
    /// When true, the global idle countdown is suspended (e.g. donor full-screen editor uses its own 2-minute rule).
    private var isPaused = false
    
    private init() {}
    
    func configure(timeout: TimeInterval) {
        idleTimeout = timeout
        resetTimer()
    }
    
    func userDidInteract() {
        isIdle = false
        resetTimer()
    }
    
    /// Stops the global idle timer until `resume()` (e.g. while donor info sheet is open).
    func pause() {
        isPaused = true
        idleTimer?.invalidate()
        idleTimer = nil
    }
    
    /// Restarts the global idle countdown from the configured timeout.
    func resume() {
        isPaused = false
        resetTimer()
    }
    
    private func resetTimer() {
        idleTimer?.invalidate()
        idleTimer = nil
        guard !isPaused else { return }
        
        idleTimer = Timer.scheduledTimer(withTimeInterval: idleTimeout, repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                self?.isIdle = true
                NotificationCenter.default.post(name: .idleTimeoutReached, object: nil)
            }
        }
    }
    
    func stopMonitoring() {
        idleTimer?.invalidate()
        idleTimer = nil
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
            // Avoid `.onTapGesture` here — it competes with `Button` taps inside the hierarchy (e.g. Additional seva).
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

