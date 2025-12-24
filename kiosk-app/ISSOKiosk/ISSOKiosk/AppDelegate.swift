import UIKit
import SwiftUI

// AppDelegate to handle URL callbacks from Square POS SDK
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Disable idle timer to prevent device from sleeping
        UIApplication.shared.isIdleTimerDisabled = true
        print("[AppDelegate] ✅ Idle timer disabled - device will not sleep")
        return true
    }
    
    // Handle URL callbacks from Square POS app
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        appLog("📱 App received URL callback: \(url)", category: "AppDelegate")
        
        // Check if this is a Square POS callback
        if url.scheme == "issokiosk" && url.host == "payment-callback" {
            appLog("✅ Square POS payment callback received", category: "AppDelegate")
            SquarePOSPaymentService.shared.handle(url: url)
            return true
        }
        
        return false
    }
}

