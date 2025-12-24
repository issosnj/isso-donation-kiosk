import SwiftUI
import UIKit

// Helper to lock orientation to landscape
class OrientationLock {
    static func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
        if let delegate = UIApplication.shared.delegate as? AppDelegate {
            delegate.orientationLock = orientation
        }
    }
    
    static func lockOrientation(_ orientation: UIInterfaceOrientationMask, andRotateTo rotateOrientation: UIInterfaceOrientation) {
        self.lockOrientation(orientation)
        
        // Use modern API for iOS 16+
        if #available(iOS 16.0, *) {
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
                return
            }
            let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: orientation)
            windowScene.requestGeometryUpdate(geometryPreferences) { error in
                // Error is non-optional, so if it's provided, there was an error
                print("[OrientationLock] Geometry update completed")
            }
        } else {
            // Fallback for older iOS versions (though we require iOS 16.6+)
            // This shouldn't be called, but kept for safety
        }
    }
}

// View modifier to apply orientation lock
struct OrientationLockModifier: ViewModifier {
    let orientation: UIInterfaceOrientationMask
    
    func body(content: Content) -> some View {
        content
            .onAppear {
                OrientationLock.lockOrientation(orientation)
            }
    }
}

extension View {
    func lockOrientation(_ orientation: UIInterfaceOrientationMask) -> some View {
        modifier(OrientationLockModifier(orientation: orientation))
    }
}

