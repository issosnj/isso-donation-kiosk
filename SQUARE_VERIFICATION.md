# Square Integration Verification Checklist

Use this checklist to verify your Square integration is configured correctly.

## Step 1: Verify Railway Environment Variables

Go to Railway → Your Backend Service → Variables tab and verify:

- [ ] `SQUARE_APPLICATION_ID` is set (should start with `sandbox-` for sandbox or `sq0idp-` for production)
- [ ] `SQUARE_APPLICATION_SECRET` is set (should start with `sandbox-` for sandbox)
- [ ] `SQUARE_REDIRECT_URI` is set to exactly: `https://isso-donation-kiosk-production.up.railway.app/api/square/callback`
- [ ] `ADMIN_WEB_URL` is set to: `https://issodonationkiosk.netlify.app`

**Important:** The redirect URI must:
- Start with `https://` (not `http://`)
- End with `/api/square/callback` (no trailing slash)
- Match exactly what's in Square Dashboard

## Step 2: Verify Square Developer Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **OAuth** tab
4. Under **Redirect URL**, verify it matches exactly:
   ```
   https://isso-donation-kiosk-production.up.railway.app/api/square/callback
   ```

**Copy-paste this exact URL into Square Dashboard** to avoid typos:
```
https://isso-donation-kiosk-production.up.railway.app/api/square/callback
```

## Step 3: Verify Application Credentials

In Square Dashboard → Your Application → **Credentials** tab:

1. Copy the **Application ID** (also called Client ID)
2. Copy the **Application Secret** (also called Client Secret)
3. Verify they match exactly what's in Railway:
   - Railway `SQUARE_APPLICATION_ID` = Square Application ID
   - Railway `SQUARE_APPLICATION_SECRET` = Square Application Secret

## Step 4: Verify OAuth Scopes

In Square Dashboard → Your Application → **OAuth** tab:

Ensure these scopes are selected:
- [ ] `PAYMENTS_READ`
- [ ] `PAYMENTS_WRITE`
- [ ] `MERCHANT_PROFILE_READ`

## Step 5: Check Railway Logs

After trying to connect Square, check Railway logs for:

```
[Square Connect] Application ID: present
[Square Connect] Redirect URI: https://...
[Square Service] Redirect URI (exact): "https://..."
[Square Service] Normalized Redirect URI: "https://..."
```

Compare the redirect URI in the logs with what's in Square Dashboard. They must match **exactly**.

## Step 6: Common Issues

### Issue: Redirect URI has trailing slash
**Railway:** `https://.../callback/` ❌
**Square:** `https://.../callback` ✅

**Fix:** Remove trailing slash from Railway `SQUARE_REDIRECT_URI`

### Issue: HTTP instead of HTTPS
**Railway:** `http://...` ❌
**Square:** `https://...` ✅

**Fix:** Change to HTTPS in Railway

### Issue: Different domain
**Railway:** `https://isso-donation-kiosk-production.up.railway.app/api/square/callback`
**Square:** `https://isso-backend-production.up.railway.app/api/square/callback` ❌

**Fix:** Update Square Dashboard to match Railway

### Issue: Application ID/Secret mismatch
**Symptoms:** "Not Authorized" error

**Fix:** 
1. Re-copy Application ID and Secret from Square Dashboard
2. Update Railway environment variables
3. Redeploy backend

## Step 7: Test Connection

1. Go to Admin Portal → Temples → Select Temple → Square Tab
2. Click "Connect Square"
3. Authorize in Square
4. Check Railway logs for success/error messages

## Step 8: If Still Failing

1. **Double-check redirect URI** - Copy-paste from Railway to Square Dashboard
2. **Verify no extra spaces** - Check for leading/trailing spaces
3. **Check Square account** - Ensure the account has permission to authorize apps
4. **Try sandbox first** - Use Square Sandbox to test before production
5. **Check Square Dashboard status** - Ensure application is active

## Quick Copy-Paste Values

**For Railway `SQUARE_REDIRECT_URI`:**
```
https://isso-donation-kiosk-production.up.railway.app/api/square/callback
```

**For Square Dashboard Redirect URL:**
```
https://isso-donation-kiosk-production.up.railway.app/api/square/callback
```

Both must be **identical** - copy-paste to ensure they match exactly.

