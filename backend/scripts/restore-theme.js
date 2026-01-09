// Script to restore a theme from a JSON string
// Usage: node backend/scripts/restore-theme.js '{"fonts": {...}, "colors": {...}, "layout": {...}}'
// Or: node backend/scripts/restore-theme.js < theme.json

const { Client } = require('pg');

async function restoreTheme(themeJson) {
  if (!themeJson) {
    console.error('❌ Error: No theme JSON provided');
    console.log('Usage: node backend/scripts/restore-theme.js \'{"fonts": {...}, "colors": {...}, "layout": {...}}\'');
    console.log('Or: node backend/scripts/restore-theme.js < theme.json');
    process.exit(1);
  }

  let theme;
  try {
    theme = typeof themeJson === 'string' ? JSON.parse(themeJson) : themeJson;
  } catch (error) {
    console.error('❌ Error: Invalid JSON format');
    console.error('Error:', error.message);
    process.exit(1);
  }

  // Validate theme structure
  if (!theme || typeof theme !== 'object') {
    console.error('❌ Error: Theme must be an object');
    process.exit(1);
  }

  // Get database URL
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || 
    process.env.DATABASE_URL ||
    'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // Get current theme for backup
    console.log('📋 Backing up current theme...');
    const currentSettings = await client.query(
      `SELECT "kioskTheme" FROM global_settings WHERE key = 'global'`
    );

    if (currentSettings.rows.length === 0) {
      console.log('❌ No global settings found. Creating new settings...');
      await client.query(
        `INSERT INTO global_settings (key, "kioskTheme") VALUES ('global', $1)`,
        [JSON.stringify(theme)]
      );
      console.log('✅ Theme restored successfully!');
      await client.end();
      return;
    }

    const currentTheme = currentSettings.rows[0].kioskTheme;
    
    // Save current theme as backup
    const backupFileName = `theme-backup-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(backupDir, backupFileName),
      JSON.stringify(currentTheme, null, 2)
    );
    console.log(`✅ Current theme backed up to: backend/backups/${backupFileName}\n`);

    // Restore theme
    console.log('🔄 Restoring theme...');
    console.log('New theme structure:');
    console.log(`  - Fonts: ${theme.fonts ? Object.keys(theme.fonts).join(', ') : 'none'}`);
    console.log(`  - Colors: ${theme.colors ? Object.keys(theme.colors).join(', ') : 'none'}`);
    console.log(`  - Layout: ${theme.layout ? Object.keys(theme.layout).length + ' properties' : 'none'}`);

    await client.query(
      `UPDATE global_settings SET "kioskTheme" = $1 WHERE key = 'global'`,
      [JSON.stringify(theme)]
    );

    console.log('\n✅ Theme restored successfully!');
    console.log('💡 The theme will be active immediately for all temples');
    console.log(`💾 Backup saved to: backend/backups/${backupFileName}`);

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Read from command line argument or stdin
const readline = require('readline');

if (process.argv[2]) {
  // Theme provided as command line argument
  restoreTheme(process.argv[2]);
} else {
  // Try to read from stdin
  let input = '';
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (line) => {
    input += line + '\n';
  });

  rl.on('close', () => {
    if (input.trim()) {
      restoreTheme(input.trim());
    } else {
      console.error('❌ Error: No theme JSON provided');
      console.log('Usage: node backend/scripts/restore-theme.js \'{"fonts": {...}, "colors": {...}, "layout": {...}}\'');
      console.log('Or: node backend/scripts/restore-theme.js < theme.json');
      process.exit(1);
    }
  });
}

