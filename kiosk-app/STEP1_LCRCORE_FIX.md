# Step 1 Issue: LCRCore Framework Missing

## Problem
After adding Square Mobile Payments SDK package, app crashes with:
```
dyld: Library not loaded: @rpath/LCRCore.framework/LCRCore
```

## Root Cause
`LCRCore.framework` is a **transitive dependency** of SquareMobilePaymentsSDK that needs to be properly embedded, but it's not being included automatically.

## Solution Options

### Option A: Check if LCRCore Product Exists (Try First)

1. **In Xcode:**
   - Select **ISSOKiosk** target
   - Go to **General** tab
   - Scroll to **Frameworks, Libraries, and Embedded Content**
   - Click **+** button
   - Look for **LCRCore** in the list
   - If found, add it and set to **Embed & Sign**

2. **Check Package Products:**
   - Project → Package Dependencies
   - Click on `mobile-payments-sdk-ios`
   - Check if `LCRCore` appears as a separate product
   - If yes, add it to the target

### Option B: Add Build Script (If Option A Doesn't Work)

Square SDKs sometimes require a build script to properly embed dependencies.

1. **In Xcode:**
   - Select **ISSOKiosk** target
   - Go to **Build Phases** tab
   - Click **+** → **New Run Script Phase**
   - Name it: **"Embed Square Frameworks"**
   - Drag it to be **LAST** in the list (after "Embed Frameworks")
   - Add this script:

```bash
# Embed Square Mobile Payments SDK and dependencies
FRAMEWORKS_DIR="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}"

# Check if SquareMobilePaymentsSDK exists
if [ -d "${FRAMEWORKS_DIR}/SquareMobilePaymentsSDK.framework" ]; then
    echo "Found SquareMobilePaymentsSDK.framework"
    
    # Look for setup script in the framework
    SETUP_SCRIPT="${FRAMEWORKS_DIR}/SquareMobilePaymentsSDK.framework/setup"
    if [ -f "$SETUP_SCRIPT" ]; then
        echo "Running Square SDK setup script..."
        "$SETUP_SCRIPT"
    fi
    
    # Check for LCRCore in the framework's Frameworks directory
    LCRCORE_PATH="${FRAMEWORKS_DIR}/SquareMobilePaymentsSDK.framework/Frameworks/LCRCore.framework"
    if [ -d "$LCRCORE_PATH" ]; then
        echo "Found LCRCore.framework in SquareMobilePaymentsSDK"
        # Copy LCRCore to main Frameworks directory
        cp -R "$LCRCORE_PATH" "${FRAMEWORKS_DIR}/"
        echo "Copied LCRCore.framework to Frameworks directory"
    fi
fi
```

### Option C: Check Package Version

The LCRCore issue might be version-specific. Try:

1. **Check current version:**
   - Project → Package Dependencies
   - See what version is installed

2. **Try different version:**
   - Remove current package
   - Re-add with specific version: `2.3.1` (known stable)
   - Or try latest version

### Option D: Manual Framework Embedding

If LCRCore exists in the package but isn't being linked:

1. **Find LCRCore in package:**
   - Navigate to: `~/Library/Developer/Xcode/DerivedData/ISSOKiosk-*/SourcePackages/checkouts/mobile-payments-sdk-ios/`
   - Look for `LCRCore.framework`

2. **If found, manually add:**
   - Drag `LCRCore.framework` to project
   - Add to target
   - Set to "Embed & Sign"

## Recommended Steps

1. **First:** Try Option A (check if LCRCore appears in Xcode)
2. **Second:** Try Option B (add build script)
3. **Third:** Try Option C (different version)
4. **Last:** Contact Square Support

## Next Steps After Fix

Once LCRCore is resolved:
- ✅ Step 1 complete
- ⏳ Proceed to Step 2 (Import SDK in code)

## Current Status

- ⏳ **Step 1:** Package added, but LCRCore issue blocking
- ⏳ **Steps 2-10:** Waiting for Step 1 resolution

