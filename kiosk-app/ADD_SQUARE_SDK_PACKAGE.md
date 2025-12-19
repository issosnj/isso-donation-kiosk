# Add Square SDK Package to Xcode Project

## Quick Steps:

1. **Open Xcode**
   - Open `kiosk-app/ISSOKiosk/ISSOKiosk.xcodeproj`

2. **Add Package Dependency:**
   - In the left sidebar, click on the **blue project icon** at the top (ISSOKiosk)
   - In the main editor area, make sure the **project** is selected (not the target)
   - Click on the **"Package Dependencies"** tab at the top
   - Click the **"+"** button at the bottom left

3. **Enter Package URL:**
   - In the search field, paste: `https://github.com/square/in-app-payments-ios`
   - Press Enter
   - Wait for Xcode to fetch the package

4. **Select Version:**
   - In the "Dependency Rule" dropdown, select **"Up to Next Major Version"**
   - Or select a specific version if you prefer

5. **Add to Target:**
   - Click **"Add Package"** button
   - A dialog will show available products
   - Check the box next to **"SquareInAppPaymentsSDK"**
   - Make sure **"ISSOKiosk"** is selected in the "Add to targets" column
   - Click **"Add Package"** again

6. **Verify:**
   - In the left sidebar, you should see a new section **"Package Dependencies"**
   - Expand it to see **"square-in-app-payments-ios"**
   - If you see it, the package was added successfully!

7. **Uncomment Square SDK Code:**
   - After the package is added, uncomment the Square SDK import in `ISSOKioskApp.swift`
   - Change line 2 from: `// import SquareInAppPaymentsSDK`
   - To: `import SquareInAppPaymentsSDK`
   - Also uncomment the initialization code in the `init()` method

8. **Build:**
   - Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
   - Build: Product → Build (Cmd+B)
   - The error should be gone!

## Troubleshooting:

- **If package doesn't appear:** Make sure you have internet connection
- **If build fails:** Try cleaning build folder and rebuilding
- **If still errors:** Make sure the package is added to the correct target (ISSOKiosk)

