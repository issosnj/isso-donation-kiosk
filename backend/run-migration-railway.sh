#!/bin/bash

# Run migration on Railway database
# This script can be used if you have Railway CLI installed

set -e

echo "=========================================="
echo "Fix Donation Device Cascade Migration"
echo "Running on Railway Database"
echo "=========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo ""
    echo "Please install Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or use the public DATABASE_URL instead of the internal one"
    echo "Get it from Railway dashboard > PostgreSQL service > Variables"
    exit 1
fi

echo "📡 Running migration via Railway CLI..."
echo ""

# Run the migration SQL via Railway
railway run psql -f migrations/fix-donation-device-cascade.sql

echo ""
echo "✅ Migration completed!"
echo ""

