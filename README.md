a# ISSO Donation Kiosk System

A modern, multi-tenant donation kiosk system for temples with Square payment integration. Features a NestJS backend, Next.js admin portal, and native iOS kiosk app.

## 🏗️ Architecture

- **Backend**: NestJS REST API with PostgreSQL (deployed on Railway)
- **Admin Web**: Next.js web portal for temple and master admins (deployed on Netlify)
- **Kiosk App**: Native iOS app (Swift/SwiftUI) with Square Mobile Payments SDK

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

- **Multi-tenant Architecture**: Each temple has separate Square account and data isolation
- **Role-Based Access Control**: Master Admin (system-wide) and Temple Admin (temple-specific)
- **Square Integration**: OAuth per temple, Mobile Payments SDK for kiosks, webhook handling
- **Device Management**: Activation codes, device tracking, and status monitoring
- **Donation Processing**: Real-time payment processing via Square Mobile Payments SDK
- **Admin Dashboards**: Comprehensive CRM-style interface with statistics and reporting
- **Donation Categories**: Customizable categories per temple
- **Audit Logging**: Complete audit trail of all actions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Railway's managed PostgreSQL)
- Xcode 15+ (for iOS app development)
- Square Developer Account
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

# Square (get from Square Developer Dashboard)
# See SQUARE_SETUP.md for detailed setup instructions
SQUARE_APPLICATION_ID=your-square-app-id
SQUARE_APPLICATION_SECRET=your-square-app-secret
SQUARE_REDIRECT_URI=http://localhost:3000/api/square/callback
SQUARE_ENVIRONMENT=sandbox  # or 'production'

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

- **Backend API**: `https://isso-donation-kiosk-production.up.railway.app`
- **Admin Web Portal**: `https://issodonationkiosk.netlify.app`
- **API Documentation**: `https://isso-donation-kiosk-production.up.railway.app/api/docs`

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
     SQUARE_APPLICATION_ID=your-square-app-id
     SQUARE_APPLICATION_SECRET=your-square-app-secret
     SQUARE_ENVIRONMENT=sandbox
     CORS_ORIGIN=https://your-app.netlify.app
     ADMIN_WEB_URL=https://your-app.netlify.app
     NODE_ENV=production
     PORT=3000
     ```

4. **Deploy**
   - Railway will automatically deploy on push to main
   - Get your backend URL from Railway (e.g., `https://isso-donation-kiosk-production.up.railway.app`)
   - The backend automatically handles CORS for Netlify domains

5. **Create Admin User**
   - Use Railway Shell or run locally with `DATABASE_URL` set:
     ```bash
     DATABASE_URL="your-railway-db-url" npm run seed:admin
     ```

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
     NEXT_PUBLIC_API_URL=https://isso-donation-kiosk-production.up.railway.app/api
     ```
   - **Important**: Use the exact backend URL from Railway

4. **Deploy**
   - Netlify will automatically deploy on push to main
   - Your admin portal will be live at `https://issodonationkiosk.netlify.app`

5. **Update Backend CORS**
   - In Railway backend variables, set:
     ```
     CORS_ORIGIN=https://issodonationkiosk.netlify.app
     ADMIN_WEB_URL=https://issodonationkiosk.netlify.app
     ```
   - The backend automatically allows all `*.netlify.app` URLs for CORS
   - Setting `ADMIN_WEB_URL` ensures proper redirects for Square OAuth

### iOS App (TestFlight/MDM)

1. **Build for Distribution**
   - Open `kiosk-app/ISSOKiosk.xcodeproj` in Xcode
   - Configure signing with your Apple Developer account
   - Archive and upload to App Store Connect

2. **Distribute via TestFlight**
   - Add testers in App Store Connect
   - Or distribute via MDM for kiosk devices

3. **Configure API Endpoint**
   - Update `Config.swift` with your Railway backend URL

## 🔐 Authentication & Roles

### Master Admin
- Full system access
- Can create/manage temples
- Can create/manage all users
- View all donations across all temples
- System-wide statistics

### Temple Admin
- Temple-specific access
- Manage their temple's devices
- View/manage their temple's donations
- Configure donation categories
- Connect Square account
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

### Donations
- `POST /api/donations/initiate` - Initiate donation (device auth)
- `POST /api/donations/:id/complete` - Complete donation with Square payment
- `GET /api/donations` - List donations (filtered by temple/date/status)
- `GET /api/donations/stats` - Get donation statistics

### Donation Categories
- `GET /api/donation-categories` - List categories (filtered by temple)
- `POST /api/donation-categories` - Create category
- `PATCH /api/donation-categories/:id` - Update category

### Square Integration
- `GET /api/square/connect?templeId=xxx` - Get Square OAuth URL
- `GET /api/square/callback` - OAuth callback handler
- `POST /api/square/webhook` - Webhook handler for Square events

**📖 Square Setup Guide**: See [SQUARE_SETUP.md](./SQUARE_SETUP.md) for detailed setup instructions

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
| `SQUARE_APPLICATION_ID` | Square application ID | Yes |
| `SQUARE_APPLICATION_SECRET` | Square application secret | Yes |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` | Yes |
| `CORS_ORIGIN` | Frontend URL for CORS (e.g., `https://issodonationkiosk.netlify.app`) | Yes |
| `ADMIN_WEB_URL` | Frontend URL for Square OAuth redirects | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | `development` or `production` | No |

### Admin Web (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |

## 📱 iOS App Configuration

Update `kiosk-app/ISSOKiosk/Config.swift`:

```swift
struct Config {
    static let apiBaseURL = "https://isso-donation-kiosk-production.up.railway.app/api"
    static let squareApplicationId = "your-square-app-id"
    static let squareLocationId = "your-square-location-id" // Set after OAuth
}
```

## 🗄️ Database Schema

Key entities:
- **Users**: Master Admin and Temple Admin users
- **Temples**: Temple information and Square credentials
- **Devices**: Kiosk devices with activation codes
- **Donations**: Donation records with Square payment IDs
- **DonationCategories**: Customizable categories per temple
- **AuditLogs**: System audit trail

See TypeORM entities in `backend/src/*/entities/` for full schema.

**Note**: TypeORM `synchronize` is disabled in production. The database schema is managed through migrations or manual setup. For Railway deployments, tables are created automatically on first connection.

## 🔒 Security

- JWT-based authentication for web admin
- Device token authentication for kiosks
- Role-based access control (RBAC)
- Encrypted Square credentials storage
- CORS protection with Express-level OPTIONS handling
- Input validation and sanitization
- Railway proxy compatibility (handles preflight requests correctly)

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

**Square Integration Issues:**
- See [SQUARE_SETUP.md](./SQUARE_SETUP.md) for setup guide
- See [SQUARE_VERIFICATION.md](./SQUARE_VERIFICATION.md) for verification checklist
- Verify redirect URI matches exactly (no trailing slash, HTTPS only)

### Testing Endpoints

**Health Check:**
```bash
curl https://isso-donation-kiosk-production.up.railway.app/health
```

**API Root:**
```bash
curl https://isso-donation-kiosk-production.up.railway.app/api
```

## 📝 License

Private - ISSO Donation Kiosk System

## 🤝 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for ISSO temples**
