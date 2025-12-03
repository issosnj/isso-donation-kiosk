# ISSO Donation Kiosk System - Project Summary

## Overview

A complete multi-tenant donation kiosk system for temples with Square payment integration. The system consists of three main components:

1. **Backend API** (NestJS) - REST API with authentication, device management, and Square integration
2. **iOS Kiosk App** (Swift/SwiftUI) - Native iPad app for accepting donations
3. **Admin Web Portal** (Next.js) - Browser-based admin interface for managing temples, devices, and donations

## Architecture

### Multi-Tenant Design
- Each temple has its own Square account and bank
- Master Admin can see all temples
- Temple Admin can only see their own temple
- Complete data isolation between temples

### Payment Flow
1. Donor selects amount and category on kiosk
2. Kiosk app calls backend to initiate donation
3. Square Mobile Payments SDK processes payment via Square Stand/Kiosk
4. Backend receives payment result and updates donation status
5. Square webhook confirms final payment status

## Project Structure

```
isso-donation-kiosk/
├── backend/              # NestJS REST API
│   ├── src/
│   │   ├── auth/        # Authentication & authorization
│   │   ├── users/       # User management
│   │   ├── temples/     # Temple management
│   │   ├── devices/     # Device management & activation
│   │   ├── donations/   # Donation processing
│   │   └── square/      # Square OAuth & webhooks
│   └── package.json
│
├── kiosk-app/           # iOS Swift/SwiftUI app
│   └── ISSOKiosk/
│       ├── Views/       # UI screens
│       ├── Services/    # API & Square integration
│       └── Helpers/     # Utilities
│
├── admin-web/           # Next.js admin portal
│   └── src/
│       ├── app/        # Next.js app router
│       ├── components/ # React components
│       ├── lib/        # API client
│       └── store/       # State management
│
├── README.md
├── SETUP.md
└── PROJECT_SUMMARY.md
```

## Key Features

### Backend
- ✅ JWT-based authentication
- ✅ Role-based access control (Master Admin, Temple Admin)
- ✅ Multi-tenant data isolation
- ✅ Square OAuth integration per temple
- ✅ Device activation with unique codes
- ✅ Donation lifecycle management
- ✅ Square webhook handling
- ✅ Swagger API documentation

### iOS Kiosk App
- ✅ Device activation with device code
- ✅ Donation flow with preset amounts
- ✅ Custom amount input
- ✅ Category selection
- ✅ Square Mobile Payments SDK integration
- ✅ Offline transaction queue (placeholder)
- ✅ Secure token storage (Keychain)

### Admin Web Portal
- ✅ Master Admin dashboard (all temples)
- ✅ Temple Admin dashboard (single temple)
- ✅ Donation statistics and charts
- ✅ Device management
- ✅ Donation category management
- ✅ Square account connection
- ✅ Donation filtering and export

## Database Schema

### Core Tables
- `users` - Admin users (Master Admin, Temple Admin)
- `temples` - Temple information and Square credentials
- `devices` - Kiosk devices with activation codes
- `donation_categories` - Donation categories per temple
- `donations` - All donation records
- `audit_logs` - Audit trail

## Security Features

- JWT tokens for API authentication
- Device tokens for kiosk authentication
- Encrypted storage of Square access tokens
- Role-based access control
- CORS configuration
- Input validation

## Square Integration

### OAuth Flow
1. Temple Admin clicks "Connect Square" in admin portal
2. Redirects to Square OAuth consent screen
3. Square redirects back with authorization code
4. Backend exchanges code for access token
5. Stores merchant ID, access token, and location ID

### Payment Processing
1. Kiosk app initiates donation via backend
2. App calls Square Mobile Payments SDK
3. SDK uses connected Square Stand/Kiosk hardware
4. Payment processed through Square
5. Result sent to backend
6. Square webhook confirms final status

## Deployment

### Development
- Backend: `http://localhost:3000`
- Admin Web: `http://localhost:3001`
- iOS App: Run on iPad via Xcode

### Production
- Backend: Deploy to Render/Railway/AWS
- Admin Web: Deploy to Vercel/Netlify
- iOS App: Distribute via TestFlight or MDM

## Next Steps

### Immediate
1. Set up Square Developer account
2. Configure Square application
3. Set up PostgreSQL database
4. Create initial Master Admin user
5. Test OAuth flow

### Phase 1 (Foundation)
- Complete Square Mobile Payments SDK integration
- Add offline transaction queue
- Implement device heartbeat
- Add error handling and retries

### Phase 2 (Enhancements)
- Add donation export (CSV/PDF)
- Implement analytics dashboard
- Add multi-language support
- Improve UI/UX

### Phase 3 (Scale)
- Add monitoring and logging
- Implement rate limiting
- Add backup and recovery
- Performance optimization

## Configuration

### Required Environment Variables

**Backend (.env)**
- Database connection (PostgreSQL)
- JWT secret
- Square Application ID and Secret
- Square OAuth redirect URI
- Encryption key

**Admin Web (.env)**
- `NEXT_PUBLIC_API_URL` - Backend API URL

**iOS App (Config.swift)**
- `apiBaseURL` - Backend API URL
- Info.plist: Square Application ID

## Testing

### Test Cards (Square Sandbox)
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

## Support & Documentation

- Backend API Docs: `http://localhost:3000/api/docs` (Swagger)
- Square Docs: https://developer.squareup.com/docs
- Square Mobile Payments SDK: https://developer.squareup.com/docs/mobile-payments-sdk

## License

Private - ISSO Donation Kiosk System

