# Stripe Test Mode (Sandbox) Quick Start

## Quick Setup for Testing

### 1. Get Stripe Test Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Copy your **Publishable key** (starts with `pk_test_`)

### 2. Configure Backend

Add to `backend/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

**That's it!** The backend automatically detects test mode when using `sk_test_` keys.

**Note:** `STRIPE_WEBHOOK_SECRET` is **optional** - you only need it if you want async webhook updates. For Terminal payments, webhooks aren't required since the payment flow is synchronous.

### 3. Configure iOS App for Test Mode

In `kiosk-app/ISSOKiosk/ISSOKiosk/Services/StripeTerminalService.swift`:

**Option A: Use Simulated Reader (No Hardware Needed)**
```swift
// In connectToReader method, change:
let config = DiscoveryConfiguration(
    discoveryMethod: .bluetoothScan,
    simulated: true  // ← Set to true for test mode
)
```

**Option B: Use Real M2 Reader in Test Mode**
```swift
// Keep simulated: false
// Use a physical M2 reader registered to your test account
```

### 4. Test Cards

Use these test cards in sandbox mode:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`

Any future expiry date (e.g., 12/25) and any CVC (e.g., 123)

### 5. Testing Flow

1. Start backend with test Stripe key
2. Start iOS app
3. Connect to reader (simulated or real M2)
4. Initiate donation
5. Use test card `4242 4242 4242 4242`
6. Payment processes in test mode

## Key Points

✅ **Test mode is automatic** - Just use `sk_test_` keys  
✅ **No real charges** - All transactions are simulated  
✅ **Simulated readers available** - Test without hardware  
✅ **Test cards work** - Use `4242 4242 4242 4242` for success  

## Switching to Production

When ready for production:

1. Get live keys from Stripe Dashboard (toggle to "Live mode")
2. Update `.env` with `sk_live_` key
3. Set `simulated: false` in iOS app
4. Register real M2 readers in Stripe Dashboard

## Troubleshooting

**"Stripe not connected" error:**
- Make sure `STRIPE_SECRET_KEY` is set in `.env`
- Verify the key starts with `sk_test_` for test mode

**Reader not discovered:**
- For testing: Set `simulated: true` in iOS service
- For real hardware: Ensure M2 is powered on and Bluetooth enabled

**Payment fails:**
- Use test cards only in test mode
- Check Stripe Dashboard → Logs for details

For more details, see `backend/STRIPE_SETUP.md`

