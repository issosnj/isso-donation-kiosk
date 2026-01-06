# M2 Reader Setup (No Screen) - Quick Guide

Since M2 readers don't have screens, they **register automatically** when you connect them through the iOS app. You don't need to register them manually in Stripe Dashboard first!

## Quick Setup Steps

### 1. Configure Backend

Add to `backend/.env`:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

### 2. Power On M2 Reader

- Press and hold the power button until LED lights up
- Blue LED = Ready to connect
- Keep reader within 10 feet of your iPad

### 3. Connect via iOS App

1. **Start your iOS app**
2. **Initiate a donation** (this triggers reader discovery)
3. **The app will:**
   - Discover the M2 reader via Bluetooth
   - Connect to it automatically
   - **Automatically register it** with your Stripe account
   - Show "✅ M2 Reader connected and registered successfully!" in logs

### 4. Verify Registration

After first connection, check Stripe Dashboard:
- Go to [Terminal → Readers](https://dashboard.stripe.com/test/terminal/readers)
- Your M2 reader should appear in the list
- Status should show "Ready" or "Online"

## How It Works

**M2 readers without screens:**
- ✅ Register automatically when connected via iOS app
- ✅ No manual registration needed in Dashboard
- ✅ No pairing codes (reader has no screen)
- ✅ Works even if reader wasn't ordered through Stripe

**The registration happens during the first Bluetooth connection:**
1. App discovers reader via Bluetooth
2. App connects to reader
3. Stripe Terminal SDK automatically registers reader with your account
4. Reader appears in Stripe Dashboard

## Troubleshooting

### Reader Not Discovered

**Check:**
- ✅ M2 reader is powered on (blue LED)
- ✅ Bluetooth enabled on iPad
- ✅ Reader within 10 feet
- ✅ Backend is running with correct `STRIPE_SECRET_KEY`
- ✅ Using test key (`sk_test_`) for test mode

### Connection Fails

**Error: "Connection token invalid"**
- Verify `STRIPE_SECRET_KEY` is correct
- Check backend is running and accessible
- Ensure using test key for test mode

**Error: "Reader registration required"**
- This shouldn't happen with M2 readers
- Try disconnecting and reconnecting
- The reader should auto-register on connection

### Reader Doesn't Appear in Dashboard

**After connecting:**
- Wait a few seconds for registration to complete
- Refresh Stripe Dashboard
- Check you're in the correct mode (test vs live)
- Verify backend logs show "Reader connected and registered"

## Important Notes

1. **First connection = Registration**
   - The first time you connect, the reader registers automatically
   - Subsequent connections are faster (reader already registered)

2. **Test vs Live Mode**
   - Register in test mode first for testing
   - Same physical reader can be registered in both modes
   - Make sure backend uses correct key (`sk_test_` vs `sk_live_`)

3. **No Manual Registration Needed**
   - You don't need to register in Dashboard first
   - The iOS app handles everything automatically
   - Just connect and it registers!

## Still Having Issues?

If the reader doesn't auto-register:

1. **Check backend connection:**
   - Verify backend is running
   - Check `STRIPE_SECRET_KEY` is set correctly
   - Look for connection token errors in logs

2. **Try manual registration (last resort):**
   - Go to Stripe Dashboard → Terminal → Readers
   - Click "Register reader"
   - Select "Serial number"
   - Enter serial number from back of reader
   - If this fails, contact Stripe support

3. **Contact Stripe Support:**
   - They can manually associate the reader with your account
   - Provide serial number: `STRM2D507017278` (from your screenshot)

## Summary

**For M2 readers without screens:**
- ✅ **No Dashboard registration needed** - it happens automatically
- ✅ **Just connect via iOS app** - reader auto-registers
- ✅ **Works with any M2 reader** - even if not ordered through Stripe
- ✅ **First connection registers** - subsequent connections are faster

The key is: **Just connect the reader through your iOS app, and it will register automatically!**

