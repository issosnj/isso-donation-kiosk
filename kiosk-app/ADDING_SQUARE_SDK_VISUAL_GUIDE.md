# Visual Guide: Adding Square SDK to Xcode Project

This is a step-by-step visual guide to help you add the Square In-App Payments SDK to your Xcode project.

## Step-by-Step with Screenshots

### Step 1: Open Your Project
1. **If you have `ISSOKiosk.xcodeproj`**:
   - Open Finder and navigate to: `kiosk-app` folder
   - Double-click `ISSOKiosk.xcodeproj`
   - Wait for Xcode to open and load the project
   
2. **If you don't have the project yet**:
   - See `CREATE_XCODE_PROJECT.md` first to create the Xcode project
   - Then come back here to add the Square SDK

### Step 2: Navigate to Package Dependencies
1. In Xcode's left sidebar, click on the **blue project icon** at the very top (this is your project, not a folder)
2. In the main editor area, you'll see project settings
3. Look for tabs at the top: **General**, **Signing & Capabilities**, **Build Settings**, etc.
4. Click on the **"Package Dependencies"** tab

**What you should see:**
- A list of any existing package dependencies (might be empty)
- A **"+"** button at the bottom left of the list

### Step 3: Add New Package
1. Click the **"+"** button at the bottom left
2. A dialog window will appear with a search field at the top

### Step 4: Enter Package URL
1. In the search field, paste this exact URL:
   ```
   https://github.com/square/in-app-payments-ios
   ```
2. Press **Enter** or wait a few seconds
3. Xcode will fetch the package information

**What you should see:**
- The package "square/in-app-payments-ios" appears in the results
- Package details show on the right side
- A "Dependency Rule" dropdown appears

### Step 5: Select Version
1. In the "Dependency Rule" dropdown, you'll see options:
   - **Up to Next Major Version** (recommended - automatically gets updates)
   - **Up to Next Minor Version**
   - **Exact Version** (requires manual updates)
   - **Branch** or **Commit** (for specific versions)
2. Select **"Up to Next Major Version"** (this is the default and recommended)
3. Click the **"Add Package"** button in the bottom right

### Step 6: Select Products to Add
1. A new dialog appears showing available products from the Square SDK
2. You'll see a list with checkboxes:
   - ☐ **SquareInAppPaymentsSDK** (this is what you need)
3. Check the box next to **SquareInAppPaymentsSDK**
4. On the right side, under "Add to targets", make sure your app target is checked:
   - ☑ **ISSOKiosk** (or whatever your target name is)
5. Click **"Add Package"** button

### Step 7: Wait for Installation
1. Xcode will download and integrate the package
2. You'll see a progress indicator
3. This may take 30 seconds to a few minutes depending on your internet speed

### Step 8: Verify Installation
1. In the left sidebar, expand your project (click the arrow next to the blue icon)
2. Look for a new section called **"Package Dependencies"**
3. Expand it - you should see:
   - **square-in-app-payments-ios**
4. If you see this, the package was successfully added! ✅

## Alternative Method: Using File Menu

If you can't find the Package Dependencies tab, try this:

1. In Xcode menu bar, click **File**
2. Select **Add Packages...**
3. In the search field, paste: `https://github.com/square/in-app-payments-ios`
4. Follow steps 4-8 from above

## Troubleshooting

### Can't find "Package Dependencies" tab?
- Make sure you clicked on the **project** (blue icon), not a folder or file
- The tabs appear in the main editor area when the project is selected

### Package not found?
- Check your internet connection
- Verify the URL is exactly: `https://github.com/square/in-app-payments-ios`
- Try again - sometimes it takes a moment

### "Add Package" button is grayed out?
- Make sure you've entered a valid URL
- Wait for Xcode to finish fetching package information

### Package appears but can't use it?
- Clean your build: **Product > Clean Build Folder** (⇧⌘K)
- Close and reopen Xcode
- Build the project: **Product > Build** (⌘B)

## Next Steps

After successfully adding the package:
1. Update `Info.plist` with your Square Application ID
2. Initialize the SDK in your app (see main integration guide)
3. Update `SquarePaymentService.swift` with the actual SDK code

## Need More Help?

- Check the main guide: `SQUARE_SDK_INTEGRATION.md`
- Square Documentation: https://developer.squareup.com/docs/in-app-payments-sdk/overview

