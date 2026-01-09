// Script to check theme history and see if we can recover the previous theme
// Run with: node backend/scripts/check-theme-history.js

const { Client } = require('pg');

async function checkThemeHistory() {
  // Get database URL from environment or use default
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || 
    process.env.DATABASE_URL ||
    'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // Check current global settings
    console.log('📋 Current Global Settings:');
    const currentSettings = await client.query(
      `SELECT id, key, "kioskTheme", "createdAt", "updatedAt" 
       FROM global_settings 
       WHERE key = 'global'`
    );

    if (currentSettings.rows.length === 0) {
      console.log('❌ No global settings found');
      await client.end();
      return;
    }

    const settings = currentSettings.rows[0];
    console.log(`  ID: ${settings.id}`);
    console.log(`  Key: ${settings.key}`);
    console.log(`  Created At: ${settings.createdAt}`);
    console.log(`  Updated At: ${settings.updatedAt}`);
    console.log(`  Has Theme: ${settings.kioskTheme ? 'Yes' : 'No'}`);
    
    if (settings.kioskTheme) {
      console.log(`  Theme Keys: ${Object.keys(settings.kioskTheme).join(', ')}`);
      
      // Check if layout has the new fields
      if (settings.kioskTheme.layout) {
        console.log(`  Layout Keys: ${Object.keys(settings.kioskTheme.layout).length} properties`);
        if (settings.kioskTheme.layout.donationSelectionCategorySectionX !== undefined ||
            settings.kioskTheme.layout.donationSelectionCategorySectionY !== undefined) {
          console.log('  ⚠️  Theme has new positioning fields - may have been updated recently');
        }
      }
    }

    console.log('\n📊 Checking for PostgreSQL audit capabilities...');
    
    // Check if pg_stat_statements is enabled (query history)
    try {
      const pgStatCheck = await client.query(
        "SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'pg_stat_statements'"
      );
      if (pgStatCheck.rows[0].count > 0) {
        console.log('  ✅ pg_stat_statements extension found (query history available)');
        
        // Try to find recent queries to global_settings
        const recentQueries = await client.query(
          `SELECT query, calls, mean_exec_time, total_exec_time 
           FROM pg_stat_statements 
           WHERE query LIKE '%global_settings%' 
           ORDER BY total_exec_time DESC 
           LIMIT 5`
        );
        if (recentQueries.rows.length > 0) {
          console.log('  📝 Recent queries to global_settings:');
          recentQueries.rows.forEach((row, i) => {
            console.log(`    ${i + 1}. Calls: ${row.calls}, Avg Time: ${row.mean_exec_time}ms`);
            console.log(`       Query: ${row.query.substring(0, 100)}...`);
          });
        }
      } else {
        console.log('  ❌ pg_stat_statements not enabled (no query history)');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check pg_stat_statements: ${error.message}`);
    }

    // Check for PostgreSQL WAL (Write-Ahead Log) - might have previous values
    console.log('\n🔍 Checking for available backups or logs...');
    try {
      const walCheck = await client.query(
        "SELECT setting, source FROM pg_settings WHERE name = 'wal_level'"
      );
      if (walCheck.rows.length > 0) {
        console.log(`  WAL Level: ${walCheck.rows[0].setting}`);
        console.log(`  Source: ${walCheck.rows[0].source}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check WAL settings: ${error.message}`);
    }

    // Check if there are any audit logs related to theme changes
    console.log('\n📝 Checking audit logs for theme changes...');
    try {
      const auditLogs = await client.query(
        `SELECT id, "userId", action, metadata, "createdAt" 
         FROM audit_logs 
         WHERE action LIKE '%theme%' OR action LIKE '%kiosk%' OR metadata::text LIKE '%kioskTheme%'
         ORDER BY "createdAt" DESC 
         LIMIT 10`
      );
      
      if (auditLogs.rows.length > 0) {
        console.log(`  Found ${auditLogs.rows.length} relevant audit logs:`);
        auditLogs.rows.forEach((log, i) => {
          console.log(`\n  ${i + 1}. Action: ${log.action}`);
          console.log(`     Created At: ${log.createdAt}`);
          console.log(`     User ID: ${log.userId || 'N/A'}`);
          if (log.metadata) {
            console.log(`     Metadata: ${JSON.stringify(log.metadata).substring(0, 200)}...`);
          }
        });
      } else {
        console.log('  ❌ No theme-related audit logs found');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not query audit logs: ${error.message}`);
      console.log('     (This is okay if audit logging is not set up)');
    }

    // Check if there's a database backup or point-in-time recovery
    console.log('\n💾 Checking for backup/restore options...');
    try {
      const backupCheck = await client.query(
        "SELECT setting FROM pg_settings WHERE name IN ('archive_mode', 'backup_method')"
      );
      if (backupCheck.rows.length > 0) {
        console.log('  📦 Backup settings found:');
        backupCheck.rows.forEach(row => {
          console.log(`     ${row.setting}`);
        });
      } else {
        console.log('  ℹ️  No explicit backup configuration found in pg_settings');
        console.log('     (Backups might be managed externally by Railway or other tools)');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check backup settings: ${error.message}`);
    }

    // Display the current theme structure for reference
    console.log('\n📋 Current Theme Structure:');
    if (settings.kioskTheme) {
      console.log(JSON.stringify(settings.kioskTheme, null, 2));
    } else {
      console.log('  (No theme data)');
    }

    console.log('\n💡 Recommendations:');
    console.log('  1. Check Railway dashboard for database backups');
    console.log('  2. Check application logs around the time of update:', settings.updatedAt);
    console.log('  3. If you have a backup, restore the kioskTheme from before the update');
    console.log('  4. Otherwise, manually reconfigure the theme settings');
    console.log('  5. Future: We can add theme version history to prevent this issue');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkThemeHistory();

