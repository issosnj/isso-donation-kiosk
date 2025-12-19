# Square Mobile Payments SDK Package Setup

## Finding the Package URL

According to the [Square Mobile Payments SDK iOS documentation](https://developer.squareup.com/docs/mobile-payments-sdk/ios), you need to:

1. **Install the SDK and dependencies** - The documentation mentions installing via Swift Package Manager
2. **Add a run script in build phases** - Required for the SDK to work properly

## Steps to Add the Package

1. **Open Xcode Project**
   - Open `ISSOKiosk.xcodeproj` in Xcode

2. **Add Package Dependency**
   - Click the project name in the left sidebar
   - Select the project (not target)
   - Go to "Package Dependencies" tab
   - Click the "+" button
   - Enter the Square Mobile Payments SDK package URL
   - **Note**: The exact URL needs to be found from Square's documentation or developer portal

3. **Add Run Script**
   - Select your target (ISSOKiosk)
   - Go to "Build Phases" tab
   - Click "+" → "New Run Script Phase"
   - Add the script from Square's documentation
   - This is required for the SDK to function properly

4. **Update Info.plist**
   - Already done! We've added:
     - `NSLocationWhenInUseUsageDescription`
     - `NSBluetoothAlwaysUsageDescription`
     - `NSMicrophoneUsageDescription`

5. **Request Permissions**
   - Location permission must be requested before taking payments
   - Bluetooth permission must be requested for contactless readers
   - See `SquareMobilePaymentsService.swift` for implementation

## Implementation Notes

Based on the official documentation:

- **Authorization**: `MobilePaymentsSDK.shared.authorizationManager.authorize(accessToken:locationID:completion:)`
- **Payment**: `MobilePaymentsSDK.shared.paymentManager.startPayment(_:promptParameters:from:delegate:)`
- **Delegate**: Must implement `PaymentManagerDelegate` with three methods:
  - `paymentManager(_:didFinish:)` - Success
  - `paymentManager(_:didFail:withError:)` - Failure
  - `paymentManager(_:didCancel:)` - Canceled

## Next Steps

1. Find the exact Swift Package Manager URL from Square's developer portal
2. Add the package to Xcode
3. Add the required run script
4. Uncomment and implement the TODO sections in `SquareMobilePaymentsService.swift`
5. Test with Square Stand hardware

