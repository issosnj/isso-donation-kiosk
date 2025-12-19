# Square Mobile Payments SDK Integration Guide

This guide will help you integrate the Square Mobile Payments SDK into the iOS kiosk app.

## Prerequisites

- Xcode 15.0+
- iOS 16.0+
- Square Developer Account
- Square Application ID (from Square Developer Dashboard)
- Square Stand or Square Kiosk hardware (for production)

## Step 1: Add Square Mobile Payments SDK

1. Open `ISSOKiosk.xcodeproj` in Xcode
2. Go to **File > Add Packages...**
3. Enter the Square Mobile Payments SDK URL:
   ```
   https://github.com/square/square-mobile-payments-sdk-ios
   ```
4. Select the latest version and click **Add Package**
5. Add the package to your target

## Step 2: Configure Info.plist

1. Open `ISSOKiosk/Info.plist`
2. Update the `SQUARE_APPLICATION_ID` value with your actual Square Application ID:
   ```xml
   <key>SQUARE_APPLICATION_ID</key>
   <string>sq0idp-YOUR_APPLICATION_ID</string>
   ```

## Step 3: Update SquarePaymentService

Replace the placeholder implementation in `SquarePaymentService.swift` with the actual Square SDK integration:

```swift
import SquareMobilePaymentsSDK

class SquarePaymentService {
    static let shared = SquarePaymentService()
    
    private var squarePayments: SquarePayments?
    
    private init() {
        // Initialize Square Payments SDK
        if let appId = Bundle.main.object(forInfoDictionaryKey: "SQUARE_APPLICATION_ID") as? String {
            squarePayments = SquarePayments(applicationId: appId)
        }
    }
    
    func processPayment(amount: Double, locationId: String) async throws -> PaymentResult {
        guard let squarePayments = squarePayments else {
            throw NSError(domain: "SquarePaymentService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Square SDK not initialized"])
        }
        
        // Create payment request
        let paymentRequest = PaymentRequest(
            amount: Money(amount: Int(amount * 100), currency: .usd),
            locationId: locationId
        )
        
        // Process payment
        return try await withCheckedThrowingContinuation { continuation in
            squarePayments.processPayment(paymentRequest) { result in
                switch result {
                case .success(let payment):
                    continuation.resume(returning: PaymentResult(
                        success: true,
                        paymentId: payment.id,
                        error: nil
                    ))
                case .failure(let error):
                    continuation.resume(returning: PaymentResult(
                        success: false,
                        paymentId: nil,
                        error: error.localizedDescription
                    ))
                }
            }
        }
    }
}
```

## Step 4: Configure Bundle ID in Square Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **Mobile** tab
4. Add your app's Bundle ID (e.g., `com.issosnj.issokiosk`)
5. Save the configuration

## Step 5: Test on Device

1. Connect your iPad to Xcode
2. Build and run the app
3. The Square SDK will automatically detect connected Square Stand or Square Kiosk hardware
4. Test the payment flow

## Step 6: Production Deployment

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

## Resources

- [Square Mobile Payments SDK Documentation](https://developer.squareup.com/docs/mobile-payments-sdk/overview)
- [Square Developer Dashboard](https://developer.squareup.com/apps)
- [Square SDK iOS GitHub](https://github.com/square/square-mobile-payments-sdk-ios)

