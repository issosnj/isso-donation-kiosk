# Restore Deleted Donations from Square

## Overview

This script restores donations that were deleted when devices were removed. It queries Square API to find payments that don't have corresponding donation records in the database and recreates them.

## How It Works

1. **Fetches Square Payments**: Queries Square API for completed payments from the last 90 days
2. **Compares with Database**: Checks which Square payments don't have corresponding donations
3. **Recreates Donations**: Creates donation records for missing payments with `deviceId = NULL` (since the device was deleted)

## Prerequisites

- Temple must have Square connected (`squareAccessToken` and `squareLocationId` configured)
- Square API access with `PAYMENTS_READ` scope (already included in OAuth)

## Usage

### Option 1: Run Locally (with Production Database)

```bash
cd backend

# Set your production DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@host:port/database"

# Run the restoration script
npm run restore:donations
```

### Option 2: Run on Railway

```bash
# Using Railway CLI
railway run npm run restore:donations

# Or connect to Railway shell and run
railway shell
npm run restore:donations
```

## What Gets Restored

For each missing Square payment, the script creates a donation record with:

- ✅ **Amount**: From Square payment
- ✅ **Square Payment ID**: Links to Square transaction
- ✅ **Net Amount**: Amount after Square fees
- ✅ **Square Fee**: Processing fee
- ✅ **Card Info**: Last 4 digits and card type (if available)
- ✅ **Status**: SUCCEEDED (for completed payments)
- ✅ **Created Date**: Original payment date from Square
- ✅ **Device ID**: Set to `NULL` (since device was deleted)
- ✅ **Temple ID**: From the temple that processed the payment

## Customization

### Change Date Range

Edit `src/scripts/restore-deleted-donations.ts`:

```typescript
// Default: Last 90 days
const beginTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

// Change to last 180 days:
const beginTime = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

// Or specify exact dates:
const beginTime = '2024-01-01T00:00:00Z';
const endTime = '2024-12-31T23:59:59Z';
```

### Restore Specific Temple

You can modify the script to only process a specific temple:

```typescript
// In restoreDonationsFromSquare function, replace:
const templesWithSquare = await dataSource
  .getRepository(Temple)
  .createQueryBuilder('temple')
  .where('temple.squareAccessToken IS NOT NULL')
  .andWhere('temple.squareLocationId IS NOT NULL')
  .getMany();

// With:
const templesWithSquare = await dataSource
  .getRepository(Temple)
  .createQueryBuilder('temple')
  .where('temple.id = :templeId', { templeId: 'your-temple-id-here' })
  .andWhere('temple.squareAccessToken IS NOT NULL')
  .andWhere('temple.squareLocationId IS NOT NULL')
  .getMany();
```

## Output Example

```
==========================================
Restore Deleted Donations from Square
==========================================

✅ Database connection established

Found 1 temple(s) with Square connected

Processing temple: ISSO SNJ (74ac7b87-2659-4b8b-ae9d-82782106c2bf)
Square Location ID: L4A0HEGHATFCF

Fetching Square payments from 2024-10-04T... to 2025-01-02T...
Found 15 completed payment(s) in Square

Found 6 existing donation(s) in database

Found 9 payment(s) without corresponding donations

  ✅ Restored donation: $11.00 (Payment ID: abc12345...)
  ✅ Restored donation: $25.00 (Payment ID: def67890...)
  ...

==========================================
Restoration Summary
==========================================
✅ Restored: 9 donation(s)
⏭️  Skipped: 0 donation(s)
❌ Errors: 0
```

## Important Notes

- ⚠️ **Safe Operation**: The script only creates new donations, it doesn't modify or delete existing ones
- ✅ **Idempotent**: You can run it multiple times - it will skip donations that already exist
- 🔒 **Device ID**: All restored donations will have `deviceId = NULL` since the device was deleted
- 📅 **Date Range**: By default, it only checks the last 90 days. Adjust if you need older data
- 🔍 **Square API Limits**: Square API may have rate limits. The script processes payments sequentially

## Troubleshooting

### "No temples found with Square connected"
- Make sure your temple has `squareAccessToken` and `squareLocationId` configured
- Check the database to verify Square credentials are set

### "Square API error"
- Verify Square access token is valid
- Check that the token has `PAYMENTS_READ` scope
- Ensure Square location ID is correct

### "No missing donations to restore"
- All Square payments already have corresponding donations in the database
- Try expanding the date range if you're looking for older donations

## Verification

After running the script, verify restored donations:

```sql
-- Check donations with NULL deviceId (restored donations)
SELECT 
  id,
  amount,
  "donorName",
  "squarePaymentId",
  "deviceId",
  "createdAt"
FROM donations
WHERE "deviceId" IS NULL
ORDER BY "createdAt" DESC;
```

