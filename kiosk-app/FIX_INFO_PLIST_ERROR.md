# Fix Info.plist Duplicate Error

## The Problem
Xcode is trying to both:
1. Process Info.plist as the app's Info.plist file (correct)
2. Copy Info.plist as a bundle resource (incorrect - causes duplicate error)

## Solution: Remove Info.plist from Copy Bundle Resources

### Step-by-Step Instructions:

1. **Open the project in Xcode**
   - Navigate to: `kiosk-app/ISSOKiosk/ISSOKiosk.xcodeproj`
   - Double-click to open

2. **Select the Target**
   - In the Project Navigator (left sidebar), click on the blue **ISSOKiosk** project icon at the top
   - In the main editor area, you'll see "TARGETS" section
   - Click on **ISSOKiosk** (the target, not the project)

3. **Go to Build Phases**
   - Click on the **Build Phases** tab at the top

4. **Find Copy Bundle Resources**
   - Scroll down to find the **Copy Bundle Resources** section
   - Click the triangle to expand it

5. **Remove Info.plist**
   - Look for **Info.plist** in the list
   - If you see it, click on it to select it
   - Click the **minus (-)** button at the bottom left of the section
   - Confirm if asked

6. **Clean and Build**
   - Go to **Product** menu → **Clean Build Folder** (or press **Shift+Cmd+K**)
   - Then **Product** → **Build** (or press **Cmd+B**)

## Alternative: If Info.plist doesn't appear in Copy Bundle Resources

If you don't see Info.plist in Copy Bundle Resources but still get the error, try:

1. **Check Build Settings**
   - With the target selected, go to **Build Settings** tab
   - Search for "Info.plist File"
   - Make sure it says: `ISSOKiosk/Info.plist`
   - Search for "Generate Info.plist File"
   - Make sure it says: **NO**

2. **Clean Derived Data**
   - Close Xcode
   - Open Terminal and run:
     ```bash
     rm -rf ~/Library/Developer/Xcode/DerivedData/ISSOKiosk-*
     ```
   - Reopen Xcode and try building again

## Why This Happens

With modern Xcode projects using `PBXFileSystemSynchronizedRootGroup`, all files in the directory are automatically included. Info.plist gets included both:
- As the Info.plist file (via `INFOPLIST_FILE` setting) ✅
- As a bundle resource (automatically by the synchronized group) ❌

Removing it from Copy Bundle Resources fixes the duplicate.

