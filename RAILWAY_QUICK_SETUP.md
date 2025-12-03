# Railway Quick Setup Guide

## Step-by-Step Configuration

### 1. Build Settings
Go to: **Settings → Build**

- **Builder**: Keep as "Railpack" (or "Default")
- **Custom Build Command**: 
  ```
  cd backend && npm install && npm run build
  ```

### 2. Deploy Settings  
Go to: **Settings → Deploy**

- **Custom Start Command**:
  ```
  cd backend && npm run start:prod
  ```

### 3. Environment Variables
Go to: **Variables** tab

Add these required variables:

```
NODE_ENV=production
PORT=3000
DB_HOST=<from PostgreSQL service>
DB_PORT=5432
DB_USERNAME=<from PostgreSQL service>
DB_PASSWORD=<from PostgreSQL service>
DB_DATABASE=<from PostgreSQL service>
JWT_SECRET=<generate random string>
JWT_EXPIRES_IN=7d
SQUARE_APPLICATION_ID=<your square app id>
SQUARE_APPLICATION_SECRET=<your square secret>
SQUARE_ENVIRONMENT=production
SQUARE_REDIRECT_URI=https://your-app.railway.app/api/square/callback
ENCRYPTION_KEY=<32 character random string>
ADMIN_WEB_URL=https://your-admin-web.vercel.app
```

### 4. PostgreSQL Database
1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically provide connection variables
3. Copy the connection variables to your backend service environment variables

### 5. Deploy
After setting the commands and variables, Railway will automatically:
- Detect the build
- Install dependencies
- Build the app
- Start the service

## Troubleshooting

**Build fails with "npm: command not found"**
- Make sure Custom Build Command includes `cd backend &&` before npm commands

**Build succeeds but app won't start**
- Check Custom Start Command is set correctly
- Verify PORT environment variable is set
- Check logs for specific errors

**Database connection fails**
- Verify all DB_* environment variables are set
- Check PostgreSQL service is running
- Ensure database name matches
