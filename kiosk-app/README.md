# ISSO Donation Kiosk - iOS App

Native iOS app for donation kiosks using Square Mobile Payments SDK.

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+
- iPad (optimized for kiosk use)

## Setup

1. **Open Project**
   ```bash
   cd kiosk-app
   open ISSOKiosk.xcodeproj
   ```

2. **Configure API URL**
   - The `Config.swift` file is already set to production API
   - URL: `https://isso-donation-kiosk-production.up.railway.app/api`

3. **Configure Square Mobile Payments SDK**
   - See [SQUARE_SDK_INTEGRATION.md](./SQUARE_SDK_INTEGRATION.md) for detailed instructions
   - Add Square Application ID to `Info.plist`
   - Configure bundle ID in Square Developer Dashboard

4. **Build and Run**
   - Connect iPad to Mac
   - Select iPad as target device
   - Build and run (⌘R)

## Features

✅ **Device Activation**
- Enter 8-character device code
- Automatic token storage in Keychain
- Device ID extraction from JWT token

✅ **Donation Flow**
- Preset amount buttons ($11, $21, $51, $101, $251)
- Custom amount input
- Category selection (from temple configuration)
- Optional donor name and email

✅ **Payment Processing**
- Integration ready for Square Mobile Payments SDK
- Payment status handling (success/failure)
- Donation completion with Square payment ID

✅ **Device Management**
- Automatic heartbeat every 30 seconds
- Device status tracking
- Token persistence

✅ **UI/UX**
- Optimized for iPad (large touch targets)
- Modern, clean interface
- Temple branding support (logo, colors)
- Responsive layout

## Current Status

- ✅ Device activation working
- ✅ Donation flow UI complete
- ✅ API integration complete
- ✅ Device heartbeat implemented
- ⚠️ Square SDK integration pending (see SQUARE_SDK_INTEGRATION.md)

## Configuration

### API Configuration
The app is configured to use the production API:
```swift
static let apiBaseURL = "https://isso-donation-kiosk-production.up.railway.app/api"
```

### Square Configuration
1. Add Square Application ID to `Info.plist`:
   ```xml
   <key>SQUARE_APPLICATION_ID</key>
   <string>sq0idp-YOUR_APP_ID</string>
   ```

2. Configure bundle ID in Square Developer Dashboard

3. Integrate Square Mobile Payments SDK (see SQUARE_SDK_INTEGRATION.md)

## App Flow

1. **Device Activation**
   - User enters 8-character device code
   - App activates with backend
   - Receives device token and temple configuration

2. **Donation Selection**
   - User selects preset amount or enters custom amount
   - Optionally selects donation category
   - Clicks "Continue"

3. **Donation Details**
   - User reviews donation summary
   - Optionally enters name and email
   - Clicks "Tap or Insert Card to Donate"

4. **Payment Processing**
   - App initiates donation with backend
   - Processes payment via Square SDK
   - Completes donation with payment result
   - Shows success/failure screen

## Architecture

- **AppState**: Manages app-wide state (device token, temple, categories)
- **APIService**: Handles all backend API calls
- **SquarePaymentService**: Placeholder for Square SDK integration
- **KeychainHelper**: Secure token storage
- **Views**: SwiftUI views for each screen

## Testing

1. Create a device in admin portal
2. Get the 8-character device code
3. Enter code in app to activate
4. Test donation flow (Square SDK integration needed for real payments)

## Deployment

1. Archive app in Xcode
2. Upload to App Store Connect
3. Distribute via TestFlight or App Store
4. For kiosk deployment, use MDM for device management

## Documentation

- [Square SDK Integration Guide](./SQUARE_SDK_INTEGRATION.md)
- [Backend API Documentation](../README.md)

