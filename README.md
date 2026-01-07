# ISSO Donation Kiosk System

A modern, multi-tenant donation kiosk system for temples with Stripe Terminal payment integration. Features a NestJS backend, Next.js admin portal, and native iOS kiosk app.

## 🏗️ Architecture

- **Backend**: NestJS REST API with PostgreSQL (deployed on Railway)
- **Admin Web**: Next.js web portal for temple and master admins (deployed on Netlify)
- **Kiosk App**: Native iOS app (Swift/SwiftUI) with Stripe Terminal SDK

## 📁 Project Structure

```
isso-donation-kiosk/
├── backend/          # NestJS API
│   ├── src/          # Source code
│   ├── Dockerfile    # Docker configuration for Railway
│   └── railway.json  # Railway deployment config
├── admin-web/        # Next.js admin portal
│   ├── src/          # Source code
│   └── public/       # Static assets
├── kiosk-app/        # iOS Swift/SwiftUI app
└── README.md         # This file
```

## ✨ Features

- **Multi-tenant Architecture**: Each temple has separate Stripe account and data isolation
- **Role-Based Access Control**: Master Admin (system-wide) and Temple Admin (temple-specific)
- **Stripe Terminal Integration**: Stripe M2 reader support via Bluetooth, connection tokens, webhook handling
- **Device Management**: Activation codes, device tracking, and status monitoring
- **Donation Processing**: Real-time payment processing via Stripe Terminal SDK
- **Admin Dashboards**: Comprehensive CRM-style interface with statistics and reporting
- **Donation Categories**: Customizable categories per temple
- **Receipt Generation**: Automated receipt generation with PDF attachments
- **Fee Tracking**: Automatic Stripe fee calculation from Balance Transaction API
- **Audit Logging**: Complete audit trail of all actions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Railway's managed PostgreSQL)
- Xcode 15+ (for iOS app development)
- Stripe Account (with Terminal enabled)
- Railway account (for backend hosting)
- Netlify account (for frontend hosting)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/isso_donation_kiosk
# OR use Railway's DATABASE_PUBLIC_URL

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS
ADMIN_WEB_URL=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
```

Run locally:
```bash
npm run start:dev
```

API will be available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

### 2. Admin Web Setup

```bash
cd admin-web
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Run locally:
```bash
npm run dev
```

Admin portal will be at `http://localhost:3000` (Next.js default port)

### 3. Create Master Admin User

After setting up the database, create your first master admin:

```bash
cd backend
npm run seed:admin
```

Or create a custom user:
```bash
npm run seed:user
```

You'll be prompted for email, password, name, and role.

**Note**: For Railway deployment, use Railway Shell to run seed scripts:
1. Go to Railway backend service → Shell tab
2. Run: `npm run seed:admin` or `npm run seed:user`

## 🌐 Deployment

### Current Production URLs

- **Backend API**: `https://kiosk-backend.issousa.org/api`
- **Admin Web Portal**: `https://kiosk.issousa.org`
- **API Documentation**: `https://kiosk-backend.issousa.org/api/docs`

### Backend (Railway)

1. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Railway will auto-detect the backend directory

2. **Add PostgreSQL Service**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will create a PostgreSQL instance

3. **Configure Environment Variables**
   - Go to your backend service → Variables
   - Add these variables:
     ```
     DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
     # Note: DATABASE_PUBLIC_URL is preferred over DATABASE_URL for Railway
     JWT_SECRET=your-super-secret-jwt-key
     STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
     STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
     CORS_ORIGIN=https://kiosk.issousa.org
     ADMIN_WEB_URL=https://kiosk.issousa.org
     NODE_ENV=production
     PORT=3000
     ```

4. **Deploy**
   - Railway will automatically deploy on push to main
   - Backend URL: `https://kiosk-backend.issousa.org/api` (or Railway default domain during setup)
   - The backend automatically handles CORS for Netlify domains

5. **Create Admin User**
   - Use Railway Shell or run locally with `DATABASE_URL` set:
     ```bash
     DATABASE_URL="your-railway-db-url" npm run seed:admin
     ```

