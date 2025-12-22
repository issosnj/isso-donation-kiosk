# Deploying Admin Web Portal to kiosk.issousa.org

This guide covers deploying the admin web portal to your custom subdomain.

## Prerequisites

- Domain configured: `kiosk.issousa.org`
- DNS records pointing to your hosting provider
- SSL certificate configured (HTTPS required)

## Environment Variables

### Frontend (Admin Web)

Set the following environment variable in your hosting provider (Netlify, Vercel, etc.):

```env
NEXT_PUBLIC_API_URL=https://kiosk-backend.issousa.org/api
```

**For Netlify:**
1. Go to Site Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` with value: `https://kiosk-backend.issousa.org/api`
3. Redeploy the site

**For Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` with value: `https://kiosk-backend.issousa.org/api`
3. Redeploy the site

### Backend (Railway)

Set the following environment variable in Railway:

```env
ADMIN_WEB_URL=https://kiosk.issousa.org
CORS_ORIGIN=https://kiosk.issousa.org
```

**Steps:**
1. Go to Railway Dashboard → Your Backend Service → Variables
2. Add `ADMIN_WEB_URL` with value: `https://www.kiosk.issousa.org`
3. Add `CORS_ORIGIN` with value: `https://www.kiosk.issousa.org`
4. The backend will automatically redeploy

## DNS Configuration

### A Record (if using direct hosting)
```
Type: A
Name: kiosk (or @ for root)
Value: [Your hosting IP]
TTL: 3600
```

### CNAME Record (if using Netlify/Vercel)
```
Type: CNAME
Name: kiosk (or @ for root)
Value: [Your hosting provider's domain]
TTL: 3600
```

**Note:** Some providers also support:
- `www.kiosk.issousa.org` → CNAME to hosting provider (optional)

## SSL Certificate

Ensure SSL/HTTPS is enabled:
- **Netlify**: Automatic SSL via Let's Encrypt
- **Vercel**: Automatic SSL via Let's Encrypt
- **Custom hosting**: Configure Let's Encrypt or your SSL provider

## Build Configuration

### Netlify

Create `netlify.toml` in the `admin-web` directory:

```toml
[build]
  command = "npm run build"
  publish = "out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

Vercel automatically detects Next.js. No additional configuration needed if using `output: 'export'` in `next.config.js`.

## Verification

After deployment:

1. **Check Frontend:**
   - Visit `https://kiosk.issousa.org`
   - Should load the login page
   - Check browser console for API URL: Should show `https://kiosk-backend.issousa.org/api`

2. **Check Backend CORS:**
   - Try logging in
   - Check backend logs for CORS messages
   - Should see: `[CORS] ✓ Allowing ISSO USA domain: https://kiosk.issousa.org`

3. **Test API Connection:**
   - Login should work
   - Dashboard should load
   - All API calls should succeed

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Verify `ADMIN_WEB_URL` and `CORS_ORIGIN` are set in Railway
2. Check backend logs for CORS messages
3. Ensure the domain matches exactly (including `www` if used)
4. Clear browser cache and try again

### API Connection Errors

If API calls fail:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in hosting provider
2. Check that the backend URL is accessible: `https://kiosk-backend.issousa.org/api`
3. Check browser console for API errors
4. Verify SSL certificate is valid

### Domain Not Loading

If the domain doesn't load:
1. Check DNS propagation: `dig www.kiosk.issousa.org`
2. Verify DNS records are correct
3. Check hosting provider's domain configuration
4. Ensure SSL certificate is provisioned

## Current Configuration

- **Frontend URL**: `https://kiosk.issousa.org`
- **Backend URL**: `https://kiosk-backend.issousa.org/api`
- **CORS**: Backend automatically allows all `*.issousa.org` domains

## Notes

- The backend CORS configuration allows any subdomain of `issousa.org`
- Both `www.kiosk.issousa.org` and `kiosk.issousa.org` are supported
- SSL/HTTPS is required for production
- Environment variables must be set before deployment

