# How to Find Your Apple Developer Team ID

Square needs your Apple Developer Team ID to configure the mobile SDK. Here's how to find it:

## Method 1: From Xcode (Easiest)

1. **Open your project in Xcode**
2. **Click on your project** (blue icon) in the left sidebar
3. **Select your target** "ISSOKiosk" in the main editor
4. **Go to the "Signing & Capabilities" tab**
5. Look at the **"Team"** dropdown
   - If you see a team selected, the Team ID is shown next to it (in parentheses)
   - Format: `Your Team Name (ABC123XYZ)`
   - The `ABC123XYZ` part is your Team ID

**Example:**
- Team: `John Doe (ABC123XYZ)` → Team ID is `ABC123XYZ`

## Method 2: From Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Click on **"Membership"** in the left sidebar
4. Your **Team ID** is displayed on the right side
   - It's a 10-character alphanumeric string
   - Format: `ABC123XYZ` (all uppercase, no spaces)

## Method 3: From Your Apple ID Account

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in
3. If you're part of a developer team, you'll see it listed
4. The Team ID is shown next to the team name

## Method 4: If You Don't Have a Developer Account Yet

If you don't have an Apple Developer account:

1. **For Testing Only (Free):**
   - You can use Xcode with a free Apple ID
   - Xcode will create a temporary Team ID
   - This works for testing on your own devices
   - **Note:** Square may require a paid Developer account for production

2. **For Production (Paid):**
   - Sign up for [Apple Developer Program](https://developer.apple.com/programs/)
   - Cost: $99/year
   - You'll get a permanent Team ID after enrollment

## What to Do in Square Dashboard

Once you have your Team ID:

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **Mobile** tab
4. Find the field **"Team ID"** or **"iOS Team ID"**
5. Enter your Team ID (10 characters, no spaces)
6. Click **Save**

## Format

- **Correct:** `ABC123XYZ` (10 characters, uppercase)
- **Incorrect:** `ABC-123-XYZ` (no dashes)
- **Incorrect:** `abc123xyz` (should be uppercase)

## Troubleshooting

### "Invalid Team ID" Error
- Make sure it's exactly 10 characters
- No spaces or special characters
- All uppercase letters
- Double-check in Xcode that it matches

### Can't Find Team ID
- Make sure you're signed in to Xcode with your Apple ID
- Go to Xcode → Settings → Accounts
- Add your Apple ID if not already added
- Then check the project's Signing & Capabilities tab

### Using Free Apple ID
- Free Apple IDs can have Team IDs, but they're temporary
- For production/Square integration, you may need a paid Developer account
- Check Square's requirements for production use

## Quick Checklist

- [ ] Opened Xcode project
- [ ] Checked Signing & Capabilities tab
- [ ] Found Team ID (10 characters)
- [ ] Copied Team ID exactly (no spaces)
- [ ] Pasted into Square Dashboard → Mobile → Team ID
- [ ] Saved in Square Dashboard

## Need Help?

If you're still having trouble:
1. Take a screenshot of your Xcode Signing & Capabilities tab
2. Check that you're signed in to Xcode with your Apple ID
3. Verify the Team ID format matches exactly what Square expects

