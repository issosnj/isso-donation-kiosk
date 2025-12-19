# Integrating Square Self-Service Kiosk

## Current Status
The Square SDK was previously disabled due to missing dependencies. Now that the app is running on your iPad, we need to properly integrate with the Square self-service kiosk hardware.

## Step 1: Add Square SDK Package in Xcode

1. **Open the project in Xcode**
   - Open `kiosk-app/ISSOKiosk/ISSOKiosk.xcodeproj`

2. **Add Square Package**
   - Click on the project name (blue icon) in the left sidebar
   - Select the project (not target) in the main area
   - Click **"Package Dependencies"** tab
   - Click the **"+"** button
   - Enter: `https://github.com/square/in-app-payments-ios`
   - Select **"Up to Next Major Version"**
   - Click **"Add Package"**
   - Check **"SquareInAppPaymentsSDK"** in the product list
   - Make sure **"ISSOKiosk"** target is selected
   - Click **"Add Package"**

3. **Verify**
   - You should see "square-in-app-payments-ios" under Package Dependencies

## Step 2: Configure Square Application ID

1. **Get your Square Application ID**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Select your application
   - Copy the Application ID (starts with `sq0idp-`)

2. **Add to Info.plist**
   - Open `ISSOKiosk/Info.plist` in Xcode
   - Add or update:
     ```xml
     <key>SQUARE_APPLICATION_ID</key>
     <string>sq0idp-YOUR_APPLICATION_ID_HERE</string>
     ```

## Step 3: Update Code (Already Done)

The code has been updated to:
- Initialize Square SDK on app launch
- Use Square SDK for payment processing
- Connect to Square self-service kiosk hardware
- Handle card reader interactions (tap/insert)

## Step 4: Test Integration

1. **Build and run** on your iPad
2. **Connect Square Kiosk** hardware to iPad (via USB or Bluetooth)
3. **Test payment flow**:
   - Select donation amount
   - Tap "Ready for Payment"
   - Square SDK should detect the kiosk hardware
   - Process payment when card is tapped/inserted

## Troubleshooting

### If you see "ThreeDS_SDK.framework" errors:
- This is a Square SDK dependency that should be included automatically
- Try: Clean Build Folder (Shift+Cmd+K), then rebuild

### If Square SDK doesn't detect hardware:
- Make sure Square Kiosk is powered on and connected
- Check Square Developer Dashboard for hardware status
- Verify your Square Application ID is correct

### If payment processing fails:
- Check Square location ID is set in temple configuration
- Verify Square OAuth tokens are valid in admin portal
- Check network connection

## Next Steps

Once Square SDK is added and configured:
1. The app will automatically detect Square Kiosk hardware
2. Payment processing will use the actual Square card reader
3. Payments will be processed through your Square account

