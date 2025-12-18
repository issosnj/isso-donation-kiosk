# Deployment Guide - ISSO Donation Kiosk

## Hosting Recommendations

### 1. Backend API (NestJS)

#### Option A: Render (Recommended for simplicity)
- **Pros**: Free tier available, automatic SSL, easy PostgreSQL setup, GitHub integration
- **Cost**: Free tier (with limitations) or $7/month for starter
- **Setup**:
  1. Connect GitHub repo to Render
  2. Create new Web Service
  3. Select `backend` directory
  4. Build command: `npm install && npm run build`
  5. Start command: `npm run start:prod`
  6. Add PostgreSQL database (free tier available)
  7. Set environment variables

#### Option B: Railway (Recommended - Currently in use)
- **Pros**: Great developer experience, PostgreSQL included, easy scaling, private networking
- **Cost**: ~$5-20/month depending on usage
- **Setup**: 
  1. Connect GitHub repo to Railway
  2. Create new project
  3. Add PostgreSQL service
  4. Add backend service (select `backend` directory)
  5. Railway auto-detects Dockerfile
  6. Set environment variables (see below)
  7. Deploy automatically on git push

#### Option C: AWS (For production scale)
- **Services**: 
  - EC2 or ECS for backend
  - RDS for PostgreSQL
  - Application Load Balancer
- **Cost**: ~$30-100/month
- **Best for**: High traffic, enterprise needs

#### Option D: DigitalOcean App Platform
- **Pros**: Simple, predictable pricing
- **Cost**: $12/month (includes database)
- **Good middle ground**

**Recommended: Render or Railway** for getting started quickly.

---

### 2. Admin Web Portal (Next.js)

#### Option A: Netlify (Recommended - Currently in use)
- **Pros**: Free tier, automatic deployments, excellent Next.js support, global CDN
- **Cost**: Free for hobby, $19/month for Pro
- **Setup**:
  1. Connect GitHub repo
  2. Auto-detects Next.js via `netlify.toml`
  3. Set `NEXT_PUBLIC_API_URL` environment variable
  4. Deploy automatically on every push

#### Option B: Vercel
- **Pros**: Made by Next.js creators, excellent integration
- **Cost**: Free for hobby, $20/month for Pro
- **Similar to Netlify**

#### Option C: Render
- **Pros**: Same platform as backend (easier management)
- **Cost**: Free tier available
- **Good if you want everything in one place**

**Recommended: Netlify** - Currently deployed, works great with Railway backend.

---

### 3. PostgreSQL Database

#### Option A: Render PostgreSQL (if using Render)
- **Pros**: Free tier, automatic backups, easy connection
- **Cost**: Free tier (90 days) or $7/month

#### Option B: Railway PostgreSQL
- **Pros**: Included with Railway, easy setup
- **Cost**: Included in Railway pricing

#### Option C: Supabase (Recommended alternative)
- **Pros**: Free tier, PostgreSQL + extras (auth, storage), great dashboard
- **Cost**: Free tier (500MB), $25/month for Pro
- **Bonus**: Can replace some backend features

#### Option D: AWS RDS / DigitalOcean Managed Database
- **Pros**: Production-grade, automated backups
- **Cost**: $15-50/month
- **Best for**: Production with high availability needs

**Recommended: Render PostgreSQL or Supabase** for simplicity.

---

### 4. iOS Kiosk App Distribution

#### For Testing/Pilot:
- **TestFlight** (Free)
  - Apple's official beta testing
  - Up to 10,000 testers
  - Easy distribution

#### For Production:
- **MDM Solutions** (Mobile Device Management)
  - **Kandji** - $399/month (best for Apple-focused)
  - **Mosyle** - $1-4/device/month
  - **Hexnode** - $1-4/device/month
  - **Intune** - $6/user/month (Microsoft ecosystem)
  - **SimpleMDM** - $3/device/month

**Recommended**: Start with **TestFlight** for pilot, move to **Kandji** or **Mosyle** for production.

---

## Recommended Complete Setup

### Budget-Friendly (Starting Out)
1. **Backend**: Render (Free tier or $7/month)
2. **Database**: Render PostgreSQL (Free tier or $7/month)
3. **Admin Web**: Netlify (Free)
4. **iOS App**: TestFlight (Free)
5. **Total**: **$0-14/month**

### Production Setup
1. **Backend**: Railway ($20/month) or Render ($25/month)
2. **Database**: Railway PostgreSQL (included) or Supabase ($25/month)
3. **Admin Web**: Netlify Pro ($19/month)
4. **iOS App**: Kandji ($399/month) or Mosyle ($1-4/device/month)
5. **Total**: **~$50-500/month** (depending on device count)

---

## Step-by-Step Deployment

### Backend on Railway (Current Setup)

1. **Create Account**: https://railway.app
2. **New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database**:
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Wait for deployment (1-2 minutes)

