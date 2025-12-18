# ISSO Donation Kiosk - Admin Web Portal

Next.js admin portal for managing temples, devices, donations, and Square integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file and configure:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

For production, set this to your Railway backend URL:
```env
NEXT_PUBLIC_API_URL=https://isso-donation-kiosk-production.up.railway.app/api
```

**Note**: This must be set as an environment variable in Netlify:
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` with the value above
3. Redeploy the site

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) (Next.js default port)

## Features

### Master Admin
- View all temples
- Manage users
- Global donation overview
- Temple management

### Temple Admin
- Temple dashboard with statistics
- Donation management and filtering
- Device management and activation codes
- Donation category management
- Square account connection

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- TanStack Query (React Query)
- Zustand (State Management)

