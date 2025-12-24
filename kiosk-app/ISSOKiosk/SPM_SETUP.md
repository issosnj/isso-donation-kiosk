# Swift Package Manager Setup for SquarePointOfSaleSDK

According to the [official SquarePointOfSaleSDK-iOS repository](https://github.com/square/SquarePointOfSaleSDK-iOS), the SDK supports Swift Package Manager (SPM), which is the easiest way to add it to your project.

## Step 1: Add Package via Xcode

1. **Open your project in Xcode:**
   ```bash
   open ISSOKiosk.xcodeproj
   ```

2. **Add the Package:**
   - In Xcode, go to: **File → Add Package Dependencies...**
   - Enter the package URL:
     ```
     https://github.com/square/SquarePointOfSaleSDK-iOS
     ```
   - Click **Add Package**
   - Select the **SquarePointOfSaleSDK** product
   - Click **Add Package**

   **Note:** If you're prompted for a GitHub token, you can:
   - Use a public repository token (if required by your organization)
   - Or use CocoaPods as an alternative (see COCOAPODS_SETUP.md)

3. **Verify the Package:**
   - In Xcode, go to: **File → Package Dependencies**
   - You should see `SquarePointOfSaleSDK-iOS` listed

## Step 2: Verify Info.plist Configuration

The `Info.plist` has been updated with:
- ✅ URL Scheme: `issokiosk://payment-callback`
- ✅ LSApplicationQueriesSchemes: `square-commerce-v1`

## Step 3: Register App with Square

1. Go to [Square Developer Portal](https://developer.squareup.com)
2. Navigate to your application
3. Go to **Point of Sale API** tab
4. Add:
   - **Bundle Identifier**: Your app's bundle ID (e.g., `com.isso.donationkiosk`)
   - **URL Scheme**: `issokiosk`
5. Click **Save**

## Step 4: Build and Test

The code in `SquarePOSPaymentService.swift` should now compile. The service will:
- Launch Square Point of Sale app when payment is initiated
- Handle callbacks when payment completes
- Return to your app automatically

## Troubleshooting

**If SPM fails:**
- Try using CocoaPods instead (see `COCOAPODS_SETUP.md`)
- Make sure you have internet connection
- Check Xcode → Preferences → Accounts if using private repos

**If Square POS app doesn't open:**
- Verify `LSApplicationQueriesSchemes` includes `square-commerce-v1` in Info.plist
- Make sure Square Point of Sale app is installed on the device
- Check that the URL scheme is registered in Square Developer Portal

**If callback doesn't work:**
- Verify URL scheme in Info.plist matches Square Developer Portal
- Check that `AppDelegate` is properly set up (already done)
- Ensure `ISSOKioskApp.swift` uses `@UIApplicationDelegateAdaptor(AppDelegate.self)`

## Current Implementation Status

✅ `SquarePOSPaymentService.swift` - Ready to use  
✅ `AppDelegate.swift` - Handles URL callbacks  
✅ `Info.plist` - Configured with URL scheme and queries  
✅ `SquarePaymentService.swift` - Routes to POS SDK  

The Mobile Payments SDK code is preserved but commented out for easy rollback.

