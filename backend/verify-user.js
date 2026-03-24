// Script to verify user exists and test password
// Usage: USER_EMAIL=... USER_PASSWORD=... DATABASE_URL='...' node verify-user.js
// All of USER_EMAIL, USER_PASSWORD, and DATABASE_URL are REQUIRED.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Client } = require('pg');
const bcrypt = require('bcrypt');

function requireEnv(name) {
  const val = process.env[name];
  if (!val || !val.trim()) {
    console.error(`❌ Error: ${name} is required.`);
    process.exit(1);
  }
  return val;
}

async function verifyUser() {
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    console.error('❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL is required.');
    process.exit(1);
  }

  const email = requireEnv('USER_EMAIL');
  const testPassword = requireEnv('USER_PASSWORD');

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    const result = await client.query(
      'SELECT id, email, "passwordHash", role, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      await client.end();
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Password Hash:', user.passwordHash.substring(0, 20) + '...');

    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('\n🔐 Password Test:');
    console.log('  Password Valid:', isValid ? '✅ YES' : '❌ NO');

    if (!isValid) {
      console.log('\n⚠️  Password mismatch! Regenerating password hash...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await client.query('UPDATE users SET "passwordHash" = $1 WHERE email = $2', [newHash, email]);
      console.log('✅ Password hash updated!');

      const isValidAfter = await bcrypt.compare(testPassword, newHash);
      console.log('  Password Valid After Update:', isValidAfter ? '✅ YES' : '❌ NO');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyUser();
