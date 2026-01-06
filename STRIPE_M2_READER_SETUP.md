# Setting Up Physical Stripe M2 Reader

This guide explains how to set up and use your physical Stripe M2 reader in live mode.

## Prerequisites

- Physical Stripe M2 reader
- Stripe account (live mode)
- iOS device (iPad) with Bluetooth enabled
- Stripe Terminal SDK installed in iOS app

## Step 1: Register M2 Reader

**Important:** M2 readers don't have screens, so they can't display pairing codes. Registration happens automatically when you connect via the iOS app.

### Method: Register via iOS App (Automatic)

**The M2 reader registers automatically when you connect it through the iOS app:**

1. **First, ensure your backend is configured:**
   - Add `STRIPE_SECRET_KEY=sk_live_...` to `backend/.env`
   - Start your backend server

2. **In your iOS app:**
   - The app will discover the M2 reader via Bluetooth
   - When connecting, Stripe Terminal SDK will automatically register the reader
   - The reader will appear in your Stripe Dashboard automatically

3. **Verify in Stripe Dashboard:**
   - Go to [Stripe Dashboard - Live Mode](https://dashboard.stripe.com/terminal/readers)
   - The reader should appear in your readers list after first connection
   - Status should show "Ready" or "Online"

### Alternative: Manual Registration via Dashboard (If Needed)

**If automatic registration doesn't work, you can try manual registration:**

1. Go to [Stripe Dashboard - Live Mode](https://dashboard.stripe.com/terminal/readers)
2. Click **"Register reader"** or **"Add reader"**
3. Select **"Serial number"** as the registration method
4. Enter your M2 reader's serial number (found on the back of the reader)
   - Format: Usually starts with "STRM2" (e.g., "STRM2D507017278")
5. Click **"Next"**

**Note:** If you get "No registerable readers" error:
- The reader might not be associated with your Stripe account
- **Solution:** Register via the iOS app instead (automatic method above)
- Or contact Stripe support to manually associate the reader with your account


## Step 2: Power On and Prepare M2 Reader

1. **Power on the M2 reader:**
   - Press and hold the power button until the LED lights up
   - The reader will show a blue LED when ready

2. **Check Bluetooth:**
   - Ensure the reader is within range (within 10 feet)
   - Make sure no other device is connected to it

3. **Reader Status:**
   - Blue LED = Ready to connect
   - Green LED = Connected and ready
   - Red LED = Error or needs attention

## Step 3: Configure Backend

Add to `backend/.env`:

```bash
# Live Mode
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Configure iOS App

The iOS app is already configured to use physical readers. The code uses:

```swift
let config = DiscoveryConfiguration(
    discoveryMethod: .bluetoothScan,
    simulated: false // Using physical M2 reader
)
```

**No changes needed** - the app will automatically discover your registered M2 reader.

## Step 5: Connect Reader in App

1. **Start the iOS app**
2. **Initiate a donation** (this triggers reader discovery)
3. **The app will:**
   - Scan for Bluetooth readers
   - Discover your registered M2 reader
   - Connect automatically
   - Show "Reader connected" in logs

## Step 6: Process Payment

1. Customer taps or inserts their card on M2 reader
2. Payment processes in live mode
3. Funds are transferred to your Stripe account
4. Receipt is automatically sent to customer email

## Troubleshooting

### Reader Not Discovered

**Check:**
1. ✅ M2 reader is powered on (blue LED)
2. ✅ Reader is registered in Stripe Dashboard
3. ✅ Using correct Stripe account (test vs live)
4. ✅ Bluetooth is enabled on iPad
5. ✅ Reader is within range (within 10 feet)
6. ✅ No other device is connected to the reader

**Try:**
- Restart the M2 reader (hold power button 10 seconds)
- Restart Bluetooth on iPad
- Move reader closer to iPad
- Check Stripe Dashboard → Terminal → Readers to verify registration

### Connection Fails

**Error: "Reader registration required"**
- Register the reader in Stripe Dashboard first
- Make sure you're using the correct account (test/live)

**Error: "Bluetooth connection failed"**
- Ensure Bluetooth is enabled
- Check reader is powered on
- Try restarting both devices

**Error: "Connection token invalid"**
- Verify `STRIPE_SECRET_KEY` is correct
- Check if using test key for test account
- Ensure backend is running and accessible

### Reader Falls Asleep

The app includes a **keep-alive mechanism** that:
- Sends signals every 30 seconds to keep reader awake
- Refreshes connection token every 5 minutes
- Prevents reader from going to sleep

If reader still falls asleep:
- Check keep-alive timer is running (see logs)
- Ensure app is in foreground
- Verify Bluetooth connection is stable

### Payment Fails

**Check:**
- Ensure reader is connected before starting payment
- Check card is inserted/tapped correctly
- Verify PaymentIntent is created before collection

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
5. **Test in test mode first** - Verify everything works before going live

## Important Notes

- This setup is configured for **Live Mode** only
- All payments are real and will charge actual cards
- Make sure your Stripe account is fully activated and verified
- Test thoroughly before deploying to production

## Support

- [Stripe Terminal Documentation](https://stripe.com/docs/terminal)
- [M2 Reader Setup Guide](https://stripe.com/docs/terminal/readers/bbpos-chipper2xbt)
- [Stripe Support](https://support.stripe.com/)

