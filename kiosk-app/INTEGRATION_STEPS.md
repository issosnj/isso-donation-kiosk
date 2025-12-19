# Step-by-Step Square Mobile Payments SDK Integration

Based on Square's official documentation and similar implementations, here's the complete integration guide.

## Prerequisites ✅

- [x] Backend has `PAYMENTS_WRITE_IN_PERSON` scope
- [x] Backend endpoint `/devices/square-credentials` ready
- [x] Info.plist has required permissions
- [x] Project file is clean (no old Square SDK references)

## Step 1: Add Mobile Payments SDK Package

### In Xcode:

1. **Open Project**
   - Open `kiosk-app/ISSOKiosk/ISSOKiosk.xcodeproj` in Xcode

2. **Add Package Dependency**
   - Go to **File** → **Add Package Dependencies...**
   - Enter URL: `https://github.com/square/mobile-payments-sdk-ios`
   - Click **Add Package**
   - Select version: **2.3.1** (or "Up to Next Major Version: 2.3.1")
   - **IMPORTANT**: Select product **`SquareMobilePaymentsSDK`** only
   - **DO NOT** select `SquareInAppPaymentsSDK` or `SquareBuyerVerificationSDK`
   - Add to target: **ISSOKiosk**
   - Click **Add Package**

3. **Verify Package Added**
   - Go to **Project** → **Package Dependencies**
   - You should see: `mobile-payments-sdk-ios` with product `SquareMobilePaymentsSDK`
   - **If you see `in-app-payments-ios` or `SquareInAppPaymentsSDK`, remove it immediately**

## Step 2: Add Required Run Script (If Needed)

According to Square docs, some SDK versions require a build script. Check Square's latest iOS documentation for current requirements.

**If required:**
1. Select **ISSOKiosk** target
2. Go to **Build Phases** tab
3. Click **+** → **New Run Script Phase**
4. Add script from Square documentation (if specified)
5. Drag script to run **before** "Compile Sources"

## Step 3: Update Imports

### Update `SquareMobilePaymentsService.swift`:

```swift
import Foundation
import UIKit
import SquareMobilePaymentsSDK  // ✅ Add this import
```

## Step 4: Implement Authorization

### Update `authorize()` method:

```swift
func authorize(accessToken: String, locationId: String, completion: @escaping (Error?) -> Void) {
    self.accessToken = accessToken
    self.locationId = locationId
    
    // Check if already authorized
    guard MobilePaymentsSDK.shared.authorizationManager.state == .notAuthorized else {
        self.isAuthorized = true
        completion(nil)
        return
    }
    
    // Authorize with OAuth access token
    MobilePaymentsSDK.shared.authorizationManager.authorize(
        accessToken: accessToken,
        locationID: locationId
    ) { error in
        if let error = error {
            print("[SquareMobilePayments] Authorization failed: \(error.localizedDescription)")
            self.isAuthorized = false
            completion(error)
        } else {
            print("[SquareMobilePayments] Successfully authorized")
            self.isAuthorized = true
            completion(nil)
        }
    }
}
```

## Step 5: Implement Payment Processing

### Make `SquareMobilePaymentsService` conform to `PaymentManagerDelegate`:

```swift
class SquareMobilePaymentsService: NSObject, PaymentManagerDelegate {
    // ... existing code ...
    
    // MARK: - PaymentManagerDelegate
    
    func paymentManager(_ paymentManager: PaymentManager, didFinishPayment payment: Payment, error: Error?) {
        if let error = error {
            print("[SquareMobilePayments] Payment failed: \(error.localizedDescription)")
            currentPaymentCompletion?(.failure(error))
        } else {
            print("[SquareMobilePayments] Payment succeeded: \(payment.paymentID)")
            let result = PaymentResult(
                success: true,
                paymentId: payment.paymentID,
                error: nil
            )
            currentPaymentCompletion?(.success(result))
        }
        currentPaymentCompletion = nil
    }
    
    func paymentManager(_ paymentManager: PaymentManager, didCancelPayment payment: Payment) {
        print("[SquareMobilePayments] Payment cancelled")
        let error = NSError(domain: "SquareMobilePayments", code: -2, userInfo: [
            NSLocalizedDescriptionKey: "Payment was cancelled by user"
        ])
        currentPaymentCompletion?(.failure(error))
        currentPaymentCompletion = nil
    }
}
```

