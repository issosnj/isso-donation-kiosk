# Run Migration on Production Database

## Quick Method: Using Production DATABASE_URL

If you have access to your production `DATABASE_URL` (from Railway, Heroku, etc.):

### Option 1: Direct SQL Execution (Recommended)
```bash
# Set your production database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run the SQL script directly
psql $DATABASE_URL -f migrations/fix-donation-device-cascade.sql
```

### Option 2: Using the Shell Script
```bash
cd backend
export DATABASE_URL="postgresql://user:password@host:port/database"
./scripts/run-migration-psql.sh
```

### Option 3: Manual SQL (if you have database access)
Copy and paste this SQL into your database admin tool (Railway dashboard, pgAdmin, etc.):

```sql
-- Step 1: Drop existing CASCADE foreign key
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'donations'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%deviceId%';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE donations DROP CONSTRAINT IF EXISTS %I', fk_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', fk_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found for deviceId';
    END IF;
END $$;

-- Step 2: Make deviceId nullable
ALTER TABLE donations 
ALTER COLUMN "deviceId" DROP NOT NULL;

-- Step 3: Recreate foreign key with SET NULL
ALTER TABLE donations
ADD CONSTRAINT "FK_donations_deviceId"
FOREIGN KEY ("deviceId")
REFERENCES devices("id")
ON DELETE SET NULL;
```

## For Railway Users

1. **Get your DATABASE_URL from Railway:**
   - Go to your Railway project
   - Click on your PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` or `DATABASE_PUBLIC_URL`

2. **Run the migration:**
   ```bash
   # Set the DATABASE_URL
   export DATABASE_URL="your-railway-database-url"
   
   # Run the SQL script
   psql $DATABASE_URL -f backend/migrations/fix-donation-device-cascade.sql
   ```

   Or use Railway CLI:
   ```bash
   railway run psql $DATABASE_URL -f migrations/fix-donation-device-cascade.sql
   ```

## For Heroku Users

```bash
# Get DATABASE_URL from Heroku
heroku config:get DATABASE_URL -a your-app-name

# Run migration
heroku pg:psql -a your-app-name < backend/migrations/fix-donation-device-cascade.sql
```

## Verify Migration Success

After running, verify it worked:

```sql
-- Check that deviceId is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'donations' AND column_name = 'deviceId';
-- Should show: is_nullable = 'YES'

-- Check foreign key uses SET NULL
SELECT 
    tc.constraint_name, 
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'donations' 
  AND tc.constraint_type = 'FOREIGN KEY';
-- Should show: delete_rule = 'SET NULL'
```

## Important Notes

- ⚠️ **This migration is safe** - it only changes the foreign key behavior
- ✅ **No data loss** - all existing donations are preserved
- ✅ **Backward compatible** - existing code continues to work
- 🔒 **Backup recommended** - always backup before production migrations

