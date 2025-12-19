import SwiftUI
import UIKit
import SquareMobilePaymentsSDK

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

// AppDelegate to handle orientation locking
class AppDelegate: NSObject, UIApplicationDelegate {
    var orientationLock = UIInterfaceOrientationMask.landscape
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Step 3: Initialize Square Mobile Payments SDK
        // Get Square Application ID from Info.plist
        if let squareAppID = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String {
            MobilePaymentsSDK.initialize(
                applicationLaunchOptions: launchOptions,
                squareApplicationID: squareAppID
            )
            print("[AppDelegate] ✅ Square Mobile Payments SDK initialized with App ID: \(squareAppID.prefix(10))...")
        } else {
            print("[AppDelegate] ⚠️ SQUARE_APPLICATION_ID not found in Info.plist")
        }
        
        // Lock orientation immediately on launch - force landscape
        // This happens before any views are shown
        DispatchQueue.main.async {
            OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
        }
        return true
    }
    
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return self.orientationLock
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Re-lock orientation when app becomes active (e.g., returning from background)
        OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
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

