# Square Stand Hardware Detection Issue - Technical Problem Description

## Problem Summary
We are experiencing inconsistent hardware detection for the Square Stand on iPad when using the Square Mobile Payments SDK. The hardware is physically connected, but iOS's `EAAccessoryManager` does not report it in `connectedAccessories` until the SDK actively attempts to use it during a payment flow. This causes `payment_already_in_progress` errors and prevents reliable payment processing.

## Technical Environment

### Hardware Setup
- **Device**: iPad (11-inch, running iOS 16.6+)
- **Square Hardware**: Square Stand (physical card reader/stand)
- **Connection**: iPad is physically inserted into Square Stand (Lightning/USB-C connection)
- **Status**: Square Stand is powered and physically connected

### Software Stack
- **SDK**: Square Mobile Payments SDK (latest version)
- **Language**: Swift/SwiftUI
- **iOS Version**: iOS 16.6+
- **Framework**: Using `ExternalAccessory` framework for hardware detection

### Configuration
- **Info.plist**: Properly configured with Square protocols:
  - `com.squareup.s020`
  - `com.squareup.s025`
  - `com.squareup.s089`
  - `com.squareup.protocol.stand`
- **Permissions**: 
  - Location permission: ✅ Granted
  - Bluetooth permission: ✅ Granted
- **SDK Authorization**: ✅ Successfully authorized (state: `SQMPAuthorizationState.authorized`)

## Symptoms

### 1. Hardware Not Detected in `connectedAccessories`
When checking for connected Square hardware using `EAAccessoryManager.shared().connectedAccessories`, the array is consistently empty:

```swift
let manager = EAAccessoryManager.shared()
let connectedAccessories = manager.connectedAccessories
// Result: [] (empty array)
```

**Expected**: Square Stand should appear in `connectedAccessories` when physically connected.

**Actual**: Array is empty, even though:
- Square Stand is physically connected
- iPad Settings > General > About may show "Square Stand" in device list (user reports this works)
- Square SDK is properly authorized

### 2. Payment Flow Issues
When attempting to process a payment:
- `payment_already_in_progress` errors occur frequently
- Multiple payment attempts are initiated (likely due to view lifecycle events)
- Payment handle is `nil` when starting payment flow
- SDK shows error: "A payment is already in progress. Cancel the current payment, or wait for it to complete, then try the new payment again."

### 3. Inconsistent Behavior
- Hardware detection works **only** when SDK actively starts a payment
- Pre-checking hardware before payment always returns `false`
- After iPad reboot, hardware is not detected until payment is attempted
- Physical reconnection (unplug/replug) sometimes helps, but not reliably

## Code Implementation

### Current Hardware Detection Method
```swift
func checkHardwareConnection() -> Bool {
    let manager = EAAccessoryManager.shared()
    let connectedAccessories = manager.connectedAccessories
    
    let squareProtocols = ["com.squareup.s020", "com.squareup.s025", 
                          "com.squareup.s089", "com.squareup.protocol.stand"]
    
    for accessory in connectedAccessories {
        let accessoryProtocols = accessory.protocolStrings
        let hasSquareProtocol = accessoryProtocols.contains { protocolString in
            squareProtocols.contains { $0 == protocolString }
        }
        
        if hasSquareProtocol {
            return true
        }
    }
    
    return false // Always returns false before payment starts
}
```

### Payment Flow
```swift
// 1. Check hardware (always returns false)
let isHardwareConnected = checkHardwareConnection()

// 2. Start payment
let paymentHandle = MobilePaymentsSDK.shared.paymentManager.startPayment(
    paymentParameters,
    promptParameters: promptParameters,
    from: viewController,
    delegate: self
)

// 3. Payment handle is often nil, causing payment_already_in_progress errors
```

## What We've Tried

1. **Aggressive Hardware Detection**: Implemented retry logic (6 attempts over 30 seconds) on app startup
2. **Force Re-authorization**: Attempted to force re-authorize SDK before payment (caused state issues)
3. **Delayed Payment Start**: Added delays to allow hardware to "wake up"
4. **State Management**: Added guards to prevent multiple simultaneous payment attempts
5. **Payment Cancellation**: Implemented proper cleanup of payment handles on view lifecycle events
6. **Removed Pre-checking**: Simplified to let SDK handle hardware detection during payment

## Questions for Guidance

1. **Is it expected behavior** that `EAAccessoryManager.shared().connectedAccessories` returns empty for Square Stand until SDK actively uses it?

2. **What is the correct way** to detect Square Stand hardware before starting a payment? Should we:
   - Rely on SDK's internal detection only?
   - Use a different API/framework?
   - Check authorization state instead of hardware connection?

3. **How should we handle** `payment_already_in_progress` errors? Is there a way to:
   - Query SDK for active payment state?
   - Properly cancel/clear stale payment handles?
   - Prevent these errors from occurring?

4. **Why does hardware detection fail** after iPad reboot, even when Square Stand is already connected? Is there:
   - A specific initialization sequence required?
   - A delay needed for hardware to register?
   - A different detection method for post-reboot scenarios?

5. **Best practices** for Square Stand detection:
   - Should we skip pre-checking hardware entirely?
   - Should we only check when payment is about to start?
   - Is there a delegate/notification we should observe?

## Additional Context

- **Square Documentation**: States hardware will be detected automatically when starting payment
- **User Reports**: Settings > General > About shows Square Stand, confirming iOS recognizes it
- **Timing Issue**: Hardware appears in `connectedAccessories` only after SDK's `startPayment` is called
- **Error Pattern**: `payment_already_in_progress` suggests SDK thinks a payment is active when it's not

## Desired Outcome

We need a reliable way to:
1. Detect Square Stand connection status before payment
2. Prevent `payment_already_in_progress` errors
3. Handle hardware detection after iPad reboot
4. Ensure payment flow works consistently

## Logs Excerpt

```
[SquareMobilePayments] ⚠️ No Square hardware detected in connected accessories
[SquareMobilePayments] 📋 Connected accessories: []
[SquareMobilePayments] 💡 Note: Square Stand may not appear in connectedAccessories until SDK actively uses it
[SquareMobilePayments] 🔌 Hardware connection check: ❌ Not detected
[SquareMobilePayments] ✅ SDK is authorized
[SquareMobilePayments] ❌ Payment handle is nil!
[SquareMobilePayments] ❌ Payment failed: payment_already_in_progress
```

Any guidance on the correct approach for Square Stand hardware detection and payment state management would be greatly appreciated.

