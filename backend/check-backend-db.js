// Script to check what database the backend is using
// Usage: DATABASE_URL='postgresql://...' node check-backend-db.js
// Or set DATABASE_PUBLIC_URL and optionally DATABASE_PRIVATE_URL for internal Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Client } = require('pg');

async function checkDatabase() {
  const publicUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const privateUrl = process.env.DATABASE_PRIVATE_URL;

  if (!publicUrl || !publicUrl.trim()) {
    console.error('❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL is required.');
    console.error('  Example: DATABASE_URL=\'postgresql://user:password@host:port/database\' node check-backend-db.js');
    process.exit(1);
  }

  console.log('Checking databases...\n');

  try {
    const publicClient = new Client({ connectionString: publicUrl });
    await publicClient.connect();
    console.log('✅ Public DB connected');

    const publicUsers = await publicClient.query('SELECT id, email, role FROM users');
    console.log(`Public DB - Users found: ${publicUsers.rows.length}`);
    publicUsers.rows.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

    await publicClient.end();
  } catch (error) {
    console.log('❌ Public DB error:', error.message);
  }

  if (privateUrl) {
    console.log('\n---\n');
    try {
      const privateClient = new Client({ connectionString: privateUrl });
      await privateClient.connect();
      console.log('✅ Private DB connected');

      const privateUsers = await privateClient.query('SELECT id, email, role FROM users');
      console.log(`Private DB - Users found: ${privateUsers.rows.length}`);
      privateUsers.rows.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

      await privateClient.end();
    } catch (error) {
      console.log('❌ Private DB error (expected from local):', error.message);
    }
  }
}

checkDatabase();
