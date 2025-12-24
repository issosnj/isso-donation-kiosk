# CocoaPods Setup for SquarePointOfSaleSDK

## Step 1: Install CocoaPods

Run this command in Terminal:
```bash
sudo gem install cocoapods
```

You'll be prompted for your password. After installation, verify it worked:
```bash
pod --version
```

## Step 2: Install SquarePointOfSaleSDK

Navigate to the iOS project directory:
```bash
cd kiosk-app/ISSOKiosk
```

Install the pod:
```bash
pod install
```

This will:
- Download SquarePointOfSaleSDK
- Create `ISSOKiosk.xcworkspace`
- Update your project to use CocoaPods

## Step 3: Open Workspace (Not Project!)

**IMPORTANT:** After running `pod install`, you must open the **workspace**, not the project:

```bash
open ISSOKiosk.xcworkspace
```

Or in Xcode: File → Open → Select `ISSOKiosk.xcworkspace` (NOT `ISSOKiosk.xcodeproj`)

## Step 4: Build and Test

The SquarePointOfSaleSDK should now be available. The code in `SquarePOSPaymentService.swift` should compile.

## Troubleshooting

If you get errors:
1. Make sure you opened the `.xcworkspace` file, not `.xcodeproj`
2. Try: `pod repo update` then `pod install` again
3. Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)

## To Remove CocoaPods Later

If you want to go back to just Swift Package Manager:
```bash
cd kiosk-app/ISSOKiosk
pod deintegrate
rm Podfile Podfile.lock
```

