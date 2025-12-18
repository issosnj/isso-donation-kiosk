# ISSO Donation Kiosk - Setup Guide

This guide will help you set up the complete ISSO Donation Kiosk system.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Xcode 15+ (for iOS app)
- Square Developer Account
- iPad with Square Stand or Square Kiosk hardware

## 1. Backend Setup

### Database Setup

1. Create PostgreSQL database:
```bash
createdb isso_donation_kiosk
```

2. Navigate to backend directory:
```bash
cd backend
```

3. Install dependencies:
```bash
npm install
```

4. Configure environment:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database credentials
- JWT secret (generate a strong random string)
- Square Application ID and Secret
- Square OAuth redirect URI

5. Run migrations (if using TypeORM migrations):
```bash
npm run migration:run
```

Or let TypeORM auto-sync in development (already configured).

6. Start the backend:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`
API documentation (Swagger) at `http://localhost:3000/api/docs`

### Create Initial Master Admin

You'll need to create a master admin user. You can do this via the API:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Master Admin",
    "email": "admin@example.com",
    "password": "securepassword",
    "role": "MASTER_ADMIN"
  }'
```

Or create a seed script to initialize the database.

## 2. Square Setup

1. Go to [Square Developer Dashboard](https://developer.squareup.com/)

2. Create a new application

3. Configure OAuth:
   - Add redirect URI: `http://localhost:3000/api/square/callback` (for dev)
   - For production: `https://yourdomain.com/api/square/callback`

4. Get your Application ID and Application Secret

5. Update backend `.env`:
```
SQUARE_APPLICATION_ID=your_application_id
SQUARE_APPLICATION_SECRET=your_application_secret
SQUARE_ENVIRONMENT=sandbox
SQUARE_REDIRECT_URI=http://localhost:3000/api/square/callback
```

6. Configure webhook (for production):
   - In Square Dashboard, set webhook URL to: `https://yourdomain.com/api/square/webhook`
   - Subscribe to `payment.updated` events

## 3. Admin Web Portal Setup

1. Navigate to admin-web directory:
```bash
cd admin-web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

Edit `.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

4. Start development server:
```bash
npm run dev
```

The admin portal will be available at `http://localhost:3001`

## 4. iOS Kiosk App Setup

1. Open Xcode and create a new iOS App project:
   - Product Name: ISSOKiosk
   - Team: Your development team
   - Bundle Identifier: `com.isso.kiosk` (or your own)
   - Interface: SwiftUI
   - Language: Swift

2. Copy files from `kiosk-app/ISSOKiosk/` to your Xcode project

3. Add Square Mobile Payments SDK:
   - In Xcode: File > Add Packages
   - Add: `https://github.com/square/square-mobile-payments-sdk-ios`
   - Or use CocoaPods if preferred

4. Configure Info.plist:
   - Add your Square Application ID
   - Configure bundle ID in Square Developer Dashboard

5. Update `Config.swift`:
   - Set `apiBaseURL` to your backend URL

6. Build and run on iPad:
   - Connect iPad via USB
   - Select iPad as target device
   - Build and run (Cmd+R)

## 5. Initial Setup Flow

### For Master Admin:

1. Login to admin portal at `http://localhost:3001`

2. Create a temple:
   - Go to Temples tab
   - Click "Create Temple"
   - Fill in temple details

3. Create Temple Admin user:
   - Go to Users tab
   - Create user with role `TEMPLE_ADMIN`
   - Assign to the temple

### For Temple Admin:

1. Login to admin portal

2. Connect Square account:
   - Go to Square tab
   - Click "Connect Square"
   - Complete OAuth flow

3. Create donation categories:
   - Go to Categories tab
   - Create categories (e.g., General, Annakut, Festival)
   - Enable "Show on Kiosk" for categories to appear

4. Create devices:
   - Go to Devices tab
   - Click "Create Device"
   - Enter device label (e.g., "Front Lobby Kiosk")
   - Copy the generated device code

### For Kiosk Setup:

1. On iPad, open the ISSOKiosk app

2. Enter the device code from admin portal

3. App will activate and download temple configuration

4. Kiosk is ready to accept donations!

## 6. Testing

### Test Payment Flow:

1. Use Square test cards:
   - Success: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date

2. Process a test donation through the kiosk

3. Verify in admin portal that donation appears

### Test Webhook (Production):

1. Use Square webhook testing tool
2. Send test `payment.updated` event
3. Verify donation status updates in database

## 7. Production Deployment

### Backend:

1. Set environment variables on hosting platform (Render, Railway, AWS, etc.)

2. Use managed PostgreSQL database

3. Update CORS settings for production domain

4. Configure Square webhook URL

5. Use strong JWT secret and encryption key

### Admin Web:

1. Deploy to Netlify, Railway, or similar:
```bash
npm run build
```

2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your production API URL

### iOS App:

1. For pilot: Use TestFlight
2. For production: Use MDM solution (Intune, Kandji, Mosyle, etc.)
3. Configure single-app mode on iPad
4. Set app to auto-launch on boot

## 8. Security Checklist

- [ ] Use strong JWT secrets
- [ ] Encrypt Square access tokens in database
- [ ] Enable HTTPS for all endpoints
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 9. Troubleshooting

### Backend won't start:
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Check port 3000 is available

### Square OAuth fails:
- Verify redirect URI matches Square dashboard
- Check Application ID and Secret
- Ensure OAuth scopes are correct

### Kiosk app can't activate:
- Verify device code is correct
- Check backend API is accessible
- Verify device token is being generated

### Payments not processing:
- Verify Square account is connected
- Check Square location ID is set
- Ensure Mobile Payments SDK is properly configured
- Check Square Stand/Kiosk is connected

## Support

For issues or questions, refer to:
- Backend API docs: `http://localhost:3000/api/docs`
- Square Developer Docs: https://developer.squareup.com/docs
- Square Mobile Payments SDK: https://developer.squareup.com/docs/mobile-payments-sdk

