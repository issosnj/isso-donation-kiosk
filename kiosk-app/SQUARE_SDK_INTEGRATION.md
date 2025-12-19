# Square Mobile Payments SDK Integration Guide

This guide will help you integrate the Square Mobile Payments SDK into the iOS kiosk app.

## Prerequisites

- Xcode 15.0+
- iOS 16.0+
- Square Developer Account
- Square Application ID (from Square Developer Dashboard)
- Square Stand or Square Kiosk hardware (for production)

## Step 1: Add Square In-App Payments SDK

**Important Note:** For a kiosk app with Square Stand/Kiosk hardware, you'll use Square's **In-App Payments SDK** which supports both in-app card entry and hardware readers.

### Detailed Steps:

1. **Open the Project in Xcode**
   - **If you have `ISSOKiosk.xcodeproj`**: Double-click it to open in Xcode
   - **If you don't have the project yet**: See `CREATE_XCODE_PROJECT.md` first to create the Xcode project
   - Wait for Xcode to fully load the project

2. **Add the Package Dependency**
   - In Xcode, click on the project name in the left sidebar (the blue icon at the top)
   - Select your project (not the target) in the main editor
   - Click on the **"Package Dependencies"** tab at the top
   - Click the **"+"** button at the bottom left

3. **Enter the Package URL**
   - In the search field that appears, paste this URL:
     ```
     https://github.com/square/in-app-payments-ios
     ```
   - Press Enter or wait for Xcode to fetch the package
   - You should see "square/in-app-payments-ios" appear in the results

4. **Select Version and Add**
   - In the "Dependency Rule" dropdown, select **"Up to Next Major Version"** or **"Exact Version"** (recommended: latest stable)
   - Click **"Add Package"** button on the bottom right
   - Xcode will download and resolve the package

5. **Add to Target**
   - A dialog will appear showing available products from the package
   - Check the box next to **"SquareInAppPaymentsSDK"**
   - Make sure your app target (likely "ISSOKiosk") is selected in the "Add to targets" column
   - Click **"Add Package"** to complete the installation

6. **Verify Installation**
   - In the left sidebar, expand your project
   - You should see a new "Package Dependencies" section
   - Expand it to see "square-in-app-payments-ios"
   - If you see it, the package was added successfully!

### Alternative: If Swift Package Manager doesn't work

If you encounter issues with SPM, you can use CocoaPods instead:

1. **Install CocoaPods** (if not already installed):
   ```bash
   sudo gem install cocoapods
   ```

2. **Create Podfile** in the `kiosk-app` directory:
   ```bash
   cd kiosk-app
   pod init
   ```

3. **Edit Podfile** and add:
   ```ruby
   platform :ios, '16.0'
   use_frameworks!

   target 'ISSOKiosk' do
     pod 'SquareInAppPaymentsSDK'
   end
   ```

4. **Install**:
   ```bash
   pod install
   ```

5. **Open workspace** instead of project:
   ```bash
   open ISSOKiosk.xcworkspace
   ```

## Step 2: Configure Info.plist

1. Open `ISSOKiosk/Info.plist`
2. Update the `SQUARE_APPLICATION_ID` value with your actual Square Application ID:
   ```xml
   <key>SQUARE_APPLICATION_ID</key>
   <string>sq0idp-YOUR_APPLICATION_ID</string>
   ```

## Step 3: Initialize Square SDK in App

First, initialize the Square SDK when your app launches. Update `ISSOKioskApp.swift`:

```swift
import SwiftUI
import SquareInAppPaymentsSDK

@main
struct ISSOKioskApp: App {
    @StateObject private var appState = AppState()
    
    init() {
        // Initialize Square SDK
        if let appId = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String {
            SQIPInAppPaymentsSDK.squareApplicationID = appId
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light)
                .onAppear {
                    startHeartbeat()
                }
        }
    }
    
    // ... rest of your code
}
```

## Step 4: Update SquarePaymentService

Replace the placeholder implementation in `SquarePaymentService.swift` with the actual Square SDK integration:

