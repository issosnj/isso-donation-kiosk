import UIKit
import SwiftUI
import SquareMobilePaymentsSDK

// AppDelegate to handle orientation locking and Square SDK initialization
class AppDelegate: NSObject, UIApplicationDelegate {
    var orientationLock = UIInterfaceOrientationMask.landscape
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Disable idle timer to prevent device from sleeping
        // This is critical for kiosk mode - keeps Square Stand connection alive
        application.isIdleTimerDisabled = true
        print("[AppDelegate] ✅ Idle timer disabled - device will not sleep")
        
        // Initialize Square Mobile Payments SDK
        // Get Square Application ID from Info.plist
        if let squareAppID = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String {
            MobilePaymentsSDK.initialize(
                applicationLaunchOptions: launchOptions,
                squareApplicationID: squareAppID
            )
            print("[AppDelegate] ✅ Square Mobile Payments SDK initialized with App ID: \(squareAppID.prefix(15))...")
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
        // Ensure idle timer stays disabled when app becomes active
        // This prevents device from sleeping and losing Square Stand connection
        application.isIdleTimerDisabled = true
        
        // Re-lock orientation when app becomes active (e.g., returning from background)
        OrientationLock.lockOrientation(.landscape, andRotateTo: .landscapeLeft)
    }
}

