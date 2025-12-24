# Square Mobile Payments SDK - Square Stand Not Waking Up / Payment Issues

## Environment Details

- **SDK**: Square Mobile Payments SDK for iOS
- **Platform**: iOS 16.6+ (iPad)
- **Hardware**: Square Stand (connected via Lightning/USB-C)
- **Application ID**: `[REDACTED]`
- **Integration Type**: In-person payments using `PaymentManager`
- **App Type**: Kiosk application (unattended payment kiosk)

## Problem Summary

We are experiencing persistent issues with Square Stand hardware not waking up or responding when initiating payments through the Mobile Payments SDK. The Stand appears to "fall asleep" after periods of inactivity and does not wake up when `PaymentManager.startPayment()` is called, even though the SDK is properly authorized and the hardware is physically connected.

## Detailed Problem Description

### Primary Issues:

1. **Square Stand Not Lighting Up After Idle Period**
   - After the app runs for several hours (or after iPad restart), when a user initiates a payment, the app displays "Tap or insert card" but the Square Stand does not light up or respond
   - The SDK appears to be in an authorized state (`SQMPAuthorizationState.authorized`), but the hardware does not activate
   - No error is returned from the SDK - it simply doesn't detect/wake the hardware

2. **"payment_already_in_progress" Errors**
   - Occasionally receive this error even when no payment is actually in progress
   - This suggests the SDK's internal state may be out of sync with the actual hardware state
   - Requires app restart or physical unplug/replug of Square Stand to resolve

3. **Hardware Detection Inconsistency**
   - `EAAccessoryManager.shared().connectedAccessories` does not reliably show the Square Stand, even when it's physically connected
   - The Stand may appear in iOS Settings > General > About, but not in `connectedAccessories` until the SDK actively tries to use it
   - This makes pre-flight hardware checks unreliable

4. **Hardware Not Waking After iPad Restart**
   - After iPad restart, even though Square Stand is physically connected, the SDK cannot detect/wake it
   - Requires multiple authorization attempts or physical unplug/replug
   - Sometimes works after waiting 30+ seconds, but not reliably

## Steps to Reproduce

1. **Setup**:
   - Connect Square Stand to iPad via Lightning/USB-C
   - Authorize SDK with OAuth access token and location ID
   - Verify authorization state is `SQMPAuthorizationState.authorized`
   - App runs in kiosk mode (idle timer disabled, always on)

2. **Reproduce Issue A (Idle Period)**:
   - Leave app running for 2+ hours without any payment activity
   - Initiate a payment via `PaymentManager.startPayment()`
   - **Expected**: Square Stand lights up, ready for card
   - **Actual**: App shows "Tap or insert card" but Stand does not light up

3. **Reproduce Issue B (After Restart)**:
   - Restart iPad while Square Stand is connected
   - Launch app, SDK auto-authorizes
   - Initiate payment immediately
   - **Expected**: Stand should wake and be ready
   - **Actual**: Stand does not respond, requires physical unplug/replug

4. **Reproduce Issue C (State Confusion)**:
   - Start a payment, then cancel/close view before completion
   - Try to start another payment immediately
   - **Expected**: New payment should start normally
   - **Actual**: Sometimes get "payment_already_in_progress" error

## Current Implementation

### SDK Initialization:
```swift
// In AppDelegate.didFinishLaunchingWithOptions
MobilePaymentsSDK.initialize(
    applicationLaunchOptions: launchOptions,
    squareApplicationID: squareAppID
)
```

### Authorization:
```swift
// Using OAuth access token from backend
let authorizationManager = MobilePaymentsSDK.shared.authorizationManager
authorizationManager.authorize(
    accessToken: accessToken,
    locationId: locationId
) { result in
    // Handle result
}
```

### Payment Flow:
```swift
// Single-payment gate to prevent duplicates
guard !isStarting else { return }
isStarting = true

// Check SDK authorization state
let authState = MobilePaymentsSDK.shared.authorizationManager.state
guard authState == .authorized else {
    // Re-authorize if needed
    return
}

// Create payment parameters
let amountMoney = Money(amount: UInt(amount * 100), currency: .USD)
let paymentParameters = PaymentParameters(
    idempotencyKey: idempotencyKey,
    amountMoney: amountMoney
)
let promptParameters = PromptParameters(
    mode: .default,
    additionalMethods: .all
)

// Start payment
let paymentManager = MobilePaymentsSDK.shared.paymentManager
paymentManager.delegate = self
paymentManager.startPayment(
    paymentParameters: paymentParameters,
    promptParameters: promptParameters,
    presentingViewController: viewController
)
```

### Info.plist Configuration:
```xml
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.squareup.s020</string>
    <string>com.squareup.s025</string>
    <string>com.squareup.s089</string>
    <string>com.squareup.protocol.stand</string>
</array>
```

### Permissions:
- ✅ Location: `authorizedWhenInUse` or `authorizedAlways`
- ✅ Bluetooth: `allowedAlways`
- ✅ External Accessory: Configured in Info.plist

