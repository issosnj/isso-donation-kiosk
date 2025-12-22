# MDM Deployment Guide for ISSO Donation Kiosk

This guide covers deploying the ISSO Donation Kiosk app as a private/internal app through Mobile Device Management (MDM).

## Prerequisites

### 1. Apple Developer Account
- **Enterprise Program** (recommended for internal-only apps)
  - Cost: $299/year
  - Allows unlimited internal distribution
  - No App Store review required
  - Requires D-U-N-S number
  
- **Standard Developer Program** (alternative)
  - Cost: $99/year
  - Can use Ad Hoc or Custom App Distribution
  - Limited to 100 devices per year (Ad Hoc)
  - Custom App Distribution requires App Store Connect (but can be private)

### 2. MDM Solution
You'll need an MDM provider such as:
- **Jamf Pro** (enterprise-grade)
- **Microsoft Intune**
- **SimpleMDM**
- **Mosyle**
- **Apple Business Manager** (for volume purchase)

### 3. Current App Configuration
- **Bundle Identifier**: `com.mitpatel.ISSOKiosk`
- **Version**: 1.0
- **Build**: 1
- **Minimum iOS**: 16.0
- **Target Device**: iPad

## Deployment Steps

### Step 1: Configure Xcode Project

1. **Open Project**
   ```bash
   cd kiosk-app/ISSOKiosk
   open ISSOKiosk.xcodeproj
   ```

2. **Set Bundle Identifier**
   - Select project in Navigator
   - Select target "ISSOKiosk"
   - Go to "Signing & Capabilities"
   - Set Bundle Identifier (e.g., `com.yourorganization.ISSOKiosk`)
   - ⚠️ **Important**: Use your organization's domain, not personal

3. **Configure Signing**
   - **For Enterprise**: Select "Automatically manage signing" with Enterprise account
   - **For Standard**: Select your team and provisioning profile
   - Ensure "iPad" is selected in Deployment Info

4. **Update Version Numbers** (if needed)
   - In Info.plist or Build Settings:
     - `CFBundleShortVersionString`: Version (e.g., "1.0")
     - `CFBundleVersion`: Build number (increment for each build)

### Step 2: Build for Distribution

1. **Select Archive Scheme**
   - Product → Scheme → Edit Scheme
   - Set "Archive" configuration to "Release"
   - Select "Any iOS Device" as destination

2. **Create Archive**
   - Product → Archive
   - Wait for build to complete
   - Organizer window will open

3. **Export for Distribution**
   - In Organizer, select your archive
   - Click "Distribute App"
   - Choose distribution method:
     - **Enterprise**: "Enterprise Distribution"
     - **Standard**: "Ad Hoc" or "Custom App Distribution"

### Step 3: Enterprise Distribution (Recommended)

1. **Export Options**
   - Select "Enterprise Distribution"
   - Choose your Enterprise provisioning profile
   - Export to folder

2. **Output Files**
   - You'll get:
     - `ISSOKiosk.ipa` (the app)
     - `DistributionSummary.plist` (metadata)
     - `ExportOptions.plist` (export settings)

3. **Upload to MDM**
   - Upload the `.ipa` file to your MDM solution
   - Configure app assignment to target iPads
   - Set installation policies

### Step 4: Standard Developer Program (Alternative)

#### Option A: Ad Hoc Distribution
- Limited to 100 devices per year
- Requires device UDIDs registered in Apple Developer Portal
- Export as "Ad Hoc" distribution
- Upload `.ipa` to MDM

#### Option B: Custom App Distribution
- Requires App Store Connect setup
- App can be private (not publicly searchable)
- Distribution through MDM via App Store Connect
- More complex but scalable

### Step 5: MDM Configuration

1. **Upload App**
   - Upload the `.ipa` file to your MDM console
   - Provide app metadata:
     - Name: "ISSO Donation Kiosk"
     - Version: 1.0
     - Bundle ID: `com.mitpatel.ISSOKiosk` (or your custom ID)

2. **Configure Installation**
   - Assign to device groups (all kiosk iPads)
   - Set installation policy:
     - **Automatic**: Install immediately
     - **On-demand**: User installs when needed
   - Configure update policy (auto-update or manual)

