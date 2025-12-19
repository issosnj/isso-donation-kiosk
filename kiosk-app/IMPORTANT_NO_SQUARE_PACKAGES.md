# ⚠️ CRITICAL: DO NOT ADD SQUARE PACKAGES IN XCODE

## The Problem
Xcode keeps automatically re-adding the Square In-App Payments SDK package (`https://github.com/square/in-app-payments-ios`) when it resolves package dependencies. This causes the `ThreeDS_SDK.framework` crash.

## Why This Happens
- Xcode's package resolver automatically adds packages it finds referenced
- The old package URL is cached somewhere
- Xcode thinks the project needs these packages

## PERMANENT SOLUTION

### ✅ What We've Done
1. Removed ALL Square SDK references from `project.pbxproj`
2. No package dependencies
3. No framework links
4. All Square imports are commented out in code

### ⚠️ IMPORTANT: What NOT to Do
**DO NOT:**
- Add any Square packages in Xcode Package Dependencies tab
- Click "Resolve Package Versions" if Xcode suggests it
- Add `https://github.com/square/in-app-payments-ios` as a package
- Accept any Xcode suggestions to add Square packages

### ✅ What TO Do
1. **Delete app from iPad** (removes old frameworks)
2. **Clean build folder** in Xcode (Shift+Cmd+K)
3. **Delete Derived Data** (Xcode → Settings → Locations → Derived Data)
4. **Rebuild** (Cmd+R)

### 🔮 Future: Mobile Payments SDK
When we're ready to add the **correct** Mobile Payments SDK:
1. Find the official Mobile Payments SDK package URL from Square
2. It will be DIFFERENT from `in-app-payments-ios`
3. Add it manually in Xcode
4. The package name will be different (not SquareInAppPaymentsSDK)

## Current Status
- ✅ Project file is clean (no Square SDK references)
- ✅ Code has no Square SDK imports (all commented)
- ✅ App uses backend-only payment processing (temporary)
- ⏳ Waiting for Mobile Payments SDK package URL

## If Xcode Re-adds Packages
If you see Square packages appear again:
1. Close Xcode
2. Run: `./FORCE_CLEAN_BUILD.sh`
3. Remove packages from `project.pbxproj` again
4. Reopen Xcode
5. Build without resolving packages

