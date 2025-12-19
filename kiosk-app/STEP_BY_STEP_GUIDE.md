# Step-by-Step Guide to Fix ThreeDS_SDK Crash and Get App Running

## Current Problem
The app crashes with `ThreeDS_SDK.framework` error because old Square SDK frameworks are cached.

## Step-by-Step Solution

### Step 1: Clean Xcode Build Cache ✅
**Action:** Clean all build artifacts
1. Open `ISSOKiosk.xcodeproj` in Xcode
2. Press `Shift + Command + K` (Product → Clean Build Folder)
3. Wait for it to complete

### Step 2: Delete Derived Data ✅
**Action:** Remove all cached build data
1. In Xcode: **Xcode** → **Settings** (or **Preferences**)
2. Click **Locations** tab
3. Click the arrow (→) next to "Derived Data" path
4. Find folder starting with `ISSOKiosk-`
5. Delete that entire folder
6. Close Xcode completely

### Step 3: Delete App from iPad ✅
**Action:** Remove old app with Square SDK frameworks
1. On your iPad, find the **ISSOKiosk** app
2. Long press the app icon
3. Tap **"Remove App"**
4. Tap **"Delete App"**
5. Confirm deletion

### Step 4: Verify Project File is Clean ✅
**Action:** Ensure no Square SDK references
1. Open `project.pbxproj` in a text editor (or check in Xcode)
2. Search for "Square" - should find nothing
3. Search for "ThreeDS" - should find nothing
4. Search for "in-app-payments" - should find nothing

**If you find any Square references:**
- Remove them (we've already done this, but double-check)

### Step 5: Rebuild from Scratch ✅
**Action:** Build fresh app without Square SDK
1. Reopen Xcode
2. Connect your iPad
3. Select your iPad as target device
4. Build and run (⌘R)
5. App should launch without crash

### Step 6: Test App Functionality ✅
**Action:** Verify app works
1. Enter device activation code (or scan QR)
2. Verify home screen appears
3. Test donation flow (will use backend-only processing temporarily)
4. Verify no crashes

### Step 7: Next Steps (After App Works) 🔮
Once app is running:
1. Find Mobile Payments SDK package URL from Square
2. Add correct SDK package to Xcode
3. Implement Mobile Payments SDK integration
4. Test with Square Stand hardware

---

## Quick Commands

**Clean build script:**
```bash
cd kiosk-app
./FORCE_CLEAN_BUILD.sh
```

**Check for Square references:**
```bash
cd kiosk-app/ISSOKiosk
grep -r "Square" ISSOKiosk.xcodeproj/project.pbxproj
# Should return nothing
```

---

## Verification Checklist

After completing all steps:
- [ ] App builds without errors
- [ ] App launches on iPad
- [ ] No `ThreeDS_SDK` crash
- [ ] Device activation works
- [ ] Home screen displays
- [ ] Donation flow works (backend-only)

---

## If Still Having Issues

1. **Restart Mac** - Clears all caches
2. **Restart iPad** - Clears device caches
3. **Check Xcode version** - Ensure Xcode 15.0+
4. **Check iOS deployment target** - Should be 16.6+
5. **Verify no Square packages** in Xcode Package Dependencies tab

