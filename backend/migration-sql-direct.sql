-- Copy and paste this entire SQL into Railway's database query interface
-- Railway Dashboard > PostgreSQL Service > Data > Query

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

