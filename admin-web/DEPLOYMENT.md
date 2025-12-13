# Admin Web Portal - Deployment Guide

## Deploy to Vercel

### Prerequisites
- Vercel account (free tier works)
- Railway backend URL

### Steps

1. **Push code to GitHub** (if not already done)
   ```bash
   git add admin-web/
   git commit -m "Add admin web portal"
   git push
   ```

2. **Import project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `admin-web` folder as the root directory

3. **Configure Environment Variables**
   In Vercel project settings → Environment Variables, add:
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
   ```
   Replace `your-app.railway.app` with your actual Railway backend URL.

4. **Deploy**
   - Vercel will automatically detect Next.js
   - Click "Deploy"
   - Wait for build to complete (usually 1-2 minutes)

5. **Access your app**
   - Vercel will provide a URL like `https://your-app.vercel.app`
   - Update your Railway backend `ADMIN_WEB_URL` variable to this URL

## Alternative: Deploy to Railway

You can also deploy the admin web to Railway:

1. **Create a new service in Railway**
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Select the `admin-web` folder

2. **Configure build settings**
   - Root Directory: `admin-web`
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Set environment variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy**
   - Railway will automatically build and deploy

## Post-Deployment

1. **Update backend CORS settings**
   - In your Railway backend, ensure `ADMIN_WEB_URL` is set to your deployed admin web URL
   - This allows the frontend to make API requests

2. **Test the deployment**
   - Visit your deployed URL
   - Try logging in
   - Test all features

## Troubleshooting

### CORS Errors
- Ensure `ADMIN_WEB_URL` in backend matches your deployed frontend URL exactly
- Check that the backend CORS configuration includes your frontend URL

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel/Railway
- Check that the backend is running and accessible
- Test the API URL directly in a browser

### Build Errors
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles without errors
- Review build logs for specific errors

