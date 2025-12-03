# ISSO Donation Kiosk System

A multi-tenant donation kiosk system for temples with Square payment integration.

## Architecture

- **Backend**: NestJS REST API with PostgreSQL
- **Kiosk App**: Native iOS app (Swift/SwiftUI) with Square Mobile Payments SDK
- **Admin Web**: Next.js web portal for temple and master admins

## Project Structure

```
isso-donation-kiosk/
├── backend/          # NestJS API
├── kiosk-app/        # iOS Swift/SwiftUI app
├── admin-web/        # Next.js admin portal
└── README.md
```

## Getting Started

See individual README files in each directory for setup instructions.

## Features

- Multi-tenant architecture (each temple has separate Square account)
- Role-based access control (Master Admin, Temple Admin)
- Square OAuth integration per temple
- Device activation and management
- Real-time donation processing via Square Mobile Payments SDK
- Comprehensive admin dashboards and reporting

