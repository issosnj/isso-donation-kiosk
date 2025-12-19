# Square Mobile Payments SDK Integration

## ⚠️ Critical Requirements

### Attended Kiosk Only
According to [Square's documentation](https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations), the Mobile Payments SDK **CANNOT** be used for unattended kiosks.

**Your kiosk must be:**
- ✅ **Attended** - In line of sight of seller or worker
- ✅ **During business hours only** - Cannot be accessed outside normal business hours
- ✅ **Staff trained** - Onsite staff must be trained and available to assist customers

**Prohibited:**
- ❌ Unattended kiosks (24/7 access, no staff supervision)

### DO NOT Add Wrong SDK
**⚠️ CRITICAL:** Do NOT add `https://github.com/square/in-app-payments-ios` package. This is the In-App Payments SDK (wrong) and causes `ThreeDS_SDK.framework` crashes.

**If Xcode re-adds packages:**
1. Close Xcode
2. Remove all Square SDK references from `project.pbxproj`
3. Run `./FORCE_CLEAN_BUILD.sh`
4. Reopen Xcode
5. Build without resolving packages

See README.md troubleshooting section for details.

## Current Status

- ✅ Backend ready (OAuth scope includes `PAYMENTS_WRITE_IN_PERSON`)
- ✅ Backend endpoint: `GET /devices/square-credentials` provides access token and location ID
- ✅ iOS app structure ready (`SquareMobilePaymentsService.swift`)
- ⏳ **Waiting for Mobile Payments SDK package URL** from Square

## Implementation Overview

### Architecture
1. App creates donation record in backend
2. App calls Mobile Payments SDK `PaymentManager`
3. SDK automatically detects Square Stand
4. Customer taps/chips card on Square Stand
5. SDK processes payment directly
6. App receives payment result and updates donation record

### Required Components
- **AuthorizationManager**: Authorize with OAuth access token and location ID
- **ReaderManager**: Automatically detects Square Stand
- **PaymentManager**: Processes payments with `PaymentParameters` and `PromptParameters`
- **PaymentManagerDelegate**: Handles payment results (success/failure/cancel)

### Required Permissions (Already Added)
- `NSLocationWhenInUseUsageDescription` - Location for transactions
- `NSBluetoothAlwaysUsageDescription` - Bluetooth for Square Stand
- `NSMicrophoneUsageDescription` - Microphone for magstripe readers

### Required OAuth Permissions
- `MERCHANT_PROFILE_READ`
- `PAYMENTS_WRITE`
- `PAYMENTS_WRITE_IN_PERSON` ✅ Already added to backend

## Next Steps

1. **Find Mobile Payments SDK Package URL**
   - Check Square Developer Portal
   - Documentation: https://developer.squareup.com/docs/mobile-payments-sdk/ios
   - It will be DIFFERENT from `in-app-payments-ios`

2. **Add Package to Xcode**
   - Open project in Xcode
   - Project → Package Dependencies → Add Package
   - Enter the Mobile Payments SDK URL
   - Select the correct product (not SquareInAppPaymentsSDK)

3. **Add Required Run Script**
   - Target → Build Phases → + → New Run Script Phase
   - Add script from Square documentation
   - Required for SDK to function

4. **Implement SDK**
   - Uncomment TODO sections in `SquareMobilePaymentsService.swift`
   - Implement `PaymentManagerDelegate`
   - Request location and Bluetooth permissions
   - Test with Square Stand hardware

## Code Structure

### Authorization
```swift
MobilePaymentsSDK.shared.authorizationManager.authorize(
    accessToken: accessToken,
    locationID: locationId
) { error in
    // Handle authorization result
}
```

### Payment
```swift
let paymentParameters = PaymentParameters(
    paymentAttemptID: UUID().uuidString,
    amountMoney: Money(amount: Int64(amount * 100), currency: .USD),
    processingMode: .onlineOnly
)

let promptParameters = PromptParameters(
    mode: .default,
    additionalMethods: .all
)

let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
    paymentParameters,
    promptParameters: promptParameters,
    from: viewController,
    delegate: self
)
```

## References

- [Square Mobile Payments SDK iOS Docs](https://developer.squareup.com/docs/mobile-payments-sdk/ios)
- [Requirements and Limitations](https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations)
- [Configure for Square Stand](https://developer.squareup.com/docs/mobile-payments-sdk/ios/square-stand)

