import UIKit
import SwiftUI

// AppDelegate to handle orientation locking
class AppDelegate: NSObject, UIApplicationDelegate {
    var orientationLock = UIInterfaceOrientationMask.landscape
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Disable idle timer to prevent device from sleeping
        // This is critical for kiosk mode
        application.isIdleTimerDisabled = true
        print("[AppDelegate] ✅ Idle timer disabled - device will not sleep")
        
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
        // Ensure idle timer stays disabled when app becomes active
        application.isIdleTimerDisabled = true
        
        // Re-lock orientation when app becomes active (e.g., returning from background)
        OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
    }
}

