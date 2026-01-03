# Restoring Deleted Donation Data

## Current Situation

Unfortunately, **data that was deleted before the migration cannot be automatically restored** from the database. When donations were deleted due to the CASCADE foreign key constraint, they were permanently removed from the database.

## Options to Restore Data

### Option 1: Railway Database Backups (Recommended)

Railway provides automatic backups for PostgreSQL databases. Check if you have backups available:

1. **Go to Railway Dashboard**
   - Navigate to your PostgreSQL service
   - Look for "Backups" or "Data" tab
   - Check if there are any automatic backups available

2. **Restore from Backup**
   - If backups exist, you can restore to a point before the device deletion
   - This will restore ALL data from that point in time
   - ⚠️ **Warning**: This will overwrite current data

### Option 2: Check Audit Logs

The system has an `audit_logs` table that might contain information about deleted donations:

```sql
-- Check audit logs for donation-related actions
SELECT action, metadata, "createdAt" 
FROM audit_logs 
WHERE action LIKE '%donation%' OR action LIKE '%delete%'
ORDER BY "createdAt" DESC;
```

If audit logs contain donation data, you could potentially recreate donations from the metadata.

### Option 3: External Data Sources

Check if you have:
- **Square Payment Records**: Square dashboard might have payment history
- **Email Receipts**: If receipts were sent, they contain donation details
- **Application Logs**: Check server logs for donation records
- **Export Files**: Any CSV or export files from before the deletion

### Option 4: Manual Recreation

If you have records of the donations (from Square, emails, etc.), you can manually recreate them:

```sql
-- Example: Insert a donation record
INSERT INTO donations (
  id, 
  "templeId", 
  "deviceId",  -- Can be NULL now
  amount, 
  "donorName", 
  "donorEmail",
  status,
  "createdAt"
) VALUES (
  gen_random_uuid(),
  'temple-id-here',
  NULL,  -- NULL since device was deleted
  100.00,
  'Donor Name',
  'donor@email.com',
  'SUCCEEDED',
  '2024-01-01 12:00:00'  -- Original donation date
);
```

## Prevention for Future

✅ **Migration Complete**: The migration has been applied, so future device deletions will NOT delete donations.

✅ **Current Protection**: All existing donations are now protected. When devices are deleted:
- Donations remain in the database
- `deviceId` is set to `NULL`
- All donation data is preserved

## Next Steps

1. **Check Railway Backups** - This is your best option for full data recovery
2. **Review Audit Logs** - See if there's any record of deleted donations
3. **Check External Sources** - Square dashboard, email receipts, etc.
4. **Contact Railway Support** - They may have additional backup options

## Query to Check Current State

```sql
-- See current donations (including those without devices)
SELECT 
  d.id,
  d.amount,
  d."donorName",
  d."deviceId",
  d."createdAt",
  CASE 
    WHEN d."deviceId" IS NULL THEN 'Device Deleted'
    ELSE 'Active Device'
  END as status
FROM donations d
ORDER BY d."createdAt" DESC;
```

