#!/bin/bash

# Direct PostgreSQL migration script
# Usage: ./run-migration-psql.sh [DATABASE_URL]

set -e

DB_URL="${1:-${DATABASE_URL:-${DATABASE_PUBLIC_URL}}}"

if [ -z "$DB_URL" ]; then
    echo "❌ Error: Database URL not provided"
    echo ""
    echo "Usage:"
    echo "  ./run-migration-psql.sh 'postgresql://user:password@host:port/database'"
    echo ""
    echo "Or set environment variable:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo "  ./run-migration-psql.sh"
    echo ""
    exit 1
fi

echo "=========================================="
echo "Fix Donation Device Cascade Migration"
echo "=========================================="
echo ""
echo "Database: $DB_URL" | sed 's/:[^:@]*@/:***@/g'  # Hide password
echo ""

# Step 1: Drop existing foreign key
echo "Step 1: Dropping existing CASCADE foreign key..."
psql "$DB_URL" <<EOF
DO \$\$
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
END \$\$;
EOF

# Step 2: Make deviceId nullable
echo ""
echo "Step 2: Making deviceId nullable..."
psql "$DB_URL" -c "ALTER TABLE donations ALTER COLUMN \"deviceId\" DROP NOT NULL;"

# Step 3: Recreate foreign key with SET NULL
echo ""
echo "Step 3: Creating new SET NULL foreign key..."
psql "$DB_URL" <<EOF
ALTER TABLE donations
ADD CONSTRAINT "FK_donations_deviceId"
FOREIGN KEY ("deviceId")
REFERENCES devices("id")
ON DELETE SET NULL;
EOF

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Changes applied:"
echo "  ✓ deviceId is now nullable"
echo "  ✓ Foreign key uses SET NULL (preserves donations)"
echo "  ✓ All existing donations are preserved"
echo ""

