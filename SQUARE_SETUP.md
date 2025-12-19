# Square Integration Setup Guide

This guide will walk you through setting up Square payment integration for the ISSO Donation Kiosk system.

## Prerequisites

- Square Developer account (create at [developer.squareup.com](https://developer.squareup.com))
- Access to Square Developer Dashboard
- Backend deployed on Railway
- Admin Web deployed on Netlify

## Step 1: Create Square Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"Create Application"**
3. Fill in the application details:
   - **Application Name**: ISSO Donation Kiosk (or your preferred name)
   - **Description**: Donation kiosk payment processing
4. Click **"Create Application"**

## Step 2: Configure OAuth Settings

1. In your Square application, go to **"OAuth"** tab
2. Under **"Redirect URL"**, add your backend callback URL:
   ```
   https://isso-donation-kiosk-production.up.railway.app/api/square/callback
   ```
   Or if using a different backend URL:
   ```
   https://YOUR_RAILWAY_BACKEND_URL/api/square/callback
   ```
3. Click **"Save"**

## Step 3: Get Application Credentials

1. In your Square application dashboard, go to **"Credentials"** tab
2. You'll see:
   - **Application ID** (also called Client ID)
   - **Application Secret** (also called Client Secret)
3. Copy both values - you'll need them for Railway environment variables

## Step 4: Configure Backend Environment Variables

Add these environment variables to your Railway backend service:

1. Go to your Railway project dashboard
2. Select your backend service
3. Go to **"Variables"** tab
4. Add the following variables:

```env
SQUARE_APPLICATION_ID=your_application_id_here
SQUARE_APPLICATION_SECRET=your_application_secret_here
SQUARE_REDIRECT_URI=https://isso-donation-kiosk-production.up.railway.app/api/square/callback
ADMIN_WEB_URL=https://issodonationkiosk.netlify.app
```

**Important Notes:**
- Replace `your_application_id_here` with your actual Square Application ID
- Replace `your_application_secret_here` with your actual Square Application Secret
- Update `SQUARE_REDIRECT_URI` if your backend URL is different
- Update `ADMIN_WEB_URL` if your frontend URL is different

## Step 5: Environment Configuration

### Sandbox vs Production

- **Sandbox**: Use for testing. No real payments processed.
- **Production**: Use for live payments. Requires Square account approval.

Set `SQUARE_ENVIRONMENT` in Railway:
- For testing: `SQUARE_ENVIRONMENT=sandbox`
- For production: `SQUARE_ENVIRONMENT=production` (after approval)

## Step 6: Connect Square to a Temple

1. Log into the Admin Web portal
2. Navigate to **"Temples"** tab
3. Click on a temple to open the edit view
4. Go to the **"Square"** tab
5. Click **"Connect Square"** button
6. You'll be redirected to Square to authorize the connection
7. Log in with your Square account credentials
8. Authorize the application
9. You'll be redirected back to the admin portal
10. The temple should now show as "Connected to Square"

## Step 7: Verify Connection

After connecting, you should see:
- ✅ Green success message
- Merchant ID displayed
- Location ID displayed (if available)
- "Disconnect Square" button available

## Step 8: Configure Webhooks (Optional but Recommended)

To receive real-time payment status updates:

1. In Square Developer Dashboard, go to **"Webhooks"**
2. Add webhook endpoint:
   ```
   https://isso-donation-kiosk-production.up.railway.app/api/square/webhook
   ```
3. Select events to subscribe to:
   - `payment.updated` (required for donation status updates)
4. Save webhook configuration

## Troubleshooting

### "Failed to connect Square" Error

1. **Check Environment Variables**: Ensure all Square variables are set in Railway
2. **Verify Redirect URI**: Must match exactly in Square Dashboard and Railway
3. **Check Application Status**: Ensure Square application is active
4. **Verify Permissions**: Square account must have permission to connect applications

### OAuth Callback Not Working

1. **Check Redirect URI**: Must be exactly: `https://YOUR_BACKEND_URL/api/square/callback`
2. **Verify HTTPS**: Square requires HTTPS for production
3. **Check Backend Logs**: Look for errors in Railway logs
4. **Verify ADMIN_WEB_URL**: Must be set correctly in Railway

### Connection Succeeds but No Merchant ID

1. **Check Backend Logs**: Look for errors during token exchange
2. **Verify Square API Access**: Ensure Square account has API access enabled
3. **Check Permissions**: Square account must have merchant profile read permissions

## Testing

### Sandbox Testing

1. Use Square Sandbox environment
2. Use test Square account credentials
3. Test payments won't process real money
4. Verify webhook delivery in Square Dashboard

### Production Testing

1. Ensure Square account is approved for production
2. Use real Square account credentials
3. Test with small amounts first
4. Monitor Square Dashboard for transactions

## Security Notes

- **Never commit** Square credentials to git
- Store credentials only in Railway environment variables
- Use HTTPS for all Square API calls (enforced by Square)
- Regularly rotate Application Secret if compromised
- Monitor Square Dashboard for unauthorized access

## Support

- Square Developer Documentation: https://developer.squareup.com/docs
- Square Support: https://squareup.com/help
- Square API Reference: https://developer.squareup.com/reference/square

## Current Production URLs

- **Backend API**: `https://isso-donation-kiosk-production.up.railway.app`
- **Admin Web**: `https://issodonationkiosk.netlify.app`
- **Square Callback**: `https://isso-donation-kiosk-production.up.railway.app/api/square/callback`

Make sure these URLs match your actual deployment URLs when configuring Square.

