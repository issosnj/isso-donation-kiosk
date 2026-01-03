# Migration Instructions: Fix Donation Device Cascade

## Problem
When a device is deleted from a temple, all donations associated with that device are also deleted due to CASCADE foreign key constraint. This causes data loss.

## Solution
Change the foreign key constraint from `CASCADE` to `SET NULL`, so donations are preserved when devices are deleted (deviceId becomes NULL).

## Migration Files
- **TypeORM Migration**: `src/migrations/1734567907000-FixDonationDeviceCascade.ts`
- **SQL Script**: `migrations/fix-donation-device-cascade.sql`
- **Shell Script**: `scripts/run-migration-psql.sh`

## How to Run the Migration

### Option 1: Using TypeORM (Recommended for Development)
```bash
cd backend
npm run migration:run
```

### Option 2: Using SQL Script Directly (Production)
```bash
# Using psql with DATABASE_URL
psql $DATABASE_URL -f migrations/fix-donation-device-cascade.sql

# Or with explicit connection string
psql "postgresql://user:password@host:port/database" -f migrations/fix-donation-device-cascade.sql
```

### Option 3: Using Shell Script
```bash
cd backend
./scripts/run-migration-psql.sh
# Or with explicit database URL
./scripts/run-migration-psql.sh "postgresql://user:password@host:port/database"
```

### Option 4: Manual SQL Execution
Connect to your database and run:

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

## What This Migration Does

1. **Drops** the existing foreign key constraint that uses `CASCADE`
2. **Makes** `deviceId` nullable in the donations table
3. **Recreates** the foreign key with `SET NULL` instead of `CASCADE`

## Result

- ✅ Donations are **preserved** when devices are deleted
- ✅ `deviceId` is set to `NULL` instead of deleting the donation
- ✅ All donation data (amount, donor info, payment details) remains intact
- ✅ Historical records are maintained regardless of device lifecycle

## Verification

After running the migration, verify it worked:

```sql
-- Check that deviceId is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'donations' AND column_name = 'deviceId';
-- Should show: is_nullable = 'YES'

-- Check foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'donations' 
  AND kcu.column_name = 'deviceId';
-- Should show: delete_rule = 'SET NULL'
```

## Rollback (If Needed)

If you need to revert this migration:

```sql
-- Drop SET NULL constraint
ALTER TABLE donations DROP CONSTRAINT IF EXISTS "FK_donations_deviceId";

-- Make deviceId NOT NULL again (will fail if there are NULL values)
ALTER TABLE donations ALTER COLUMN "deviceId" SET NOT NULL;

-- Recreate CASCADE constraint
ALTER TABLE donations
ADD CONSTRAINT "FK_donations_deviceId"
FOREIGN KEY ("deviceId")
REFERENCES devices("id")
ON DELETE CASCADE;
```

## Important Notes

- ⚠️ **Backup your database** before running migrations in production
- ⚠️ This migration is **safe** - it only changes the foreign key behavior, not the data
- ✅ **No data loss** - all existing donations are preserved
- ✅ **Backward compatible** - existing code will continue to work