## What We've Tried

1. **Re-authorization Before Payment**
   - Always re-authorize SDK before starting payment
   - Tried with `forceReauthorize: true` flag (if available)
   - No improvement

2. **Hardware Detection Checks**
   - Using `EAAccessoryManager` to check for connected Square Stand
   - Registered for `EAAccessoryDidConnect`/`EAAccessoryDidDisconnect` notifications
   - Auto-re-authorize when hardware connects
   - Limited success - hardware often not detected until SDK uses it

3. **Single-Payment Gate**
   - Implemented `isStarting` flag to prevent duplicate payment attempts
   - Check SDK's `authorizationManager.state` before starting payment
   - Still get "payment_already_in_progress" errors occasionally

4. **Hardware Wake-Up Attempts**
   - Try to access accessory properties to "wake" sleeping hardware
   - Delay before starting payment to allow hardware to initialize
   - Limited effectiveness

5. **Removed Aggressive Pre-Checks**
   - Based on Square documentation, removed aggressive hardware detection loops
   - Rely on SDK's internal hardware detection when `startPayment()` is called
   - Still doesn't wake hardware reliably

6. **Tried Square Point of Sale SDK**
   - Tested alternative SDK (opens Square POS app)
   - Same issues - hardware not waking up

## Logs/Examples

### Successful Payment (when it works):
```
[SquareMobilePayments] 💳 Starting payment: $101.0 for donation [ID]
[SquareMobilePayments] 🔐 SDK Authorization state: SQMPAuthorizationState(rawValue: 2)
[SquareMobilePayments] 📍 Location ID: [REDACTED]
[SquareMobilePayments] 🔄 Re-authorizing SDK before payment...
[SquareMobilePayments] ✅ Re-authorization completed
[SquareMobilePayments] 🚀 Starting payment flow with PaymentManager...
[SquareMobilePayments] ✅ Payment started successfully - waiting for card...
```

### Failed Payment (Stand doesn't wake):
```
[SquareMobilePayments] 💳 Starting payment: $101.0 for donation [ID]
[SquareMobilePayments] 🔐 SDK Authorization state: SQMPAuthorizationState(rawValue: 2)
[SquareMobilePayments] 📍 Location ID: [REDACTED]
[SquareMobilePayments] 🔄 Re-authorizing SDK before payment...
[SquareMobilePayments] ✅ Re-authorization completed
[SquareMobilePayments] 🚀 Starting payment flow with PaymentManager...
[SquareMobilePayments] ✅ Payment started successfully - waiting for card...
// App shows "Tap or insert card" but Square Stand never lights up
// No error returned, just no hardware response
```

### After iPad Restart:
```
[AppDelegate] ✅ Square Mobile Payments SDK initialized
[SquareMobilePayments] Already authorized (state: SQMPAuthorizationState(rawValue: 2))
[SquareMobilePayments] ✅ SDK is authorized
// User tries to pay...
[SquareMobilePayments] 💳 Starting payment: $101.0
// Stand does not respond - requires physical unplug/replug
```

## Questions for Square Support

1. **Hardware Wake-Up**: Is there a recommended way to "wake" a sleeping Square Stand before calling `startPayment()`? Should we be calling a specific SDK method?

2. **State Management**: How should we handle the SDK's internal state when hardware appears to be "stuck"? Is there a way to reset/refresh the hardware connection without re-authorizing?

3. **Pre-Flight Checks**: Is it possible to reliably detect if Square Stand is connected and ready before calling `startPayment()`? `EAAccessoryManager` doesn't seem reliable.

4. **Idle Periods**: Are there any known issues with Square Stand going to sleep after long idle periods? Should we be sending periodic "keep-alive" signals?

5. **Authorization Timing**: Should we always re-authorize before each payment, or only when state is not `.authorized`? Does re-authorization help wake hardware?

6. **Error Handling**: When `startPayment()` succeeds but hardware doesn't respond, should we expect an error callback? Currently we get no feedback.

7. **Best Practices**: For kiosk applications that run 24/7, what are the recommended patterns for maintaining Square Stand connectivity?

8. **Hardware Detection**: Why doesn't `EAAccessoryManager.connectedAccessories` reliably show Square Stand even when it's physically connected? Is this expected behavior?

## Additional Context

- **Use Case**: Unattended payment kiosk - needs to be reliable for 24/7 operation
- **Frequency**: Issues occur most commonly after:
  - 2+ hours of inactivity
  - iPad restart
  - App backgrounding/foregrounding
- **Workaround**: Physical unplug/replug of Square Stand resolves the issue temporarily
- **Impact**: High - affects user experience and donation collection

## Request

We need guidance on:
1. How to reliably wake Square Stand when it appears to be sleeping
2. Best practices for maintaining hardware connection in long-running kiosk applications
3. How to detect and handle hardware state issues before they cause payment failures
4. Any SDK methods or patterns we should be using that we're not currently aware of

Thank you for your assistance!

