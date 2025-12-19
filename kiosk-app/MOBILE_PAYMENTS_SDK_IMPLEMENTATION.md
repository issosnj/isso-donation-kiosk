# Mobile Payments SDK Implementation Guide

## Current Status

We're currently using a **temporary backend-only payment flow**. To properly integrate with Square Stand, we need to implement the **Mobile Payments SDK**.

## What Needs to Change

### 1. Add Mobile Payments SDK Package

The Mobile Payments SDK is a **different package** from In-App Payments SDK. Check Square's iOS documentation for the correct Swift Package URL:
- Docs: https://developer.squareup.com/docs/mobile-payments-sdk/ios

### 2. Implementation Steps

#### Step 1: Authorize SDK
```swift
// Get OAuth access token from backend (temple's Square access token)
// Get location ID from temple configuration
let authorizationManager = AuthorizationManager()
authorizationManager.authorize(
    accessToken: templeSquareAccessToken,
    locationId: templeSquareLocationId
)
```

#### Step 2: Pair Square Stand
```swift
let readerManager = ReaderManager()
// SDK will automatically detect Square Stand
// Or use readerManager.startReaderDiscovery() to find it
```

#### Step 3: Take Payment
```swift
let paymentManager = PaymentManager()
let paymentRequest = PaymentRequest(
    amount: amount,
    currency: .usd
)

paymentManager.takePayment(paymentRequest) { result in
    switch result {
    case .success(let payment):
        // Payment successful
    case .failure(let error):
        // Payment failed
    }
}
```

## Architecture

1. **App Flow**:
   - User selects donation amount
   - App creates donation record in backend
   - App calls Mobile Payments SDK PaymentManager
   - SDK handles Square Stand interaction (tap/chip)
   - SDK returns payment result
   - App updates donation record with payment ID

2. **Backend Role**:
   - Store donation records
   - Provide OAuth access token to app
   - Receive webhooks from Square
   - Generate reports

## Important Notes

- Mobile Payments SDK processes payments **directly** - no card nonces
- SDK handles all Square Stand communication automatically
- OAuth tokens expire after 30 days - need refresh mechanism
- Must be **attended kiosk** (see requirements document)

## Next Steps

1. Find correct Mobile Payments SDK Swift Package URL
2. Add package to Xcode project
3. Implement AuthorizationManager
4. Implement PaymentManager flow
5. Test with Square Stand hardware

