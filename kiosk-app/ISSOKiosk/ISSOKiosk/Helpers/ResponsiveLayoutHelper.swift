import SwiftUI
import UIKit

/**
 * Responsive Layout Helper
 * 
 * Provides universal scaling for all layouts across different screen sizes.
 * Uses a base reference screen (iPad Pro 12.9" - 1024x1366) and scales
 * all dimensions proportionally to maintain consistent appearance.
 */
class ResponsiveLayoutHelper {
    // Base reference screen size (iPad 11" landscape)
    // This is our design reference - all layouts are designed for this size
    // Note: App is locked to landscape orientation only
    static let baseScreenWidth: CGFloat = 1194.0  // Landscape width (was portrait height)
    static let baseScreenHeight: CGFloat = 834.0   // Landscape height (was portrait width)
    
    /**
     * Calculate scale factor based on current screen dimensions
     * Scale is based on the smaller dimension to ensure content fits
     */
    static func scaleFactor(for geometry: GeometryProxy) -> CGFloat {
        let currentWidth = geometry.size.width
        let currentHeight = geometry.size.height
        
        // Calculate scale based on both width and height
        // Use the smaller scale to ensure content fits on screen
        let widthScale = currentWidth / baseScreenWidth
        let heightScale = currentHeight / baseScreenHeight
        
        // Use minimum to ensure content fits, or average for balanced scaling
        // For most layouts, minimum works better (ensures nothing overflows)
        return min(widthScale, heightScale)
    }
    
    /**
     * Calculate scale factor for width-only scaling (horizontal elements)
     */
    static func widthScaleFactor(for geometry: GeometryProxy) -> CGFloat {
        return geometry.size.width / baseScreenWidth
    }
    
    /**
     * Calculate scale factor for height-only scaling (vertical elements)
     */
    static func heightScaleFactor(for geometry: GeometryProxy) -> CGFloat {
        return geometry.size.height / baseScreenHeight
    }
    
    /**
     * Scale a value proportionally based on screen size
     */
    static func scale(_ value: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        return value * scaleFactor(for: geometry)
    }
    
    /**
     * Scale a value horizontally (width-based)
     */
    static func scaleWidth(_ value: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        return value * widthScaleFactor(for: geometry)
    }
    
    /**
     * Scale a value vertically (height-based)
     */
    static func scaleHeight(_ value: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        return value * heightScaleFactor(for: geometry)
    }
    
    /**
     * Convert absolute X coordinate to relative percentage (0.0 to 1.0)
     * based on base reference screen
     */
    static func absoluteToRelativeX(_ x: CGFloat) -> CGFloat {
        return x / baseScreenWidth
    }
    
    /**
     * Convert absolute Y coordinate to relative percentage (0.0 to 1.0)
     * based on base reference screen
     */
    static func absoluteToRelativeY(_ y: CGFloat) -> CGFloat {
        return y / baseScreenHeight
    }
    
    /**
     * Convert relative percentage (0.0 to 1.0) to absolute X coordinate
     * for current screen size
     */
    static func relativeToAbsoluteX(_ percentage: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        return percentage * geometry.size.width
    }
    
    /**
     * Convert relative percentage (0.0 to 1.0) to absolute Y coordinate
     * for current screen size
     */
    static func relativeToAbsoluteY(_ percentage: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        return percentage * geometry.size.height
    }
    
    /**
     * Scale an absolute X coordinate from base reference to current screen
     */
    static func scaleX(_ x: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        if x == 0 { return 0 }
        let relative = absoluteToRelativeX(x)
        return relativeToAbsoluteX(relative, for: geometry)
    }
    
    /**
     * Scale an absolute Y coordinate from base reference to current screen
     */
    static func scaleY(_ y: CGFloat, for geometry: GeometryProxy) -> CGFloat {
        if y == 0 { return 0 }
        let relative = absoluteToRelativeY(y)
        return relativeToAbsoluteY(relative, for: geometry)
    }
    
    /**
     * Get current device screen size
     */
    static var currentScreenSize: CGSize {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            return window.bounds.size
        }
        // Fallback to main screen
        return UIScreen.main.bounds.size
    }
    
    /**
     * Get device type description for debugging
     */
    static var deviceInfo: String {
        let screenSize = currentScreenSize
        return "Screen: \(Int(screenSize.width))x\(Int(screenSize.height)) (Scale: \(String(format: "%.2f", scaleFactor(for: currentScreenSize))))"
    }
    
    /**
     * Calculate scale factor from a CGSize (for use without GeometryProxy)
     */
    static func scaleFactor(for size: CGSize) -> CGFloat {
        let widthScale = size.width / baseScreenWidth
        let heightScale = size.height / baseScreenHeight
        return min(widthScale, heightScale)
    }
}

/**
 * Extension to GeometryProxy for easier access to responsive scaling
 */
extension GeometryProxy {
    /// Scale factor for this geometry
    var scaleFactor: CGFloat {
        ResponsiveLayoutHelper.scaleFactor(for: self)
    }
    
    /// Width scale factor
    var widthScale: CGFloat {
        ResponsiveLayoutHelper.widthScaleFactor(for: self)
    }
    
    /// Height scale factor
    var heightScale: CGFloat {
        ResponsiveLayoutHelper.heightScaleFactor(for: self)
    }
    
    /// Scale a value proportionally
    func scale(_ value: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.scale(value, for: self)
    }
    
    /// Width-only scaling. Use for full-screen scroll content when the keyboard is visible:
    /// `scale(_:)` uses `min(width,height)` against the reference screen, so a shorter
    /// `geometry.size.height` (space above the keyboard) shrinks fonts and padding for the whole page.
    func scaleWidthStable(_ value: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.scaleWidth(value, for: self)
    }
    
    /// Scale an X coordinate from base reference
    func scaleX(_ x: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.scaleX(x, for: self)
    }
    
    /// Scale a Y coordinate from base reference
    func scaleY(_ y: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.scaleY(y, for: self)
    }
    
    /// Convert relative X percentage to absolute
    func relativeX(_ percentage: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.relativeToAbsoluteX(percentage, for: self)
    }
    
    /// Convert relative Y percentage to absolute
    func relativeY(_ percentage: CGFloat) -> CGFloat {
        ResponsiveLayoutHelper.relativeToAbsoluteY(percentage, for: self)
    }
}

