# Railway Build Fix

## The Problem
Railway's Nixpacks is auto-detecting the project and generating a Nix configuration that includes `npm` as a separate package, which causes build failures.

## The Solution
Use **Custom Build Command** and **Custom Start Command** in Railway settings to bypass Nixpacks auto-detection.

## Railway Settings Configuration

### 1. Build Settings
Go to: **Settings → Build**

**Custom Build Command:**
```
cd backend && npm install && npm run build
```

**Leave Builder as:** Railpack (or Default)

### 2. Deploy Settings
Go to: **Settings → Deploy**

**Custom Start Command:**
```
cd backend && npm run start:prod
```

### 3. Why This Works
- Custom commands bypass Nixpacks auto-detection
- Node.js is still installed by Railway/Nixpacks automatically
- We explicitly control the build and start process
- No conflicts with auto-generated Nix configurations

## Alternative: Set Root Directory

If Railway supports Root Directory in your plan:

1. Go to **Settings → Source**
2. Find **"Add Root Directory"** or **"Root Directory"**
3. Set it to: `backend`
4. Remove Custom Build/Start commands (let Railway auto-detect)

This is cleaner but may not be available on all Railway plans.

## After Configuration

1. Save settings
2. Railway will automatically redeploy
3. Build should succeed
4. Check logs to verify

## Environment Variables

Don't forget to set all environment variables in the **Variables** tab:
- Database connection variables
- JWT_SECRET
- Square credentials
- etc.

See `RAILWAY_ENV_VARS.md` for complete list.

