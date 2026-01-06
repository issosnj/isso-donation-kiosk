# Stripe Terminal Setup Guide

This guide explains how to set up Stripe Terminal with the M2 reader for the ISSO Donation Kiosk.

## Test Mode (Sandbox) Setup

### 1. Create Stripe Test Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Sign up or log in to your Stripe account
3. Make sure you're in **Test mode** (toggle in top right should show "Test mode")

### 2. Get Test API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Click "Reveal test key" if needed

### 3. Configure Backend Environment

Add these to your `.env` file:

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Optional - not required for Terminal payments
```

**Note:** `STRIPE_WEBHOOK_SECRET` is **optional**. Terminal payments are synchronous, so webhooks aren't required for basic functionality. You only need webhooks if you want async payment status updates.

**Note:** The backend automatically detects test mode when using `sk_test_` keys.

### 4. Configure iOS App for Test Mode

In `StripeTerminalService.swift`, you can enable test mode by:

1. **Option 1: Use simulated readers (recommended for testing)**
   - Set `useSimulatedReader = true` in the service
   - This allows testing without a physical M2 reader

2. **Option 2: Use real M2 reader in test mode**
   - Keep `useSimulatedReader = false`
   - Use a physical M2 reader with test account

### 5. Testing with Simulated Readers

When using simulated readers in test mode:

1. The iOS app will discover a "Simulated Reader" instead of a real M2
2. You can test the full payment flow without hardware
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any CVC

### 6. Connect Stripe in Admin Portal

1. Go to the admin portal
2. Navigate to Temple Settings → Stripe (or Payment Settings)
3. Enter your Stripe Publishable Key (`pk_test_...`)
4. The system will automatically use test mode

## Production Mode Setup

### 1. Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode**
2. Get your live API keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

### 2. Update Environment Variables

```bash
# Stripe Configuration (Live Mode)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 3. Configure iOS App

- Set `useSimulatedReader = false` in `StripeTerminalService.swift`
- The app will discover real M2 readers via Bluetooth

### 4. Register M2 Reader

1. In Stripe Dashboard, go to **Terminal** → **Readers**
2. Register your M2 reader
3. The reader will appear in the iOS app when scanning

## Stripe Terminal SDK Installation

### iOS (Swift Package Manager)

Add to your `Package.swift` or Xcode:

```swift
dependencies: [
    .package(url: "https://github.com/stripe/stripe-terminal-ios", from: "3.0.0")
]
```

Or in Xcode:
1. File → Add Packages...
2. Enter: `https://github.com/stripe/stripe-terminal-ios`
3. Select version: `3.0.0` or latest

### Required Permissions

Add to `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>We need Bluetooth to connect to the Stripe M2 card reader</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>We need Bluetooth to connect to the Stripe M2 card reader</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need location to comply with payment regulations</string>
```

## Testing Payment Flow

### Test Cards

Use these test cards in sandbox mode:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`
- **Expired Card:** `4000 0000 0000 0069`

### Test Flow

1. Start the iOS app
2. Connect to reader (simulated or real M2)
3. Initiate a donation
4. Use test card `4242 4242 4242 4242`
5. Enter any future expiry date and any CVC
6. Payment should process successfully

## Troubleshooting

### Reader Not Discovered

- **Test Mode:** Make sure `useSimulatedReader = true`
- **Live Mode:** 
  - Check Bluetooth is enabled
  - Ensure M2 reader is powered on
  - Verify reader is registered in Stripe Dashboard

### Connection Token Errors

- Verify `STRIPE_SECRET_KEY` is set correctly
- Check if using test key (`sk_test_`) for test mode
- Ensure temple has Stripe configured in admin portal

### Payment Fails

- In test mode, use test cards only
- Check Stripe Dashboard → Logs for error details
- Verify PaymentIntent is created before collection

## Webhook Setup (Optional)

Webhooks are **not required** for Terminal payments since the flow is synchronous. However, you can set them up for async payment status updates:

### For Testing Webhooks Locally:

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### For Production Webhooks:

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook signing secret to `.env`

**Note:** If `STRIPE_WEBHOOK_SECRET` is not set, webhooks will still work but without signature verification (useful for testing).

## Migration from Square

When migrating from Square to Stripe:

1. Keep Square integration active during transition
2. Test Stripe thoroughly in sandbox mode
3. Update iOS app to use Stripe Terminal SDK
4. Update payment flow to use PaymentIntents
5. Switch to live mode when ready

## Support

- [Stripe Terminal Documentation](https://stripe.com/docs/terminal)
- [Stripe Terminal iOS SDK](https://github.com/stripe/stripe-terminal-ios)
- [Stripe Test Cards](https://stripe.com/docs/testing)

