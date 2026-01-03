#!/bin/bash

# Script to manually run the Fix Donation Device Cascade migration
# This script can be run directly on your production database

set -e

echo "=========================================="
echo "Fix Donation Device Cascade Migration"
echo "=========================================="
echo ""
echo "This migration will:"
echo "1. Drop the existing CASCADE foreign key constraint"
echo "2. Make deviceId nullable in donations table"
echo "3. Recreate foreign key with SET NULL (preserves donations)"
echo ""
echo "⚠️  IMPORTANT: This will preserve all donations when devices are deleted"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$DATABASE_PUBLIC_URL" ]; then
    echo "❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL environment variable is not set"
    echo ""
    echo "Please set one of these environment variables:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo "  OR"
    echo "  export DATABASE_PUBLIC_URL='postgresql://user:password@host:port/database'"
    echo ""
    exit 1
fi

# Use DATABASE_PUBLIC_URL if available, otherwise DATABASE_URL
DB_URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}"

echo "📡 Connecting to database..."
echo ""

# Run the migration SQL script
if command -v psql &> /dev/null; then
    echo "Using psql to run migration..."
    psql "$DB_URL" -f migrations/fix-donation-device-cascade.sql
elif command -v node &> /dev/null; then
    echo "Using Node.js to run migration..."
    cd backend
    npm run migration:run
else
    echo "❌ Error: Neither psql nor node found"
    echo "Please install PostgreSQL client (psql) or Node.js to run migrations"
    exit 1
fi

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Verification:"
echo "- Donations table now has nullable deviceId"
echo "- Foreign key uses SET NULL instead of CASCADE"
echo "- Existing donations are preserved"
echo ""