### Update `takePayment()` method:

```swift
func takePayment(
    amount: Double,
    donationId: String,
    from viewController: UIViewController,
    completion: @escaping (Result<PaymentResult, Error>) -> Void
) {
    guard isAuthorized, let locationId = locationId else {
        completion(.failure(NSError(domain: "SquareMobilePayments", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "SDK not authorized. Call authorize() first."
        ])))
        return
    }
    
    self.currentPaymentCompletion = completion
    
    // Create payment parameters
    let amountMoney = Money(amount: Int64(amount * 100), currency: .USD)
    let paymentParameters = PaymentParameters(
        paymentAttemptID: donationId, // Use donationId as unique identifier
        amountMoney: amountMoney,
        processingMode: .onlineOnly // Use .offline if supported and desired
    )
    
    // Create prompt parameters
    let promptParameters = PromptParameters(
        mode: .default, // Use default Square UI
        additionalMethods: .all // Support all payment methods
    )
    
    // Start payment
    do {
        let paymentHandle = try MobilePaymentsSDK.shared.paymentManager.startPayment(
            paymentParameters,
            promptParameters: promptParameters,
            from: viewController,
            delegate: self
        )
        
        print("[SquareMobilePayments] Payment started: \(paymentHandle)")
    } catch {
        print("[SquareMobilePayments] Failed to start payment: \(error.localizedDescription)")
        completion(.failure(error))
        currentPaymentCompletion = nil
    }
}
```

## Step 6: Update AppState Authorization

### Update `AppState.swift`:

```swift
private func authorizeSquareSDK() async {
    do {
        // Get Square credentials from backend
        let credentials = try await APIService.shared.getSquareCredentials()
        
        // Authorize Mobile Payments SDK
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            SquareMobilePaymentsService.shared.authorize(
                accessToken: credentials.accessToken,
                locationId: credentials.locationId
            ) { error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
        
        print("[AppState] Square Mobile Payments SDK authorized successfully")
    } catch {
        print("[AppState] Failed to authorize Square SDK: \(error.localizedDescription)")
        // Don't block app - Square SDK authorization can happen later
    }
}
```

## Step 7: Request Permissions

### Add to `AppState.swift` or `ISSOKioskApp.swift`:

```swift
import CoreLocation
import AVFoundation

// Request location permission (required by Square)
func requestLocationPermission() {
    let locationManager = CLLocationManager()
    locationManager.requestWhenInUseAuthorization()
}

// Request Bluetooth permission (required for Square Stand)
// This is handled automatically by iOS when SDK tries to use Bluetooth
```

## Step 8: Test Integration

1. **Build and Run**
   - Connect iPad with Square Stand
   - Build and run app
   - Verify no build errors

2. **Test Authorization**
   - Activate device
   - Check console for authorization success message

3. **Test Payment**
   - Go through donation flow
   - Select amount
   - Click "Ready for Payment"
   - Tap/chip card on Square Stand
   - Verify payment processes

## Troubleshooting

### If you see `ThreeDS_SDK` error:
- **STOP** - Wrong SDK was added
- Remove package: **Project** → **Package Dependencies** → Remove `in-app-payments-ios`
- Clean build folder: **Shift + Command + K**
- Delete derived data
- Rebuild

### If authorization fails:
- Check backend endpoint returns valid access token and location ID
- Verify OAuth scope includes `PAYMENTS_WRITE_IN_PERSON`
- Check Square Developer Dashboard for correct app configuration

### If payment doesn't start:
- Verify Square Stand is connected and powered on
- Check iPad Bluetooth is enabled
- Verify location permission is granted
- Check console logs for specific error messages

## References

- [Square Mobile Payments SDK iOS Docs](https://developer.squareup.com/docs/mobile-payments-sdk/ios)
- [Square Sample App (Donut Counter)](https://github.com/square/mobile-payments-sdk-ios)
- [Requirements and Limitations](https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations)

