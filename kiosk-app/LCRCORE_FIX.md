# LCRCore Framework Missing - Fix Guide

## Problem
The Square Mobile Payments SDK requires `LCRCore.framework` which is not being included in the build, causing the app to crash on launch.

## Error
```
dyld: Library not loaded: @rpath/LCRCore.framework/LCRCore
Referenced from: SquareMobilePaymentsSDK.framework
```

## Temporary Fix (App Working)
I've temporarily commented out the Square SDK import so the app can launch. The app will work but payments will go through the backend.

## Permanent Fix

### Option 1: Add Required Build Script (Recommended)

Square Mobile Payments SDK may require a build script to properly embed frameworks. 

**Steps:**
1. Open Xcode project
2. Select **ISSOKiosk** target
3. Go to **Build Phases** tab
4. Click **+** → **New Run Script Phase**
5. Name it "Embed Square Frameworks"
6. Add this script:
```bash
# Embed Square Mobile Payments SDK frameworks
if [ -d "${BUILT_PRODUCTS_DIR}/SquareMobilePaymentsSDK.framework" ]; then
    "${BUILT_PRODUCTS_DIR}/SquareMobilePaymentsSDK.framework/embed_frameworks.sh"
fi
```

**OR** check Square's documentation for the exact build script they require.

### Option 2: Re-add Package with Correct Configuration

1. **Remove current package:**
   - Project → Package Dependencies
   - Remove `mobile-payments-sdk-ios`

2. **Clean build:**
   - Product → Clean Build Folder (Shift + Command + K)
   - Delete Derived Data

3. **Re-add package:**
   - File → Add Package Dependencies
   - URL: `https://github.com/square/mobile-payments-sdk-ios`
   - Version: `2.3.1` (or latest)
   - **IMPORTANT:** Make sure to add ALL required products, not just `SquareMobilePaymentsSDK`
   - Check if there's a `LCRCore` product that needs to be added

### Option 3: Check Package Dependencies

The `LCRCore.framework` might be a transitive dependency that needs to be explicitly linked:

1. Select **ISSOKiosk** target
2. Go to **General** tab
3. Scroll to **Frameworks, Libraries, and Embedded Content**
4. Check if `LCRCore` appears - if so, ensure it's set to **Embed & Sign**

### Option 4: Contact Square Support

If the above don't work, this might be a known issue with the SDK version or configuration. Contact Square Developer Support with:
- SDK version: `2.3.1`
- Xcode version
- iOS deployment target
- Error message about `LCRCore.framework`

## Current Status

✅ **App is working** (Square SDK temporarily disabled)
⏳ **Square SDK integration pending** (waiting for LCRCore fix)

## Next Steps

1. Try Option 1 (Build Script) first
2. If that doesn't work, try Option 2 (Re-add package)
3. Check Square's latest iOS documentation for any updates
4. Once fixed, uncomment the import in `SquareMobilePaymentsService.swift`

## References

- [Square Mobile Payments SDK iOS Docs](https://developer.squareup.com/docs/mobile-payments-sdk/ios)
- [Square Developer Support](https://developer.squareup.com/help)

