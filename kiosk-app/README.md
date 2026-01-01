# ISSO Donation Kiosk - iOS App

Native iOS app for donation kiosks using Square Mobile Payments SDK with Square Stand hardware.

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+
- iPad (optimized for kiosk use)
- Square Stand hardware (for payment processing)

## Quick Start

1. **Open Project**
   ```bash
   cd kiosk-app/ISSOKiosk
   open ISSOKiosk.xcodeproj
   ```

2. **Build and Run**
   - Connect iPad to Mac
   - Select iPad as target device
   - Build and run (⌘R)


## Deployment

This app is designed for **private/internal distribution via MDM (Mobile Device Management)**.

📖 **See [MDM_DEPLOYMENT.md](./MDM_DEPLOYMENT.md) for complete deployment guide**

### Quick Deployment Checklist
- [ ] Apple Developer Account (Enterprise recommended)
- [ ] MDM solution configured
- [ ] Bundle identifier configured
- [ ] Archive and export app
- [ ] Upload to MDM
- [ ] Test on one device
- [ ] Deploy to all kiosks

## Current Status

### ✅ Completed
- Device activation with 8-character device code
- Modern donation flow UI with preset amounts and custom input
- Category selection from temple configuration
- Optional donor name and email collection
- Payment processing (backend-only, temporary)
- Device heartbeat every 30 seconds
- Token persistence in Keychain
- Temple branding support (logo, colors, custom messages)
- Home screen with configurable headers and quick actions
- Anonymous suggestion box
- Google Calendar integration for events
- Square SDK automatic reconnection (prevents connection loss)
- QR code scanning for device activation
- Landscape orientation lock
- Idle timer (returns to home after inactivity)

### ✅ Completed (Recent)
- Square Mobile Payments SDK integration with Square Reader 2nd Gen
- Real-time payment processing with Square hardware
- Admin menu for troubleshooting (tap time 10 times)
- Keep-alive mechanism to prevent Square Reader from sleeping

### 📋 Architecture
- **AppState**: Manages app-wide state (device token, temple, categories)
- **APIService**: Handles all backend API calls
- **SquareMobilePaymentsService**: Mobile Payments SDK integration (fully implemented)
- **SquarePaymentService**: Payment flow coordinator
- **KeychainHelper**: Secure token storage
- **Views**: SwiftUI views for each screen

## Configuration

### API Configuration
The app is configured to use the production API:
```swift
static let apiBaseURL = "https://kiosk-backend.issousa.org/api"
```

### Square Configuration
1. **Square Application ID** (already in `Info.plist`):
   ```xml
   <key>SQUARE_APPLICATION_ID</key>
   <string>sq0idp-Xtwux6dvJ58KrKW0amhoMQ</string>
   ```

2. **Required Permissions** (already added to `Info.plist`):
   - Location (`NSLocationWhenInUseUsageDescription`)
   - Bluetooth (`NSBluetoothAlwaysUsageDescription`)
   - Microphone (`NSMicrophoneUsageDescription`)

3. **Bundle ID**: `com.mitpatel.ISSOKiosk`
4. **Team ID**: `CAL45S6TSM`

## App Flow

1. **Device Activation**
   - User enters 8-character device code (or scans QR code)
   - App activates with backend
   - Receives device token and temple configuration
   - Auto-authorizes Square Mobile Payments SDK (when available)

2. **Home Screen**
   - Displays temple name and address
   - "Two Taps To Donation" button
   - Quick actions: WhatsApp, Events, Social Media, Suggestions
   - Returns to home after idle timeout

3. **Donation Selection**
   - User selects preset amount ($5, $10, $25, $100) or enters custom amount
   - Optionally selects donation category
   - Clicks "Continue"

4. **Donation Details**
   - User reviews donation summary
   - Optionally enters name and email
   - Clicks "Ready for Payment"

5. **Payment Processing**
   - App initiates donation with backend
   - Mobile Payments SDK shows payment UI
   - Customer taps/chips card on Square Stand
   - SDK processes payment directly
   - App shows success/failure screen

## Square Mobile Payments SDK

**⚠️ Important:** See [MOBILE_PAYMENTS_SDK.md](./MOBILE_PAYMENTS_SDK.md) for complete integration guide.

**Current Status:**
- ✅ Backend ready (OAuth scope includes `PAYMENTS_WRITE_IN_PERSON`)
- ✅ Backend endpoint provides Square credentials
- ✅ iOS app fully integrated with Square Mobile Payments SDK
- ✅ Square Reader 2nd Gen support with Bluetooth pairing

**⚠️ Critical:** Do NOT add `https://github.com/square/in-app-payments-ios` package. This is the In-App Payments SDK (wrong) and causes `ThreeDS_SDK.framework` crashes. See troubleshooting section below.

## Troubleshooting

### ThreeDS_SDK Crash
If you see `Library not loaded: @rpath/ThreeDS_SDK.framework/ThreeDS_SDK`:

1. **Delete app from iPad** (removes old frameworks)
2. **Clean build folder** in Xcode (Shift+Cmd+K)
3. **Delete Derived Data** (Xcode → Settings → Locations → Derived Data)
4. **Rebuild** (Cmd+R)

Or run: `./FORCE_CLEAN_BUILD.sh`

**Root Cause:** Old Square SDK frameworks cached in build products or device.

### Xcode Re-adds Square Packages
**⚠️ CRITICAL:** Xcode may automatically re-add the wrong Square SDK package (`https://github.com/square/in-app-payments-ios`). This causes the `ThreeDS_SDK.framework` crash.

**DO NOT:**
- Add any Square packages in Xcode Package Dependencies tab
- Click "Resolve Package Versions" if Xcode suggests it
- Accept any Xcode suggestions to add Square packages

**If Xcode re-adds packages:**
1. Close Xcode
2. Remove all Square SDK references from `project.pbxproj`:
   - Remove `PBXBuildFile` entries for Square SDKs
   - Remove `PBXFrameworksBuildPhase` entries
   - Remove `packageProductDependencies`
   - Remove `packageReferences` to `in-app-payments-ios`
   - Remove `XCRemoteSwiftPackageReference` and `XCSwiftPackageProductDependency` sections
3. Run `./FORCE_CLEAN_BUILD.sh`
4. Reopen Xcode
5. Build without resolving packages

**Note:** We need the Mobile Payments SDK (different package), not In-App Payments SDK.

## Testing

1. Create a device in admin portal
2. Get the 8-character device code
3. Enter code in app to activate (or scan QR code)
4. Test donation flow
5. Payment processing requires Square Stand hardware and Mobile Payments SDK

## Deployment

1. Archive app in Xcode
2. Upload to App Store Connect
3. Distribute via TestFlight or App Store
4. For kiosk deployment, use MDM for device management

## Documentation

- [Square Mobile Payments SDK Guide](./MOBILE_PAYMENTS_SDK.md) - Complete SDK integration guide
- [Backend API Documentation](../README.md)

## Support

For issues or questions:
- Check troubleshooting section above
- Review Square Mobile Payments SDK documentation
- Check backend API status