4. **Add Backend Service**:
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Railway will auto-detect the `backend` directory
   - It will use the `Dockerfile` in the backend directory

5. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
   # Or use individual DB variables:
   # DB_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
   # DB_PORT=5432
   # DB_USERNAME=${{Postgres.POSTGRES_USER}}
   # DB_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
   # DB_DATABASE=${{Postgres.POSTGRES_DB}}
   JWT_SECRET=<generate strong random string>
   JWT_EXPIRES_IN=7d
   SQUARE_APPLICATION_ID=<your square app id>
   SQUARE_APPLICATION_SECRET=<your square secret>
   SQUARE_ENVIRONMENT=production
   SQUARE_REDIRECT_URI=https://your-backend.railway.app/api/square/callback
   ENCRYPTION_KEY=<32 character random string>
   ADMIN_WEB_URL=https://your-admin-web.netlify.app
   ```
   
   **Note**: Replace `Postgres` with your actual PostgreSQL service name in Railway.

6. **Create Master Admin User**:
   - Go to Backend Service → Shell
   - Run: `npm run seed:admin`
   - Or for custom user: `npm run seed:user`
   - See `backend/CREATE_ADMIN.md` for details

7. **Update Square OAuth Redirect URI**:
   - In Square Dashboard, update redirect URI to your Railway URL

### Admin Web on Netlify

1. **Create Account**: https://netlify.com
2. **Import Project**:
   - Connect GitHub repo
   - Netlify auto-detects Next.js via `netlify.toml`
   - Build Command: `npm run build` (auto-detected)
   - Publish Directory: `out` (configured in netlify.toml)

3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
   ```

4. **Deploy**: Automatic on every push to main branch

### Database Setup

1. **Run Migrations** (if using TypeORM migrations):
   ```bash
   # Connect to your database and run
   npm run migration:run
   ```

2. **Or let TypeORM auto-sync** (development only - disable in production):
   - Set `synchronize: false` in production
   - Use migrations instead

### iOS App Distribution

#### TestFlight Setup:
1. Archive app in Xcode
2. Upload to App Store Connect
3. Add testers in TestFlight
4. Distribute to iPads

#### MDM Setup (Production):
1. Choose MDM provider (Kandji, Mosyle, etc.)
2. Enroll iPads in MDM
3. Configure single-app mode
4. Push app via MDM
5. Set app to auto-launch

---

## Environment-Specific Configuration

### Development
- Backend: `http://localhost:3000`
- Admin Web: `http://localhost:3001`
- Database: Local PostgreSQL

### Staging
- Backend: Render/Railway staging environment
- Admin Web: Netlify preview deployment
- Database: Separate staging database

### Production
- Backend: Render/Railway production
- Admin Web: Netlify production
- Database: Production database with backups

---

## Monitoring & Logging

### Recommended Tools:
1. **Sentry** - Error tracking (Free tier available)
2. **LogRocket** - Session replay (Paid)
3. **Datadog** - Full monitoring (Paid)
4. **Render/Railway built-in logs** - Basic monitoring

### Setup:
- Add error tracking to backend
- Monitor API response times
- Track donation success rates
- Alert on payment failures

---

## Security Checklist

- [ ] Use HTTPS everywhere (automatic with Render/Netlify)
- [ ] Strong JWT secrets (use random generator)
- [ ] Encrypt Square tokens in database
- [ ] Enable CORS properly (only allow admin web domain)
- [ ] Use environment variables for all secrets
- [ ] Enable database backups
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

---

## Cost Breakdown Example

### Small Deployment (1-5 temples, 5-10 devices):
- Backend: Render $7/month
- Database: Render PostgreSQL $7/month
- Admin Web: Netlify Free
- MDM: Mosyle $30/month (10 devices @ $3/device)
- **Total: ~$44/month**

### Medium Deployment (10-20 temples, 20-50 devices):
- Backend: Railway $20/month
- Database: Supabase $25/month
- Admin Web: Netlify Pro $19/month
- MDM: Kandji $399/month
- **Total: ~$464/month**

### Large Deployment (50+ temples, 100+ devices):
- Backend: AWS/ECS $100/month
- Database: AWS RDS $50/month
- Admin Web: Netlify Pro $19/month
- MDM: Enterprise solution $500+/month
- **Total: ~$670+/month**

---

## Quick Start Commands

### Render Deployment:
```bash
# Backend is auto-deployed on git push
# Just configure environment variables in dashboard
```

### Netlify Deployment:
```bash
# Automatic on git push to main
# Or use Netlify CLI:
netlify deploy --prod
```

### Database Migration:
```bash
# On Render, use one-off shell or local connection
npm run migration:run
```

---

## Support & Resources

- Render Docs: https://render.com/docs
- Netlify Docs: https://docs.netlify.com
- Railway Docs: https://docs.railway.app
- Square Developer: https://developer.squareup.com/docs