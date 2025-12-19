import SwiftUI
import UIKit

// Helper to dismiss keyboard when tapping outside
extension View {
    func hideKeyboardOnTap() -> some View {
        self.onTapGesture {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
    }
    
    func dismissKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

// Helper to suppress keyboard constraint warnings (they're harmless but noisy)
extension UIApplication {
    static func suppressKeyboardWarnings() {
        // These warnings are known iOS issues and are automatically recovered
        // They don't affect functionality, just console noise
        // iOS automatically breaks the least important constraint
    }
}

