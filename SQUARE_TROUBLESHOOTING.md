# Square Integration Troubleshooting Guide

## "Not Authorized" Error

If you're seeing `Square OAuth error: {"message":"Not Authorized","type":"service.not_authorized"}`, follow these steps:

### 1. Verify Redirect URI Match (Most Common Issue)

The redirect URI must match **exactly** between:
- Your Railway environment variable `SQUARE_REDIRECT_URI`
- Your Square Developer Dashboard OAuth settings

**Check in Railway:**
1. Go to Railway → Your Backend Service → Variables
2. Check `SQUARE_REDIRECT_URI` value
3. It should be: `https://isso-donation-kiosk-production.up.railway.app/api/square/callback`

**Check in Square Dashboard:**
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **OAuth** tab
4. Under **Redirect URL**, verify it matches exactly:
   ```
   https://isso-donation-kiosk-production.up.railway.app/api/square/callback
   ```

**Important:**
- No trailing slashes
- Must be HTTPS (not HTTP)
- Must match character-for-character
- Case-sensitive

### 2. Verify Application Credentials

**In Railway:**
- `SQUARE_APPLICATION_ID` - Should be your Application ID (Client ID)
- `SQUARE_APPLICATION_SECRET` - Should be your Application Secret (Client Secret)

**In Square Dashboard:**
1. Go to your application
2. Go to **Credentials** tab
3. Copy the **Application ID** and **Application Secret**
4. Verify they match what's in Railway

### 3. Check Application Permissions

In Square Dashboard → Your Application → **OAuth** tab:
- Ensure the application has the required scopes:
  - `PAYMENTS_READ`
  - `PAYMENTS_WRITE`
  - `MERCHANT_PROFILE_READ`

### 4. Verify Square Account Permissions

- The Square account you're using to authorize must have permission to connect applications
- If using a test account, ensure it's properly set up
- For production, ensure the Square account is approved

### 5. Check Environment (Sandbox vs Production)

- If using **Sandbox**: Ensure your Square application is in Sandbox mode
- If using **Production**: Ensure your Square application is approved for production
- The Application ID and Secret are different for Sandbox vs Production

### 6. Common Mistakes

❌ **Wrong:**
```
SQUARE_REDIRECT_URI=https://isso-donation-kiosk-production.up.railway.app/api/square/callback/
```
(Note the trailing slash)

✅ **Correct:**
```
SQUARE_REDIRECT_URI=https://isso-donation-kiosk-production.up.railway.app/api/square/callback
```

❌ **Wrong:**
```
SQUARE_REDIRECT_URI=http://isso-donation-kiosk-production.up.railway.app/api/square/callback
```
(Note HTTP instead of HTTPS)

✅ **Correct:**
```
SQUARE_REDIRECT_URI=https://isso-donation-kiosk-production.up.railway.app/api/square/callback
```

### 7. Testing Steps

1. **Clear browser cache** and try again
2. **Check Railway logs** for detailed error messages
3. **Verify the OAuth URL** generated matches your Square app configuration
4. **Try in incognito/private browser** to rule out cache issues

### 8. Debugging with Logs

Check Railway logs for:
```
[Square Connect] Application ID: present
[Square Connect] Redirect URI: https://...
[Square Service] Redirect URI: https://...
[Square Service] Token exchange failed
```

Compare the redirect URI in the logs with what's in Square Dashboard.

### 9. Still Not Working?

1. **Double-check all environment variables in Railway**
2. **Re-copy Application ID and Secret from Square Dashboard** (they might have changed)
3. **Remove and re-add the redirect URI in Square Dashboard**
4. **Try creating a new Square application** if issues persist
5. **Contact Square Support** if the issue persists after verifying all above

## Other Common Errors

### "Invalid client_id"
- Application ID is incorrect
- Application ID doesn't match the environment (sandbox vs production)

### "Invalid redirect_uri"
- Redirect URI doesn't match exactly
- Redirect URI not configured in Square Dashboard

### "Invalid code"
- Authorization code has expired (they expire quickly)
- Code was already used
- Try the connection flow again

### "Missing required parameter"
- One of the required environment variables is missing
- Check Railway logs for which variable is missing

## Quick Checklist

- [ ] `SQUARE_APPLICATION_ID` set in Railway
- [ ] `SQUARE_APPLICATION_SECRET` set in Railway
- [ ] `SQUARE_REDIRECT_URI` set in Railway (no trailing slash, HTTPS)
- [ ] Redirect URI matches exactly in Square Dashboard
- [ ] Application has required OAuth scopes
- [ ] Square account has permission to authorize
- [ ] Using correct environment (sandbox vs production)
- [ ] Railway backend is deployed and running

