# Railway Environment Variables Configuration

## Database Variables (from PostgreSQL Service)

Railway automatically provides these variables. You can reference them in your backend service.

### Option 1: Use Railway's Service Reference (Recommended)

In your backend service's Variables tab, Railway can automatically inject PostgreSQL variables if you reference the PostgreSQL service. But if you need to set them manually, use:

```
DB_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=5432
DB_USERNAME=${{Postgres.POSTGRES_USER}}
DB_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
DB_DATABASE=${{Postgres.POSTGRES_DB}}
```

### Option 2: Use Direct Values (from your PostgreSQL service)

Based on your PostgreSQL service variables, set these in your backend service:

```
DB_HOST=${{RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll
DB_DATABASE=railway
```

**OR** use the Railway service reference syntax (replace `Postgres` with your PostgreSQL service name):

```
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}
```

## Complete Backend Service Environment Variables

Add all of these to your backend service's Variables tab:

### Database (from PostgreSQL service)
```
DB_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=5432
DB_USERNAME=${{Postgres.POSTGRES_USER}}
DB_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
DB_DATABASE=${{Postgres.POSTGRES_DB}}
```

### Application
```
NODE_ENV=production
PORT=3000
```

### Authentication
```
JWT_SECRET=<generate a strong random string - use: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
```

### Square Integration
```
SQUARE_APPLICATION_ID=<your-square-application-id>
SQUARE_APPLICATION_SECRET=<your-square-application-secret>
SQUARE_ENVIRONMENT=production
SQUARE_REDIRECT_URI=https://your-backend.railway.app/api/square/callback
```

### Encryption (for storing Square tokens)
```
ENCRYPTION_KEY=<generate 32 character string - use: openssl rand -hex 16>
```

### Frontend URL
```
ADMIN_WEB_URL=https://your-admin-web.vercel.app
```

## Quick Setup Steps

1. **In Railway Dashboard:**
   - Go to your backend service
   - Click on "Variables" tab
   - Click "New Variable"

2. **Add each variable** using one of these methods:
   - **Method A**: Reference PostgreSQL service variables using `${{Postgres.VARIABLE_NAME}}`
   - **Method B**: Copy the actual values from your PostgreSQL service

3. **Generate secrets:**
   ```bash
   # Generate JWT_SECRET
   openssl rand -base64 32
   
   # Generate ENCRYPTION_KEY (32 characters)
   openssl rand -hex 16
   ```

4. **Get your Railway app URL:**
   - Go to your backend service → Settings → Networking
   - Copy the generated domain (e.g., `isso-backend-production.up.railway.app`)
   - Use this for `SQUARE_REDIRECT_URI`

## Important Notes

- **Never commit secrets to Git** - Railway variables are secure
- **Use service references** (`${{ServiceName.VAR}}`) when possible - Railway will automatically sync
- **Update Square OAuth Redirect URI** in Square Dashboard to match your Railway URL
- **Test database connection** after setting variables

## Testing Database Connection

After setting variables, check the logs to ensure:
1. Database connection succeeds
2. TypeORM synchronizes tables (or migrations run)
3. No connection errors appear

If you see connection errors, verify:
- All DB_* variables are set correctly
- PostgreSQL service is running
- Private networking is enabled (Railway handles this automatically)