3. **App Configuration** (if needed)
   - Some MDMs support app configuration payloads
   - Can pre-configure settings via MDM

### Step 6: Testing

1. **Test Installation**
   - Install on one test iPad first
   - Verify:
     - App launches correctly
     - Device activation works
     - Square SDK connection works
     - All features function properly

2. **Test Updates**
   - Create new build with incremented version
   - Test update process through MDM
   - Ensure no data loss during update

## Important Considerations

### 1. Provisioning Profile Expiration
- **Enterprise**: Valid for 1 year, then must regenerate
- **Standard**: Valid for 1 year, auto-renewed if managed
- Plan for annual renewal and re-distribution

### 2. App Updates
- Increment `CFBundleVersion` for each build
- Increment `CFBundleShortVersionString` for major releases
- Upload new `.ipa` to MDM
- Configure auto-update or manual approval

### 3. Square SDK Requirements
- Square Mobile Payments SDK requires:
  - Location permission (configured in Info.plist)
  - Bluetooth permission (configured in Info.plist)
  - Square Application ID (in Info.plist: `sq0idp-Xtwux6dvJ58KrKW0amhoMQ`)
- Ensure Square has approved your app for Square Stand hardware
- Contact Square to register your bundle ID for hardware access

### 4. Security
- App uses Keychain for device token storage
- API communication uses HTTPS
- Device authentication required for backend access

### 5. Kiosk Mode
- App is designed for single-app kiosk mode
- Configure MDM to:
  - Lock device to single app (Guided Access or MDM kiosk mode)
  - Disable app switching
  - Prevent device settings access

## Version Management

### Current Version
- **Version**: 1.0
- **Build**: 1

### For Updates
1. Increment build number in Info.plist:
   ```xml
   <key>CFBundleVersion</key>
   <string>2</string>  <!-- Increment for each build -->
   ```

2. Optionally update version:
   ```xml
   <key>CFBundleShortVersionString</key>
   <string>1.1</string>  <!-- Update for feature releases -->
   ```

3. Create new archive and export
4. Upload to MDM as update

## Troubleshooting

### App Won't Install
- Check provisioning profile matches bundle ID
- Verify device is enrolled in MDM
- Check MDM logs for installation errors
- Ensure iOS version meets minimum (16.0+)

### Square SDK Not Working
- Verify Square Application ID is correct
- Check location and Bluetooth permissions granted
- Ensure Square has approved your bundle ID
- Check Square Stand is properly connected

### App Crashes on Launch
- Check device logs in Xcode Organizer
- Verify all required permissions are granted
- Ensure backend API is accessible
- Check device activation status

## Recommended MDM Settings

### App Installation
- **Installation Method**: Automatic
- **Update Policy**: Automatic (or manual approval)
- **Removal Policy**: Prevent removal (kiosk mode)

### Device Restrictions
- **Single App Mode**: Enabled
- **App Switching**: Disabled
- **Settings Access**: Restricted
- **Safari**: Disabled (if not needed)

### Network
- **Wi-Fi**: Configured and locked
- **Cellular**: Disabled (if using Wi-Fi only)
- **VPN**: Optional, if required

## Next Steps

1. **Choose Distribution Method**
   - Enterprise (recommended for internal apps)
   - Standard with Ad Hoc (limited devices)
   - Standard with Custom App Distribution (more setup)

2. **Set Up Apple Developer Account**
   - Register for Enterprise or Standard program
   - Configure certificates and provisioning profiles

3. **Configure MDM**
   - Set up MDM solution
   - Configure device enrollment
   - Prepare app distribution workflow

4. **Test Deployment**
   - Test on one device first
   - Verify all functionality
   - Test update process

5. **Deploy to Production**
   - Roll out to all kiosk devices
   - Monitor for issues
   - Plan for updates

## Support

For issues with:
- **Apple Developer**: Contact Apple Developer Support
- **MDM**: Contact your MDM provider support
- **Square SDK**: Contact Square Developer Support
- **App Issues**: Check logs and error messages

## Notes

- This app is designed for kiosk use and should be deployed in single-app mode
- Regular updates may be needed for Square SDK compatibility
- Monitor app performance and connection stability
- Keep backend API accessible for app functionality

