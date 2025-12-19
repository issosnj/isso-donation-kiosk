# Testing Square Stand Detection

## Overview
The Square Mobile Payments SDK automatically detects Square Stand hardware when the SDK is authorized. This guide explains how to verify that your Square Stand is properly connected and detected.

## Automatic Detection
When the app authorizes the Square SDK, it automatically runs a reader detection check. You'll see detailed logs in the Xcode console.

## Manual Testing Steps

### 1. Check iPad System Recognition
The easiest way to verify Square Stand connection is through iOS Settings:

1. **Open Settings** on your iPad
2. Navigate to **General** → **About**
3. Scroll down the list
4. **Look for "Square Stand"** in the device list
   - ✅ **If it appears**: The Stand is recognized by iOS
   - ❌ **If it doesn't appear**: Check physical connection

### 2. Verify Physical Connection
- Ensure iPad is **securely inserted** into the Square Stand
- Check that the Stand is **powered on** (LED indicator should be lit)
- Verify the **connector type** matches your iPad (USB-C or Lightning)
- Ensure all cables are firmly connected

### 3. Check App Logs
When the app launches and authorizes the Square SDK, you'll see logs like:

```
[SquareMobilePayments] ===== Testing Square Stand Detection =====
[SquareMobilePayments] Authorization State: authorized
[SquareMobilePayments] ✅ SDK is authorized
[SquareMobilePayments] 📱 To verify Square Stand connection:
[SquareMobilePayments]    1. Go to iPad Settings > General > About
[SquareMobilePayments]    2. Look for 'Square Stand' in the device list
[SquareMobilePayments] ✅ Square protocols configured: [...]
[SquareMobilePayments] 📍 Location permission: ✅ Granted
[SquareMobilePayments] 📡 Bluetooth permission: ✅ Granted
[SquareMobilePayments] 💡 Note: Square Stand will be detected automatically when you start a payment
```

### 4. Test During Payment
The **most reliable way** to test Square Stand detection is to attempt a payment:

1. Go through the donation flow
2. Select an amount
3. Click "Ready for Payment"
4. The SDK will automatically detect the Square Stand
5. If no hardware is found, you'll see an error message

## Troubleshooting

### Square Stand Not Detected

**Check:**
1. **Physical Connection**
   - Remove and reinsert iPad
   - Ensure Stand is powered on
   - Check cable connections

2. **iOS Settings**
   - Settings > General > About
   - Square Stand should appear in device list

3. **App Permissions**
   - Location Services: Settings > Privacy > Location Services
   - Bluetooth: Settings > Privacy > Bluetooth
   - Both should be enabled

4. **Info.plist Configuration**
   - Verify `UISupportedExternalAccessoryProtocols` includes Square protocols:
     - `com.squareup.s020`
     - `com.squareup.s025`
     - `com.squareup.s089`
     - `com.squareup.protocol.stand`

5. **SDK Authorization**
   - Check logs for successful authorization
   - Verify backend has Square credentials configured

### Still Not Working?

1. **Restart Devices**
   - Remove iPad from Stand
   - Restart iPad
   - Reconnect to Stand

2. **Update Software**
   - Update iPadOS: Settings > General > Software Update
   - Ensure app is using latest Square SDK version

3. **Test with Square POS App**
   - Install Square Point of Sale app
   - If it detects the Stand, the hardware is working
   - If it doesn't, the issue is with the Stand hardware

## Expected Behavior

### When Stand is Connected:
- SDK authorization succeeds
- Logs show "Square protocols configured"
- Payment flow can proceed
- Card reader responds to tap/insert

### When Stand is NOT Connected:
- SDK authorization may still succeed (authorization doesn't require hardware)
- Payment will fail with "No reader found" error
- User will see an error message

## Next Steps

Once you've verified Square Stand detection:
1. ✅ **Step 5 Complete**: Reader detection verified
2. ➡️ **Step 6**: Implement payment parameters
3. ➡️ **Step 7**: Test actual payment processing

