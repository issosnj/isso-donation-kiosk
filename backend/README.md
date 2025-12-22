# ISSO Donation Kiosk - Backend API

NestJS REST API for the ISSO Donation Kiosk system.

## Features

- Multi-tenant architecture
- JWT-based authentication
- Role-based access control (Master Admin, Temple Admin)
- Square OAuth integration
- Device management and activation
- Donation processing and tracking
- Square webhook handling

## Tech Stack

- NestJS 10
- TypeScript
- PostgreSQL with TypeORM
- JWT authentication
- Square API integration
- Swagger/OpenAPI documentation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment (copy `.env.example` to `.env`)

3. Start PostgreSQL database

4. Run the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Once running, visit: `http://localhost:3000/api/docs`

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `DATABASE_URL` or `DATABASE_PUBLIC_URL`: PostgreSQL connection (prefer `DATABASE_PUBLIC_URL` on Railway)
- `JWT_SECRET`: Secret for JWT tokens
- `SQUARE_APPLICATION_ID`: Square app ID
- `SQUARE_APPLICATION_SECRET`: Square app secret
- `SQUARE_ENVIRONMENT`: `sandbox` or `production`
- `GOOGLE_PLACES_API_KEY`: Google Places API key for address autocomplete (optional, but required for address autocomplete feature)
- `CORS_ORIGIN`: Frontend URL for CORS (e.g., `https://kiosk.issousa.org`)
- `ADMIN_WEB_URL`: Frontend URL for Square OAuth redirects
- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 3000)

## CORS Configuration

The backend automatically handles CORS for:
- URLs specified in `CORS_ORIGIN` and `ADMIN_WEB_URL`
- All `*.netlify.app` domains (flexible matching)
- Local development URLs (`http://localhost:3000`, `http://localhost:3001`)

OPTIONS preflight requests are handled at the Express level to work with Railway's proxy.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Temples
- `GET /api/temples` - List temples
- `POST /api/temples` - Create temple (Master Admin)
- `GET /api/temples/:id` - Get temple
- `PATCH /api/temples/:id` - Update temple

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `POST /api/devices/activate` - Activate device (public)
- `GET /api/devices/:id` - Get device

### Donations
- `POST /api/donations/initiate` - Initiate donation
- `POST /api/donations/:id/complete` - Complete donation
- `GET /api/donations` - List donations
- `GET /api/donations/stats` - Get statistics

### Square
- `GET /api/square/connect` - Get OAuth URL
- `GET /api/square/callback` - OAuth callback
- `POST /api/square/webhook` - Webhook handler

## Database Schema

See TypeORM entities in `src/*/entities/` for schema details.

## Development

Run tests:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

Generate migration:
```bash
npm run migration:generate -- -n MigrationName
```

Run migrations:
```bash
npm run migration:run
```

