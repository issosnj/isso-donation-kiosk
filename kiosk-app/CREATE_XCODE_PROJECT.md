# Creating the Xcode Project

Since the project currently only has Swift source files, you need to create an Xcode project. Follow these steps:

## Method 1: Create New Xcode Project (Recommended)

### Step 1: Open Xcode
1. Open **Xcode** (from Applications or Spotlight)
2. If you see a welcome screen, click **"Create a new Xcode project"**
   - OR go to **File > New > Project...**

### Step 2: Choose Template
1. Select **iOS** at the top
2. Choose **App** template
3. Click **Next**

### Step 3: Configure Project
Fill in the project details:
- **Product Name**: `ISSOKiosk`
- **Team**: Select your Apple Developer team (or leave as "None" for now)
- **Organization Identifier**: `com.issosnj` (or your preferred identifier)
- **Bundle Identifier**: Will auto-fill as `com.issosnj.ISSOKiosk`
- **Interface**: **SwiftUI**
- **Language**: **Swift**
- **Storage**: **None** (we'll add our own)
- **Include Tests**: Uncheck (optional)

Click **Next**

### Step 4: Save Location
1. Navigate to: `/Users/mitpatel/Documents/isso-donation-kiosk/kiosk-app/`
2. **IMPORTANT**: Uncheck **"Create Git repository"** (you already have one)
3. Click **Create**

### Step 5: Replace Default Files
Xcode will create a new project. Now you need to replace/add your existing files:

1. **Delete the default ContentView.swift** that Xcode created
2. **Delete the default ISSOKioskApp.swift** that Xcode created (if it exists)

3. **Add your existing files**:
   - Right-click on the project in the left sidebar
   - Select **"Add Files to ISSOKiosk..."**
   - Navigate to the `ISSOKiosk` folder
   - Select ALL the Swift files and folders:
     - `AppState.swift`
     - `Config.swift`
     - `ContentView.swift`
     - `ISSOKioskApp.swift`
     - `Info.plist`
     - `Helpers/` folder
     - `Services/` folder
     - `Views/` folder
   - Make sure **"Copy items if needed"** is **UNCHECKED** (files are already in the right place)
   - Make sure **"Create groups"** is selected
   - Click **Add**

### Step 6: Configure Info.plist
1. In Xcode, find `Info.plist` in the project navigator
2. If Xcode created a new one, delete it and use the one from your `ISSOKiosk` folder
3. Make sure it's added to your target

### Step 7: Set Build Settings
1. Click on your project (blue icon) in the left sidebar
2. Select your **ISSOKiosk** target
3. Go to **General** tab:
   - **Deployment Target**: iOS 16.0
   - **Supported Destinations**: iPhone and iPad (or just iPad for kiosk)
4. Go to **Build Settings** tab:
   - Search for "Swift Language Version"
   - Set to **Swift 5.9** or latest

### Step 8: Set Main Entry Point
1. In **Build Settings**, search for "Info.plist File"
2. Make sure it points to: `ISSOKiosk/Info.plist`
3. In **General** tab, under **App Icons and Launch Screen**, set:
   - **Launch Screen File**: Leave empty or create one

### Step 9: Test Build
1. Press **⌘B** to build
2. Fix any import or path issues if they appear

## Method 2: Open Package.swift in Xcode (Alternative)

If you prefer to use Swift Package Manager:

1. Open Xcode
2. Go to **File > Open...**
3. Navigate to `kiosk-app` folder
4. Select `Package.swift`
5. Click **Open**

However, this won't give you a full iOS app project - you'll need to create an app target separately.

## After Creating the Project

Once you have the Xcode project set up:

1. **Add Square SDK** (follow `ADDING_SQUARE_SDK_VISUAL_GUIDE.md`)
2. **Configure Info.plist** with your Square Application ID
3. **Build and run** on your iPad

## Troubleshooting

### "No such module" errors
- Make sure all files are added to the target
- Check Build Phases > Compile Sources includes all Swift files

### Info.plist not found
- Make sure Info.plist is in the project and added to target
- Check Build Settings > Info.plist File path

### App won't launch
- Check that `ISSOKioskApp.swift` has `@main` attribute
- Verify the app target's "Main Interface" is empty (using SwiftUI)

## Next Steps

After creating the project:
1. Follow `ADDING_SQUARE_SDK_VISUAL_GUIDE.md` to add Square SDK
2. Update `Info.plist` with your Square Application ID
3. Build and test!

