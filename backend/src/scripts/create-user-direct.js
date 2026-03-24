// JavaScript version of create-user-direct - use pg Client for standalone execution
// Usage: USER_EMAIL=... USER_PASSWORD=... DATABASE_URL='...' node src/scripts/create-user-direct.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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

async function createUserDirect() {
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    console.error('❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL is required.');
    process.exit(1);
  }

  const email = requireEnv('USER_EMAIL');
  const password = requireEnv('USER_PASSWORD');
  const name = process.env.USER_NAME || 'Admin User';
  const role = process.env.USER_ROLE || 'MASTER_ADMIN';

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Database connected');

    const checkResult = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);
    const passwordHash = await bcrypt.hash(password, 10);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  User already exists:', email);
      console.log('Updating password...');
      await client.query(
        'UPDATE users SET "passwordHash" = $1, name = $2, role = $3 WHERE email = $4',
        [passwordHash, name, role, email]
      );
      console.log('✅ User updated successfully!');
    } else {
      await client.query(
        `INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, role`,
        [name, email, passwordHash, role]
      );
      console.log('✅ User created successfully!');
    }

    console.log('Email:', email);
    console.log('Role:', role);
    console.log('(Password not echoed for security)');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

createUserDirect();
