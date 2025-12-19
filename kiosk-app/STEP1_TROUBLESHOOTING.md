# Step 1 Troubleshooting: LCRCore Framework Issue

## Current Status
✅ Package added to Xcode
❌ App crashes with LCRCore framework missing

## Issue
`LCRCore.framework` is a **transitive dependency** of SquareMobilePaymentsSDK that needs to be embedded, but it's not being included automatically.

## Solutions to Try (In Order)

### Solution 1: Check Frameworks, Libraries, and Embedded Content

**In Xcode:**
1. Select **ISSOKiosk** target
2. Go to **General** tab
3. Scroll to **Frameworks, Libraries, and Embedded Content**
4. Check if `LCRCore.framework` appears in the list
5. If it appears:
   - Ensure it's set to **"Embed & Sign"** (not just "Do Not Embed")
   - If it's missing, click **+** and search for `LCRCore`

### Solution 2: Check Package Products

**In Xcode:**
1. Go to **Project** → **Package Dependencies**
2. Click on `mobile-payments-sdk-ios` package
3. Check what products are available:
   - `SquareMobilePaymentsSDK` ✅ (you have this)
   - `MockReaderUI` ✅ (you have this)
   - `LCRCore` ❓ (check if this exists as a separate product)
4. If `LCRCore` appears as a product:
   - Add it to the target
   - Set to "Embed & Sign"

### Solution 3: Add Build Script Phase

Square SDKs sometimes require a build script to properly embed dependencies.

**Steps:**
1. Select **ISSOKiosk** target
2. Go to **Build Phases** tab
3. Click **+** → **New Run Script Phase**
4. Name it: **"Embed Square Dependencies"**
5. **IMPORTANT:** Drag it to be **LAST** (after "Embed Frameworks" phase)
6. Add this script:

```bash
# Embed Square Mobile Payments SDK dependencies
FRAMEWORKS_DIR="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}"
SQUARE_FRAMEWORK="${FRAMEWORKS_DIR}/SquareMobilePaymentsSDK.framework"

if [ -d "$SQUARE_FRAMEWORK" ]; then
    echo "[Build Script] Found SquareMobilePaymentsSDK.framework"
    
    # Check for LCRCore inside SquareMobilePaymentsSDK framework
    LCRCORE_INTERNAL="${SQUARE_FRAMEWORK}/Frameworks/LCRCore.framework"
    if [ -d "$LCRCORE_INTERNAL" ]; then
        echo "[Build Script] Found LCRCore.framework inside SquareMobilePaymentsSDK"
        # Copy to main Frameworks directory
        cp -R "$LCRCORE_INTERNAL" "${FRAMEWORKS_DIR}/"
        echo "[Build Script] Copied LCRCore.framework to Frameworks"
    fi
    
    # Check for setup script
    SETUP_SCRIPT="${SQUARE_FRAMEWORK}/setup"
    if [ -f "$SETUP_SCRIPT" ]; then
        echo "[Build Script] Running Square SDK setup script..."
        "$SETUP_SCRIPT"
    fi
fi
```

7. **Uncheck:** "Show environment variables in build log" (optional, cleaner output)
8. **Uncheck:** "Run script only when installing" (we want it every build)

### Solution 4: Try Different SDK Version

The LCRCore issue might be version-specific.

**Steps:**
1. **Remove current package:**
   - Project → Package Dependencies
   - Right-click `mobile-payments-sdk-ios` → Remove

2. **Clean build:**
   - Product → Clean Build Folder (Shift + Command + K)
   - Delete Derived Data:
     - Xcode → Settings → Locations
     - Click arrow next to Derived Data
     - Delete `ISSOKiosk-*` folder

3. **Re-add with specific version:**
   - File → Add Package Dependencies
   - URL: `https://github.com/square/mobile-payments-sdk-ios`
   - **Version:** Select **"Up to Next Major Version"** with `2.3.1`
   - Or try **"Exact Version"** `2.3.1`
   - Add only `SquareMobilePaymentsSDK` (not MockReaderUI initially)

### Solution 5: Check Package Structure Manually

**Steps:**
1. Navigate to Derived Data:
   ```
   ~/Library/Developer/Xcode/DerivedData/ISSOKiosk-*/SourcePackages/checkouts/mobile-payments-sdk-ios/
   ```

2. Look for:
   - `LCRCore.framework` directory
   - `Package.swift` (check dependencies)

3. If LCRCore exists:
   - It might need to be manually added
   - Or the package structure might be incorrect

### Solution 6: Contact Square Support

If none of the above work, this might be:
- A known issue with the SDK version
- A configuration issue
- A bug in the package

**Contact Square with:**
- SDK version: `2.4.0` (or whatever you're using)
- Xcode version
- iOS deployment target: `16.6`
- Error: `LCRCore.framework missing`
- Package URL: `https://github.com/square/mobile-payments-sdk-ios`

## Recommended Order

1. **Try Solution 1** (check Frameworks list) - 2 minutes
2. **Try Solution 2** (check package products) - 2 minutes
3. **Try Solution 3** (build script) - 5 minutes
4. **Try Solution 4** (different version) - 10 minutes
5. **Try Solution 5** (manual check) - 5 minutes
6. **Try Solution 6** (contact Square) - if all else fails

## After Fixing

Once LCRCore is resolved:
1. ✅ Build succeeds
2. ✅ App launches without crash
3. ✅ Step 1 complete
4. ⏳ Proceed to Step 2 (Import SDK in code)

## Quick Test

After trying each solution:
- Build project (⌘B)
- Run on iPad
- Check if crash is gone
- If still crashing, try next solution

