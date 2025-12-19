# Permanent Fix for ThreeDS_SDK Crash

## The Problem
The app bundle still contains `SquareBuyerVerificationSDK.framework` from a previous build, even though we removed it from the project. This causes the `ThreeDS_SDK.framework` crash.

## Permanent Solution

### Step 1: Clean Build Folder in Xcode
1. Open `ISSOKiosk.xcodeproj` in Xcode
2. Go to **Product** → **Clean Build Folder** (or press `Shift + Command + K`)
3. Wait for it to complete

### Step 2: Delete Derived Data
1. In Xcode, go to **Xcode** → **Settings** → **Locations**
2. Click the arrow next to "Derived Data" path
3. Find the folder for `ISSOKiosk`
4. Delete that entire folder
5. Close Xcode

### Step 3: Delete App from Device
1. On your iPad, find the ISSOKiosk app
2. Long press the app icon
3. Tap "Remove App" → "Delete App"
4. This removes the old app with Square SDK frameworks

### Step 4: Rebuild from Scratch
1. Reopen Xcode
2. Connect your iPad
3. Select your iPad as the target device
4. Build and run (⌘R)

## Verification
After rebuilding, the app should:
- ✅ Build without errors
- ✅ Run without the `ThreeDS_SDK` crash
- ✅ Show the device activation screen
- ✅ Process payments through backend (temporary, until Mobile Payments SDK is added)

## Why This Happens
Xcode caches frameworks in:
- Build products folder
- Derived data
- Device app bundle

Even after removing package references, old frameworks can remain. A clean build removes all cached files.

## If It Still Crashes
1. Check that `project.pbxproj` has NO Square SDK references (we already removed them)
2. Verify no `import Square` statements in code (all are commented out)
3. Try restarting Xcode
4. Try restarting your Mac
5. Rebuild again

