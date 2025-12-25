# Square Reader 2nd Gen Setup Guide

## Important: Bluetooth Pairing Required

Unlike Square Stand (which connects via USB/External Accessory), **Square Reader 2nd Gen uses Bluetooth** and **must be paired via iOS Settings before the SDK can detect it**.

## Setup Steps

### 1. Power On Square Reader 2nd Gen
- Press and hold the power button until the reader turns on
- Wait for the reader to fully boot (LEDs should stabilize)

### 2. Pair Reader via iOS Settings
**This is critical - the SDK cannot pair automatically!**

1. On the iPad, go to **Settings** > **Bluetooth**
2. Make sure Bluetooth is **enabled**
3. Wait for "Square Reader" to appear in the list of available devices
4. Tap on "Square Reader" to pair it
5. Follow any on-screen prompts to complete pairing
6. Verify the reader shows as **"Connected"** in Bluetooth settings

### 3. Verify in App
- The app will show "SDK authorized" in logs
- When you start a payment, the SDK will automatically discover the paired reader
- If you see "Connect hardware" error, the reader is likely not paired

## Troubleshooting

### Reader Not Detected During Payment

**Check:**
1. ✅ Reader is powered on
2. ✅ Bluetooth is enabled on iPad (Settings > Bluetooth)
3. ✅ Reader is paired in iOS Settings > Bluetooth (shows as "Connected")
4. ✅ SDK is authorized (check logs for "SDK authorized")
5. ✅ Reader is within 10 feet of iPad

**If still not working:**
1. **Forget and re-pair the reader:**
   - Go to iPad Settings > Bluetooth
   - Find "Square Reader" and tap the (i) icon
   - Tap "Forget This Device"
   - Power cycle the reader (turn off, wait 10 seconds, turn on)
   - Pair again in Bluetooth settings

2. **Restart the reader:**
   - Press and hold power button for 20 seconds until lights stop flashing
   - Release, wait 10 seconds
   - Press power button again to turn on
   - Re-pair in Bluetooth settings

3. **Check for interference:**
   - Keep reader within 10 feet of iPad
   - Remove any metal objects between reader and iPad
   - Avoid areas with heavy Bluetooth interference

## How It Works

1. **Pairing** (one-time setup):
   - Done via iOS Settings > Bluetooth
   - Creates a Bluetooth connection between iPad and reader
   - Reader must be paired before SDK can discover it

2. **Payment Flow**:
   - App calls `paymentManager.startPayment()`
   - SDK automatically discovers the paired reader via Bluetooth
   - SDK connects to reader and shows "Tap or insert card"
   - User taps/chips card on reader
   - SDK processes payment and returns result

## Key Differences from Square Stand

| Square Stand | Square Reader 2nd Gen |
|--------------|----------------------|
| Connects via USB/External Accessory | Connects via Bluetooth |
| Auto-detected by iOS | Must be paired in Settings first |
| No pairing needed | Pairing required |
| Always connected when plugged in | Can disconnect if Bluetooth drops |

## Notes

- The SDK **cannot** automatically pair the reader - it can only discover already-paired readers
- If reader is not paired, you'll see "Connect hardware" error
- Reader must be paired **before** starting a payment
- Once paired, the reader should stay paired unless you "Forget" it in Settings

