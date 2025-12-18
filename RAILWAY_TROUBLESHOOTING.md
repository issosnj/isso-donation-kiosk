# Railway Backend Troubleshooting Guide

## ✅ Current Status: RESOLVED

The backend is now fully operational at:
- **Backend URL**: `https://isso-donation-kiosk-production.up.railway.app`
- **Frontend URL**: `https://issodonationkiosk.netlify.app`
- **CORS**: Working correctly with Express-level OPTIONS handler

## Configuration Summary

### Backend Service (Railway)
- **Service Name**: Backend (or similar)
- **Public Domain**: `isso-donation-kiosk-production.up.railway.app`
- **Status**: ✅ Running and accessible

### Environment Variables (Backend Service)
```
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
CORS_ORIGIN=https://issodonationkiosk.netlify.app
ADMIN_WEB_URL=https://issodonationkiosk.netlify.app
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
```

### Frontend Service (Netlify)
- **Environment Variable**: `NEXT_PUBLIC_API_URL=https://isso-donation-kiosk-production.up.railway.app/api`
- **Status**: ✅ Configured and working

## Issues Resolved

### ✅ CORS Preflight (OPTIONS) Requests
**Problem**: Railway's proxy was intercepting OPTIONS requests and returning 404 before they reached the NestJS app.

**Solution**: Added Express-level OPTIONS handler in `backend/src/main.ts` that catches all OPTIONS requests before NestJS routing:
```typescript
expressApp.options('*', (req: any, res: any) => {
  // Handle preflight requests with proper CORS headers
});
```

### ✅ /api Route Handler
**Problem**: Accessing `/api` directly returned 404.

**Solution**: Added Express-level route handler for `/api` that returns API information:
```typescript
expressApp.get('/api', (req: any, res: any) => {
  // Return API information
});
```

### ✅ Backend Accessibility
**Problem**: Railway proxy couldn't find the backend service.

**Solution**: Ensured backend service has a public domain assigned in Railway Settings → Networking.

## Common Issues & Solutions

### Issue: "Application not found" (404)
**Cause**: No public domain assigned to backend service  
**Fix**: 
1. Go to Railway Dashboard → Backend Service → Settings → Networking
2. Click "Generate Domain" or "Custom Domain"
3. Wait for deployment to complete

### Issue: CORS errors in browser
**Cause**: Backend CORS configuration or Railway proxy blocking requests  
**Fix**: 
1. Verify `CORS_ORIGIN` and `ADMIN_WEB_URL` are set correctly in Railway
2. Check that frontend `NEXT_PUBLIC_API_URL` matches backend URL
3. The backend automatically allows all `*.netlify.app` domains

### Issue: Service keeps restarting
**Cause**: Health check failures, crashes, or missing environment variables  
**Fix**: 
1. Check Railway logs for errors
2. Verify all required environment variables are set
3. Check database connectivity (verify `DATABASE_PUBLIC_URL`)

### Issue: OPTIONS requests returning 404
**Cause**: Railway proxy intercepting preflight requests  
**Fix**: ✅ Already resolved - Express-level OPTIONS handler catches all OPTIONS requests

## Testing Endpoints

### Health Check
```bash
curl https://isso-donation-kiosk-production.up.railway.app/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### API Root
```bash
curl https://isso-donation-kiosk-production.up.railway.app/api
```
Expected: API information JSON

### OPTIONS Preflight
```bash
curl -X OPTIONS https://isso-donation-kiosk-production.up.railway.app/api/auth/login \
  -H "Origin: https://issodonationkiosk.netlify.app" \
  -H "Access-Control-Request-Method: POST"
```
Expected: `204 No Content` with CORS headers

## Deployment Checklist

- [x] Backend service has public domain
- [x] All environment variables set in Railway
- [x] CORS configured correctly
- [x] OPTIONS handler working
- [x] Frontend `NEXT_PUBLIC_API_URL` matches backend
- [x] Database connection working
- [x] Health endpoint responding

## Support

If issues persist:
1. Check Railway logs for errors
2. Verify environment variables match this guide
3. Test endpoints using curl commands above
4. Check Railway status page for service outages
