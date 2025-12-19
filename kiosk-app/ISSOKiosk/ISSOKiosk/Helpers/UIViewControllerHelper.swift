import SwiftUI
import UIKit

// Helper to get root UIViewController from SwiftUI
extension UIViewController {
    static func rootViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return nil
        }
        return window.rootViewController
    }
    
    // Get the topmost presented view controller
    static func topViewController() -> UIViewController? {
        guard let root = rootViewController() else { return nil }
        return topViewController(from: root)
    }
    
    private static func topViewController(from viewController: UIViewController) -> UIViewController {
        if let presented = viewController.presentedViewController {
            return topViewController(from: presented)
        }
        if let navigationController = viewController as? UINavigationController,
           let top = navigationController.topViewController {
            return topViewController(from: top)
        }
        if let tabBarController = viewController as? UITabBarController,
           let selected = tabBarController.selectedViewController {
            return topViewController(from: selected)
        }
        return viewController
    }
}

