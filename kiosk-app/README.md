# ISSO Donation Kiosk - iOS App

Native iOS app for donation kiosks using Square Mobile Payments SDK.

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Setup

1. Open `ISSOKiosk.xcodeproj` in Xcode
2. Install dependencies via Swift Package Manager
3. Configure Square Mobile Payments SDK:
   - Add your Square Application ID to Info.plist
   - Configure bundle ID in Square Developer Dashboard
4. Update `Config.swift` with your backend API URL
5. Build and run on iPad

## Features

- Device activation with device code
- Donation flow with preset amounts and categories
- Square Mobile Payments SDK integration
- Offline transaction queue
- Auto-sync with backend

## Square Mobile Payments SDK

The app uses Square Mobile Payments SDK for in-person card payments. The SDK automatically detects connected Square Stand or Square Kiosk hardware.

## Configuration

Update `Config.swift`:
- `apiBaseURL`: Your backend API URL (e.g., `https://isso-donation-kiosk-production.up.railway.app/api`)
- Square configuration is handled via Info.plist

Example:
```swift
struct Config {
    static let apiBaseURL = "https://isso-donation-kiosk-production.up.railway.app/api"
    static let squareApplicationId = "your-square-app-id"
    static let squareLocationId = "your-square-location-id" // Set after OAuth
}
```