```swift
import Foundation
import SquareInAppPaymentsSDK

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private init() {}
    
    struct PaymentResult {
        let success: Bool
        let paymentId: String?
        let error: String?
    }
    
    func processPayment(amount: Double, locationId: String) async throws -> PaymentResult {
        // Note: Square In-App Payments SDK requires presenting a card entry form
        // For kiosk with Square Stand/Kiosk hardware, you may need to use
        // Square's Reader SDK instead. This is a simplified example.
        
        // For now, we'll use the backend to process payments via Square API
        // The SDK is primarily for card entry UI, not hardware readers
        
        // This implementation would need to be adapted based on your specific
        // Square hardware setup (Stand vs Kiosk vs card entry form)
        
        throw NSError(
            domain: "SquarePaymentService",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: "Square SDK integration pending - see documentation"]
        )
    }
}
```

**Important:** For Square Stand/Kiosk hardware integration, you may need to:
1. Use Square's Reader SDK instead of In-App Payments SDK
2. Or process payments server-side using the Square Payments API with the access token stored in your backend
3. The current backend already has Square integration - consider processing payments server-side instead

See the "Alternative Approach" section below for server-side payment processing.

## Alternative Approach: Server-Side Payment Processing

Since your backend already has Square integration with OAuth tokens, you might want to process payments server-side instead of using the iOS SDK:

1. **Kiosk app initiates payment** → Backend creates payment intent via Square API
2. **Backend returns payment intent ID** → Kiosk app uses Square SDK to collect card
3. **Card is processed** → Square SDK returns payment result
4. **Kiosk app sends result to backend** → Backend completes the donation

This approach is often simpler for kiosk deployments. See your backend's Square service implementation.

## Step 5: Configure Bundle ID in Square Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **Mobile** tab
4. Add your app's Bundle ID (e.g., `com.issosnj.issokiosk`)
5. Save the configuration

## Step 6: Test on Device

1. Connect your iPad to Xcode
2. Build and run the app
3. The Square SDK will automatically detect connected Square Stand or Square Kiosk hardware
4. Test the payment flow

## Step 7: Production Deployment

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Distribute via TestFlight or App Store
4. For kiosk deployment, consider using MDM (Mobile Device Management)

## Troubleshooting

### SDK Not Detecting Hardware

- Ensure Square Stand/Kiosk is properly connected
- Check that the Bundle ID matches Square Dashboard configuration
- Verify Square Application ID is correct in Info.plist

### Payment Processing Errors

- Verify Square Location ID is set in the temple configuration
- Check that the temple has Square connected in the admin portal
- Ensure the Square account has proper permissions

### Build Errors

- Ensure Square Mobile Payments SDK is properly added to the project
- Check that iOS deployment target is 16.0+
- Verify all dependencies are resolved

## Current Implementation Status

The app currently uses a placeholder `SquarePaymentService` that simulates payment processing. To enable real payments:

1. Follow steps 1-4 above
2. Replace the placeholder implementation
3. Test thoroughly before production deployment

## Troubleshooting Package Installation

### Issue: "Package not found" or "Unable to resolve package"
- **Solution**: Check your internet connection and try again
- Verify the URL is exactly: `https://github.com/square/in-app-payments-ios`
- Make sure you're using Xcode 15.0 or later

### Issue: "No such module 'SquareInAppPaymentsSDK'"
- **Solution**: 
  1. Clean build folder: Product > Clean Build Folder (⇧⌘K)
  2. Close and reopen Xcode
  3. Build again: Product > Build (⌘B)

### Issue: Package appears but can't import
- **Solution**:
  1. Select your target in Xcode
  2. Go to "Build Phases" tab
  3. Expand "Link Binary With Libraries"
  4. Ensure SquareInAppPaymentsSDK.framework is listed
  5. If not, click "+" and add it

### Issue: Build errors after adding package
- **Solution**:
  1. Check iOS deployment target is 16.0+ (in Build Settings)
  2. Verify Swift version compatibility
  3. Try removing and re-adding the package

## Resources

- [Square In-App Payments SDK Documentation](https://developer.squareup.com/docs/in-app-payments-sdk/overview)
- [Square In-App Payments iOS GitHub](https://github.com/square/in-app-payments-ios)
- [Square Developer Dashboard](https://developer.squareup.com/apps)
- [Square Reader SDK (for hardware)](https://developer.squareup.com/docs/reader-sdk/overview) - Alternative if using Square Stand/Kiosk hardware

