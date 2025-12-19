# Quick Setup: If You Opened the Folder in Xcode

If you opened the `ISSOKiosk` folder directly in Xcode (File > Open), Xcode might be treating it as a folder or Swift Package, but you need a proper iOS App project to build and run on iPad.

## Check What Xcode Shows

Look at the top of Xcode's window:
- **If you see a scheme/target selector** (like "ISSOKiosk > My Mac" or "ISSOKiosk > iPad") → You might have a project!
- **If you just see files in the navigator** → You need to create a project

## What You Need to Do

### Option 1: Create New Project (Recommended)

1. **Keep Xcode open** with the folder
2. Go to **File > New > Project...** (or ⌘⇧N)
3. Follow these steps:
   - Select **iOS** → **App**
   - Click **Next**
   - **Product Name**: `ISSOKiosk`
   - **Team**: Your team (or None)
   - **Organization Identifier**: `com.issosnj`
   - **Interface**: **SwiftUI**
   - **Language**: **Swift**
   - **Storage**: **None**
   - Click **Next**
   - **IMPORTANT**: Navigate to `/Users/mitpatel/Documents/isso-donation-kiosk/kiosk-app/`
   - **Uncheck** "Create Git repository"
   - Click **Create**

4. **Replace the default files**:
   - Delete the default `ContentView.swift` Xcode created
   - Delete the default `ISSOKioskApp.swift` Xcode created (if it exists)
   - Right-click on the project → **Add Files to ISSOKiosk...**
   - Navigate to the `ISSOKiosk` folder
   - Select ALL files and folders:
     - All `.swift` files
     - `Info.plist`
     - `Helpers/` folder
     - `Services/` folder
     - `Views/` folder
   - Make sure **"Copy items if needed"** is **UNCHECKED**
   - Make sure **"Create groups"** is selected
   - Click **Add**

5. **Configure the project**:
   - Click the blue project icon in left sidebar
   - Select **ISSOKiosk** target
   - **General** tab:
     - **Deployment Target**: iOS 16.0
     - **Supported Destinations**: iPad (or iPhone + iPad)
   - **Build Settings**:
     - Search "Swift Language Version" → Set to **Swift 5.9**

6. **Test build**: Press **⌘B** to build

### Option 2: Use Swift Package (Limited)

If Xcode opened it as a Swift Package (you see Package.swift), you can:
1. Add an app target to the package
2. But this is more complex and not recommended for iOS apps

## After Creating the Project

Once you have `ISSOKiosk.xcodeproj`:

1. **Add Square SDK**:
   - Follow `ADDING_SQUARE_SDK_VISUAL_GUIDE.md`
   - Or: Project → Package Dependencies → + → `https://github.com/square/in-app-payments-ios`

2. **Update Info.plist**:
   - Add your Square Application ID

3. **Build and Run**:
   - Connect iPad
   - Select iPad as target
   - Press **⌘R**

## Quick Checklist

- [ ] Created new iOS App project in Xcode
- [ ] Added all existing Swift files to the project
- [ ] Set deployment target to iOS 16.0
- [ ] Project builds without errors (⌘B)
- [ ] Added Square SDK package
- [ ] Updated Info.plist with Square Application ID
- [ ] Can build and run on iPad

## Need Help?

If you're stuck:
1. Check `CREATE_XCODE_PROJECT.md` for detailed steps
2. Make sure all Swift files are added to the target
3. Check Build Phases → Compile Sources includes all files

