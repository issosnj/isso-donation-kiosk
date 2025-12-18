# Create Master Admin User

## Option 1: Using the Seed Script (Recommended)

### Run locally (if you have database access):
```bash
cd backend
npm run seed:admin
```

Or with custom credentials:
```bash
MASTER_ADMIN_EMAIL=admin@isso.org MASTER_ADMIN_PASSWORD=yourpassword npm run seed:admin
```

### Run on Railway (using Railway CLI):

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```

4. **Run the seed script**:
   ```bash
   railway run npm run seed:admin
   ```

   Or with custom credentials:
   ```bash
   railway run --env MASTER_ADMIN_EMAIL=admin@isso.org --env MASTER_ADMIN_PASSWORD=yourpassword npm run seed:admin
   ```

## Option 2: Using Railway Shell

1. Go to your Railway backend service
2. Click on the service → **Shell** tab
3. Run:
   ```bash
   npm run seed:admin
   ```

## Option 3: Direct Database Access (Advanced)

If you have direct database access, you can create the user directly:

```sql
INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Master Admin',
  'admin@isso.org',
  '$2b$10$...', -- bcrypt hash of your password
  'MASTER_ADMIN',
  NOW(),
  NOW()
);
```

## Default Credentials

If you don't specify environment variables, the script uses:
- **Email**: `admin@isso.org`
- **Password**: `admin123456`
- **Name**: `Master Admin`

⚠️ **Important**: Change the password immediately after first login!

## After Creating Admin

1. Go to your admin web: https://issodonationkiosk.netlify.app
2. Login with the credentials you created
3. Change your password (you may need to add a password change feature)
4. Create temples and other users as needed

