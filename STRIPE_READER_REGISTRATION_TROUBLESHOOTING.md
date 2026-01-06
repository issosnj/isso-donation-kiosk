# Troubleshooting: "No Registerable Readers" Error

If you're getting the error **"Cannot find any devices that can be registered with the serial numbers provided"** when trying to register your M2 reader, here are solutions:

## Quick Fix: Use Pairing Code Instead

**This is the easiest solution and works even if the reader wasn't ordered through Stripe:**

### Steps:

1. **In Stripe Dashboard:**
   - Go to Terminal → Readers → Register reader
   - Select **"Pairing code"** instead of "Serial number"

2. **On Your M2 Reader:**
   - Power on the reader (press and hold power button)
   - Wait for it to boot up
   - Press the power button again (or follow reader instructions)
   - A **6-digit pairing code** will appear on the reader screen
   - Example: `123456` or `789012`

3. **Enter the Pairing Code:**
   - Type the 6-digit code into Stripe Dashboard
   - Click "Register"

**This method works for any M2 reader, even if it wasn't purchased through Stripe!**

## Why Serial Number Registration Fails

The serial number method only works if:
- The reader was **ordered through your Stripe account**, OR
- The reader is already associated with your Stripe account

If you purchased the reader elsewhere (Amazon, retail store, etc.), the serial number won't be in Stripe's system.

## Alternative Solutions

### Solution 1: Order Reader Through Stripe (For Future)

If you need to register multiple readers by serial number:
1. Order readers directly from Stripe
2. They'll automatically be associated with your account
3. Serial number registration will work

### Solution 2: Use Pairing Code (Recommended)

- Works with any M2 reader
- No need to order through Stripe
- Fastest registration method
- Recommended for testing

### Solution 3: Register via iOS App (If Supported)

Some Stripe Terminal SDK versions allow registration directly from the app:
1. Connect to reader via Bluetooth
2. App prompts for registration
3. Follow on-screen instructions

## Step-by-Step: Pairing Code Method

1. **Power on M2 reader**
   - Press and hold power button
   - Wait for LED to turn blue/green

2. **Get pairing code**
   - Method varies by reader model
   - Usually: Press power button again, or
   - Navigate through reader menu to "Pair" or "Register"
   - 6-digit code appears on screen

3. **In Stripe Dashboard:**
   ```
   Terminal → Readers → Register reader
   → Select "Pairing code"
   → Enter 6-digit code
   → Click "Register"
   ```

4. **Verify registration:**
   - Reader should appear in your readers list
   - Status should show "Ready" or "Online"

## Common Issues

### "Pairing code expired"
- Pairing codes expire after a few minutes
- Get a new code from the reader
- Enter it quickly in Stripe Dashboard

### "Reader already registered"
- Check if reader is already in your readers list
- You might be logged into a different Stripe account
- Try switching between test/live mode

### "Cannot connect to reader"
- Ensure reader is powered on
- Check Bluetooth is enabled on your device
- Move reader closer (within 10 feet)
- Try restarting the reader

## For Test Mode

**Important:** Make sure you're in **Test mode** when registering:
- Toggle in top right of Stripe Dashboard should say "Test mode"
- Test mode readers are separate from live mode readers
- You can register the same physical reader in both modes

## Still Having Issues?

1. **Check reader model:**
   - Verify it's a Stripe-compatible M2 reader
   - Some readers might be Square-only or other brands

2. **Contact Stripe Support:**
   - If pairing code doesn't work
   - They can help verify reader compatibility
   - May need to manually associate reader with your account

3. **Try different registration method:**
   - If pairing code fails, try serial number
   - If serial number fails, try pairing code
   - Sometimes one method works when the other doesn't

## Best Practice

**For testing and development:**
- Use **Pairing Code** method (easiest, most reliable)
- Works with any M2 reader
- No need to order through Stripe

**For production:**
- Consider ordering readers through Stripe for easier management
- Or use pairing code method (works just as well)

