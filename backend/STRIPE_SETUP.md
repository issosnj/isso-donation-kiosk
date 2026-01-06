# Stripe Terminal Setup Guide (Live Mode)

This guide explains how to set up Stripe Terminal with the M2 reader for the ISSO Donation Kiosk in **Live Mode**.

## Prerequisites

- Stripe account (fully activated and verified)
- Physical Stripe M2 reader
- iOS device (iPad) with Bluetooth enabled

## 1. Get Live API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Make sure you're in **Live mode** (toggle in top right should show "Live mode")
3. Go to **Developers** → **API keys**
4. Copy your **Publishable key** (starts with `pk_live_`)
5. Copy your **Secret key** (starts with `sk_live_`)
6. Click "Reveal live key" if needed

## 2. Configure Backend Environment

Add these to your `backend/.env` file:

```bash
# Stripe Configuration (Live Mode)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Optional - not required for Terminal payments
```

**Note:** `STRIPE_WEBHOOK_SECRET` is **optional**. Terminal payments are synchronous, so webhooks aren't required for basic functionality. You only need webhooks if you want async payment status updates.

## 3. Configure Temple in Admin Portal

1. Log in to the admin portal
2. Go to your temple's **Stripe** tab
3. Enter your Stripe Publishable Key (`pk_live_...`)
4. The system will automatically use live mode
5. Click "Save Configuration"

## 4. Register M2 Reader

### Automatic Registration (Recommended)

1. Connect your M2 reader via the iOS app
2. The reader will automatically register when first connected
3. Verify in Stripe Dashboard → Terminal → Readers (Live Mode)
4. Reader should appear with status "Ready" or "Online"

### Manual Registration (If Needed)

1. Go to [Stripe Dashboard - Terminal → Readers](https://dashboard.stripe.com/terminal/readers) (Live Mode)
2. Click **"Register reader"** or **"Add reader"**
3. Select **"Serial number"** as the registration method
4. Enter your M2 reader's serial number (found on the back of the reader)
5. Click **"Next"**

## 5. Connect Reader in iOS App

1. Start the iOS app
2. Initiate a donation (this triggers reader discovery)
3. The app will:
   - Scan for Bluetooth readers
   - Discover your registered M2 reader
   - Connect automatically
   - Show "Reader connected" in logs

## 6. Process Payments

1. Customer taps or inserts their card on M2 reader
2. Payment processes in live mode
3. Funds are transferred to your Stripe account
4. Receipt is automatically sent to customer email

## Important Notes

⚠️ **Live Mode Warnings:**
- All payments are **REAL** and will charge actual cards
- Make sure your Stripe account is fully activated and verified
- Test thoroughly before deploying to production
- Monitor transactions in Stripe Dashboard

## Troubleshooting

### Reader Not Discovered

**Check:**
1. ✅ M2 reader is powered on (blue LED)
2. ✅ Reader is registered in Stripe Dashboard (Live Mode)
3. ✅ Using live mode Stripe account
4. ✅ Bluetooth is enabled on iPad
5. ✅ Reader is within range (within 10 feet)
6. ✅ No other device is connected to the reader

**Try:**
- Restart the M2 reader (hold power button 10 seconds)
- Restart Bluetooth on iPad
- Move reader closer to iPad
- Check Stripe Dashboard → Terminal → Readers (Live Mode) to verify registration

### Connection Fails

**Error: "Reader registration required"**
- Register the reader in Stripe Dashboard (Live Mode) first
- Make sure you're using the live account

**Error: "Bluetooth connection failed"**
- Ensure Bluetooth is enabled
- Check reader is powered on
- Try restarting both devices

**Error: "Connection token invalid"**
- Verify `STRIPE_SECRET_KEY` is correct (starts with `sk_live_`)
- Ensure backend is running and accessible
- Check that you're using live mode keys

### Payment Fails

**Check:**
- Ensure reader is connected before starting payment
- Check card is inserted/tapped correctly
- Verify PaymentIntent is created before collection
- Check Stripe Dashboard → Logs for error details

## Reader Status Indicators

### LED Colors:
- **Blue (solid):** Ready to connect
- **Green (solid):** Connected and ready
- **Green (blinking):** Processing payment
- **Red (solid):** Error - check connection
- **Red (blinking):** Low battery or needs attention

### In App Logs:
- `🔍 Discovering physical M2 readers via Bluetooth...`
- `🔌 Connecting to M2 reader: [serial]`
- `✅ M2 Reader connected successfully!`
- `💓 Keep-alive: Reader connection active`

## Best Practices

1. **Keep reader charged** - Low battery can cause connection issues
2. **Stay within range** - Keep reader within 10 feet of iPad
3. **One connection at a time** - Don't connect multiple devices
4. **Register before use** - Always register in Stripe Dashboard first
5. **Monitor transactions** - Regularly check Stripe Dashboard for payments
6. **Keep keys secure** - Never commit API keys to version control

## Support

- [Stripe Terminal Documentation](https://stripe.com/docs/terminal)
- [M2 Reader Setup Guide](https://stripe.com/docs/terminal/readers/bbpos-chipper2xbt)
- [Stripe Support](https://support.stripe.com/)
- [Stripe Dashboard (Live Mode)](https://dashboard.stripe.com/)
