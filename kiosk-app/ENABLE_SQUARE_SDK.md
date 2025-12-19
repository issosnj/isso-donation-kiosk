# Enable Square Mobile Payments SDK

## Step 1: Add Square SDK Package in Xcode

1. **Open Xcode** and open `ISSOKiosk.xcodeproj`

2. **Add Package Dependency:**
   - Click on the project name (blue icon) in left sidebar
   - Select the project (not target) in main area
   - Click **"Package Dependencies"** tab
   - Click **"+"** button
   - Enter: `https://github.com/square/in-app-payments-ios`
   - Select **"Up to Next Major Version"**
   - Click **"Add Package"**
   - Check **"SquareInAppPaymentsSDK"**
   - Make sure **"ISSOKiosk"** target is selected
   - Click **"Add Package"**

3. **Verify:**
   - You should see "square-in-app-payments-ios" under Package Dependencies

## Step 2: Code is Already Updated

The code has been updated to:
- Initialize Square SDK on app launch
- Use backend payment processing (works with Square Kiosk hardware)
- Switch from simulation to real mode

## Step 3: Test

1. Build and run on your iPad
2. Test the payment flow
3. Payments will be processed through backend using Square API

## Note

For Square Kiosk hardware, payments are processed server-side through the backend endpoint we created. The Square Mobile SDK initialization is for future enhancements.

