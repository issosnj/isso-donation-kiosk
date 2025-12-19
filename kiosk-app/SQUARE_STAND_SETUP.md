# Square Stand Connection Setup

## Why Their App Connects and Ours Doesn't

The key difference is **Info.plist configuration** for Square Stand hardware protocols.

## Required Configuration

### ✅ Info.plist - External Accessory Protocols

You **MUST** add these protocols to your `Info.plist` for Square Stand to be detected:

```xml
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.squareup.s020</string>
    <string>com.squareup.s025</string>
    <string>com.squareup.s089</string>
    <string>com.squareup.protocol.stand</string>
</array>
```

**This has been added to your Info.plist!** ✅

## What These Protocols Do

These protocols allow your app to:
- **Detect** Square Stand hardware when connected
- **Communicate** with Square Stand via External Accessory framework
- **Process payments** directly through the hardware

Without these protocols, the SDK cannot detect or connect to Square Stand.

## Additional Requirements

### 1. ✅ Permissions (Already Added)
- `NSLocationWhenInUseUsageDescription` - Location for transactions
- `NSBluetoothAlwaysUsageDescription` - Bluetooth for Square Stand
- `NSMicrophoneUsageDescription` - Microphone for magstripe readers

### 2. ✅ SDK Authorization (Already Implemented)
- OAuth access token from backend
- Location ID from temple configuration
- `AuthorizationManager.authorize()` call

### 3. ⚠️ Apple Authorization (May Be Required)
- Square must notify Apple that your app is authorized to work with Square Stand
- This is typically required for App Store submission
- For development/testing, it may work without this
- Contact Square support if you need this authorization

## How It Works

1. **App launches** → SDK initializes
2. **Device activates** → SDK authorizes with Square credentials
3. **Square Stand connected** → iOS External Accessory framework detects it via protocols
4. **Payment starts** → SDK automatically uses Square Stand hardware
5. **User taps/chips card** → Payment processes through Square Stand

## Testing

After adding the protocols:

1. **Connect Square Stand** to iPad
2. **Launch app** and activate device
3. **Check console logs** for:
   - `[SquareMobilePayments] Successfully authorized`
   - Any reader detection messages
4. **Start a payment** and verify Square Stand is used

## Troubleshooting

### Square Stand Not Detected

1. **Check Info.plist** - Verify protocols are added correctly
2. **Check connections** - Ensure Square Stand is properly connected to iPad
3. **Check authorization** - Verify SDK authorization succeeded
4. **Check console** - Look for error messages about reader detection
5. **Restart app** - Sometimes iOS needs a restart to recognize new protocols

### Still Not Working?

1. **Verify Square Stand is compatible** with your iPad model
2. **Check Square Stand firmware** - May need updates
3. **Contact Square support** - May need Apple authorization for your app
4. **Check Square Developer Dashboard** - Verify app configuration

## References

- [Square Stand Setup Guide](https://developer.squareup.com/docs/mobile-payments-sdk/ios/square-stand)
- [External Accessory Framework](https://developer.apple.com/documentation/externalaccessory)

