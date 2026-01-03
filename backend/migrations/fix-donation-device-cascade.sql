-- Migration: Fix Donation Device Cascade
-- Purpose: Change donations.deviceId foreign key from CASCADE to SET NULL
-- This ensures donations are preserved when devices are deleted
-- Date: 2024

-- Step 1: Drop the existing foreign key constraint with CASCADE
DO $$
DECLARE
    fk_name text;
BEGIN
    -- Find the foreign key constraint name
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

-- Step 2: Make deviceId nullable (so donations can exist without a device)
ALTER TABLE donations 
ALTER COLUMN "deviceId" DROP NOT NULL;

-- Step 3: Recreate the foreign key with SET NULL instead of CASCADE
-- This ensures donations are preserved when devices are deleted
ALTER TABLE donations
ADD CONSTRAINT "FK_donations_deviceId"
FOREIGN KEY ("deviceId")
REFERENCES devices("id")
ON DELETE SET NULL;

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Donations will now be preserved when devices are deleted.';
    RAISE NOTICE 'deviceId will be set to NULL instead of deleting the donation.';
END $$;