6. **Configure Stripe Webhook**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://kiosk-backend.issousa.org/api/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET` environment variable

### Admin Web (Netlify)

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Import your GitHub repository
   - Netlify will auto-detect Next.js via `netlify.toml`

2. **Configure Build Settings**
   - Base Directory: `admin-web`
   - Build Command: `npm run build` (auto-detected)
   - Publish Directory: `out` (configured in `netlify.toml`)

3. **Configure Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_API_URL=https://kiosk-backend.issousa.org/api
     ```
   - **Important**: Use the exact backend URL from Railway

4. **Deploy**
   - Netlify will automatically deploy on push to main
   - Your admin portal will be live at `https://kiosk.issousa.org`

5. **Update Backend CORS**
   - In Railway backend variables, set:
     ```
     CORS_ORIGIN=https://kiosk.issousa.org
     ADMIN_WEB_URL=https://kiosk.issousa.org
     ```
   - The backend automatically allows all `*.netlify.app` URLs for CORS

### iOS App (TestFlight/MDM)

1. **Build for Distribution**
   - Open `kiosk-app/ISSOKiosk.xcodeproj` in Xcode
   - Configure signing with your Apple Developer account
   - Archive and upload to App Store Connect

2. **Distribute via TestFlight**
   - Add testers in App Store Connect
   - Or distribute via MDM for kiosk devices

3. **Configure API Endpoint**
   - The app automatically uses the backend URL from device activation
   - Stripe Terminal SDK is configured per temple via admin portal

## 🔐 Authentication & Roles

### Master Admin
- Full system access
- Can create/manage temples
- Can create/manage all users
- View all donations across all temples
- System-wide statistics
- Can backfill Stripe fees for all donations

### Temple Admin
- Temple-specific access
- Manage their temple's devices
- View/manage their temple's donations
- Configure donation categories
- Connect Stripe account (direct or Connect)
- Configure Stripe Terminal settings
- Temple-specific statistics

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns JWT token)

### Temples
- `GET /api/temples` - List temples (Master Admin: all, Temple Admin: own)
- `POST /api/temples` - Create temple (Master Admin only)
- `GET /api/temples/:id` - Get temple details
- `PATCH /api/temples/:id` - Update temple

### Users
- `GET /api/users` - List users (Master Admin: all, Temple Admin: own temple)
- `POST /api/users` - Create user (Master Admin only)
- `GET /api/users/:id` - Get user details

### Devices
- `GET /api/devices` - List devices (filtered by temple)
- `POST /api/devices` - Create device
- `POST /api/devices/activate` - Activate device with code (public endpoint)
- `GET /api/devices/:id` - Get device details
- `GET /api/devices/stripe-credentials` - Get Stripe connection token (device auth)

### Donations
- `POST /api/donations/initiate` - Initiate donation (device auth)
- `POST /api/donations/create-payment-intent` - Create Stripe PaymentIntent
- `POST /api/donations/confirm-payment-intent` - Confirm payment and get fee details
- `POST /api/donations/:id/complete` - Complete donation with donor info
- `GET /api/donations` - List donations (filtered by temple/date/status)
- `GET /api/donations/stats` - Get donation statistics
- `POST /api/donations/:id/cancel` - Cancel donation
- `POST /api/donations/:id/refund` - Refund donation
- `POST /api/donations/cleanup/backfill-stripe-fees` - Backfill fees from Stripe (Master Admin only)

### Donation Categories
- `GET /api/donation-categories` - List categories (filtered by temple)
- `GET /api/donation-categories/kiosk/:templeId` - Get categories for kiosk display
- `POST /api/donation-categories` - Create category
- `PATCH /api/donation-categories/:id` - Update category

### Stripe Integration
- `GET /api/stripe/credentials` - Get Stripe publishable key and location ID
- `POST /api/stripe/webhook` - Webhook handler for Stripe events

**Full API Documentation**: Visit `/api/docs` when backend is running (Swagger UI)

## 🛠️ Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm test

