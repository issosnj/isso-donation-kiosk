# Square Mobile Payments SDK Setup

## ⚠️ CRITICAL: Attended Kiosk Requirement

According to [Square's documentation](https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations), the Mobile Payments SDK **CANNOT** be used for unattended kiosks.

### Your Kiosk Must Be:
- ✅ **Attended** - In line of sight of seller or worker
- ✅ **During business hours only** - Cannot be accessed outside normal business hours  
- ✅ **Staff trained** - Onsite staff must be trained and available to assist customers

### Prohibited:
- ❌ **Unattended kiosks** - Outdoor vending machines, 24/7 access, no staff supervision

## Mobile Payments SDK vs In-App Payments SDK

- **Mobile Payments SDK** - For in-person payments with Square hardware (Reader, Stand) ✅ CORRECT
- **In-App Payments SDK** - For online/card-on-file payments ❌ WRONG for hardware

## Package to Add

The Mobile Payments SDK is a different package. Check Square's documentation for the correct Swift Package URL:
- Documentation: https://developer.squareup.com/docs/mobile-payments-sdk/ios

## Required OAuth Permissions

- `MERCHANT_PROFILE_READ`
- `PAYMENTS_WRITE`
- `PAYMENTS_WRITE_IN_PERSON`

## Implementation Flow

1. **Authorize** - Use `AuthorizationManager` with OAuth access token
2. **Pair Reader** - Use `ReaderManager` to pair Square Stand
3. **Take Payment** - Use `PaymentManager` to process payment
4. **Handle Result** - Payment success/failure callback

## Architecture

- App creates donation intent
- Launches Mobile Payments SDK payment flow
- Customer taps/chips on Square Stand
- SDK processes payment directly (no nonce needed)
- App shows thank you screen

