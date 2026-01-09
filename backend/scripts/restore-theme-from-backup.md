# How to Restore Previous Theme from Database Backup

## Option 1: Restore from Railway Database Backup

Since your database is hosted on Railway, you can restore from a point-in-time backup:

1. **Go to Railway Dashboard:**
   - Navigate to your Railway project
   - Find the PostgreSQL database service
   - Look for the "Backups" or "Data" tab

2. **Find a backup before the update:**
   - Look for backups from before: `2026-01-09T05:53:21.029Z`
   - Railway typically keeps automatic backups

3. **Restore the backup:**
   - Railway may have a "Restore" or "Point-in-time recovery" option
   - Or you may need to export/import the data manually

## Option 2: Query Previous Theme Value from Backup Database

If Railway provides access to backup databases, you can run this SQL query:

```sql
SELECT "kioskTheme" 
FROM global_settings 
WHERE key = 'global';
```

Then restore it using:

```sql
UPDATE global_settings 
SET "kioskTheme" = '<previous_theme_json>' 
WHERE key = 'global';
```

## Option 3: Check Application Logs

Check your backend application logs around the time of the update (`2026-01-09T05:53:21.029Z`) - they might contain the previous theme value that was logged during the update process.

## Option 4: Manual Restoration

If no backup is available, you'll need to manually reconfigure the theme settings in the admin portal.

## Future Prevention

To prevent this issue in the future, I've:
1. ✅ Fixed the backend to properly merge theme updates (already done)
2. ✅ Added detailed logging for theme updates (already done)

We could also add:
- Theme version history table
- Automatic backups before theme updates
- Audit logging for theme changes