# Lint code
npm run lint

# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run
```

### Frontend Development

```bash
cd admin-web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## 🔧 Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` or `DATABASE_PUBLIC_URL` | PostgreSQL connection string (prefer `DATABASE_PUBLIC_URL` on Railway) | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_live_` for production) | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (starts with `whsec_`) | Yes |
| `CORS_ORIGIN` | Frontend URL for CORS (e.g., `https://kiosk.issousa.org`) | Yes |
| `ADMIN_WEB_URL` | Frontend URL for redirects | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | `development` or `production` | No |

### Admin Web (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

## 📱 iOS App Configuration

The iOS app is configured automatically through device activation:
- Device activation code links device to a temple
- Stripe Terminal SDK is initialized with connection tokens from backend
- Stripe M2 reader connects via Bluetooth
- All configuration is managed through the admin portal

## 🗄️ Database Schema

Key entities:
- **Users**: Master Admin and Temple Admin users
- **Temples**: Temple information and Stripe credentials (publishable key, account ID, location ID)
- **Devices**: Kiosk devices with activation codes and device tokens
- **Donations**: Donation records with Stripe PaymentIntent IDs, fees, and net amounts
- **DonationCategories**: Customizable categories per temple
- **Donors**: Donor information and statistics
- **AuditLogs**: System audit trail

See TypeORM entities in `backend/src/*/entities/` for full schema.

**Note**: TypeORM `synchronize` is disabled in production. The database schema is managed through migrations or manual setup. For Railway deployments, tables are created automatically on first connection.

## 💳 Stripe Terminal Setup

### For Each Temple:

1. **Stripe Account Setup**
   - Each temple needs a Stripe account (direct or Connect)
   - In admin portal, go to temple settings → Stripe tab
   - Enter Stripe Publishable Key (`pk_live_...`)
   - For Connect accounts, also enter Stripe Account ID

2. **Stripe Location**
   - System automatically creates/retrieves Stripe Location for each temple
   - Location ID is stored and used for Terminal reader registration

3. **Reader Registration**
   - Stripe M2 readers auto-register when connected via iOS app
   - Reader appears in Stripe Dashboard → Terminal → Readers
   - Reader status is visible in admin portal

4. **Fee Tracking**
   - Fees are automatically fetched from Stripe Balance Transaction API
   - Fees match exactly what you see in Stripe Dashboard
   - Use "Backfill Stripe Fees" button to sync existing donations

## 🔒 Security

- JWT-based authentication for web admin
- Device token authentication for kiosks
- Role-based access control (RBAC)
- Encrypted Stripe credentials storage
- CORS protection with Express-level OPTIONS handling
- Input validation and sanitization
- Railway proxy compatibility (handles preflight requests correctly)
- Stripe webhook signature verification

## 🔧 Troubleshooting

### Backend Issues

**Service not accessible:**
- Verify backend service has a public domain in Railway Settings → Networking
- Check Railway logs for errors
- Ensure all required environment variables are set

**CORS errors:**
- Verify `CORS_ORIGIN` and `ADMIN_WEB_URL` match frontend URL
- Backend automatically allows all `*.netlify.app` domains
- Check that `NEXT_PUBLIC_API_URL` in frontend matches backend URL

**Database connection issues:**
- Verify `DATABASE_PUBLIC_URL` is set correctly in Railway
- Use `DATABASE_PUBLIC_URL` (not `DATABASE_URL`) for Railway deployments
- Check Railway PostgreSQL service is running

**Stripe Integration Issues:**
- Verify Stripe secret key is correct and has Terminal permissions
- Check Stripe webhook is configured correctly
- Ensure temple has Stripe publishable key configured
- Verify Stripe location exists for the temple
- Check iOS app logs for connection errors

### Testing Endpoints

**Health Check:**
```bash
curl https://kiosk-backend.issousa.org/api/health
```

**API Root:**
```bash
curl https://kiosk-backend.issousa.org/api
```

## 📝 License

Private - ISSO Donation Kiosk System

## 🤝 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for ISSO temples**
