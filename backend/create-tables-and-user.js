// Script to create tables and user
// Usage: USER_EMAIL=... USER_PASSWORD=... DATABASE_URL='...' node create-tables-and-user.js
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

async function createTablesAndUser() {
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    console.error('❌ Error: DATABASE_URL or DATABASE_PUBLIC_URL is required.');
    process.exit(1);
  }

  const email = requireEnv('USER_EMAIL');
  const password = requireEnv('USER_PASSWORD');
  const name = process.env.USER_NAME || 'Admin User';
  const role = process.env.USER_ROLE || 'MASTER_ADMIN';

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        "passwordHash" VARCHAR NOT NULL,
        role VARCHAR NOT NULL CHECK (role IN ('MASTER_ADMIN', 'TEMPLE_ADMIN')),
        "templeId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created/verified');

    await client.query(`
      CREATE TABLE IF NOT EXISTS temples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        address TEXT,
        timezone VARCHAR,
        "squareMerchantId" VARCHAR,
        "squareAccessToken" TEXT,
        "squareRefreshToken" VARCHAR,
        "squareLocationId" VARCHAR,
        "defaultCurrency" VARCHAR DEFAULT 'USD',
        "logoUrl" VARCHAR,
        branding JSONB,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Temples table created/verified');

    try {
      await client.query(`
        ALTER TABLE temples 
        ADD COLUMN IF NOT EXISTS timezone VARCHAR,
        ADD COLUMN IF NOT EXISTS "squareAccessToken" TEXT,
        ADD COLUMN IF NOT EXISTS "squareRefreshToken" VARCHAR,
        ADD COLUMN IF NOT EXISTS "defaultCurrency" VARCHAR DEFAULT 'USD',
        ADD COLUMN IF NOT EXISTS "logoUrl" VARCHAR,
        ADD COLUMN IF NOT EXISTS branding JSONB
      `);
      console.log('✅ Temples table columns verified');
    } catch (err) {
      console.log('⚠️  Note:', err.message);
    }

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
      const result = await client.query(
        `INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, role`,
        [name, email, passwordHash, role]
      );

      console.log('✅ User created successfully!');
      console.log('User ID:', result.rows[0].id);
    }

    console.log('\n📋 Login Credentials:');
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

createTablesAndUser();
