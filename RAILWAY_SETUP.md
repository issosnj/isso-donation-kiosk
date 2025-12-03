# Railway Deployment Setup

## Issue
Railway's buildpack can't detect the app because the repository root contains multiple directories (backend, admin-web, kiosk-app).

## Solution

### Option 1: Set Root Directory in Railway (Recommended)

1. In Railway dashboard, go to your service settings
2. Under "Settings" → "Source"
3. Look for **"Add Root Directory"** or **"Root Directory"** field
4. Set it to: `backend`
5. Save and redeploy

This tells Railway to treat the `backend` folder as the root for this service.

**Note:** If you don't see Root Directory option, use Option 2 below.

### Option 1B: Use Custom Build/Start Commands

If Root Directory is not available in your Railway plan:

1. In Railway dashboard → Settings → Build
2. Set **Custom Build Command** to:
   ```
   cd backend && npm install && npm run build
   ```
3. In Settings → Deploy
4. Set **Custom Start Command** to:
   ```
   cd backend && npm run start:prod
   ```
5. Save and redeploy

### Option 2: Use Railway Configuration Files

The repository now includes:
- `railway.json` - Root level config
- `backend/railway.json` - Backend-specific config
- `backend/nixpacks.toml` - Build configuration
- `backend/Procfile` - Start command

Railway should automatically detect these.

### Option 3: Create Separate Services

For a monorepo, you can create separate Railway services:
1. **Backend Service**: Root directory = `backend`
2. **Admin Web Service**: Root directory = `admin-web` (if deploying separately)

## Environment Variables

Set these in Railway dashboard:

### Required:
```
NODE_ENV=production
PORT=3000
DB_HOST=<from Railway PostgreSQL>
DB_PORT=5432
DB_USERNAME=<from Railway PostgreSQL>
DB_PASSWORD=<from Railway PostgreSQL>
DB_DATABASE=<from Railway PostgreSQL>
JWT_SECRET=<generate strong random string>
JWT_EXPIRES_IN=7d
SQUARE_APPLICATION_ID=<your square app id>
SQUARE_APPLICATION_SECRET=<your square secret>
SQUARE_ENVIRONMENT=production
SQUARE_REDIRECT_URI=https://your-app.railway.app/api/square/callback
ENCRYPTION_KEY=<32 character random string>
ADMIN_WEB_URL=https://your-admin-web.vercel.app
```

### Database Setup:
1. Add PostgreSQL service in Railway
2. Railway will automatically provide connection variables
3. Use the `DATABASE_URL` or individual connection variables

## Build & Deploy

After setting the root directory to `backend`:
1. Railway will automatically detect it's a Node.js app
2. Run `npm install`
3. Run `npm run build`
4. Start with `npm run start:prod`

## Troubleshooting

If build still fails:
1. Check that Root Directory is set to `backend`
2. Verify `package.json` exists in `backend/`
3. Check build logs for specific errors
4. Ensure all environment variables are set

## Admin Web (Separate Service)

If deploying admin-web to Railway:
1. Create new service
2. Set Root Directory to: `admin-web`
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Set environment: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api`

