// Script to verify user exists and test password - can run with: node verify-user.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function verifyUser() {
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    const email = 'patelmit101@gmail.com';
    const testPassword = 'Admin123';

    // Get user
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

    // Test password
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('\n🔐 Password Test:');
    console.log('  Test Password:', testPassword);
    console.log('  Password Valid:', isValid ? '✅ YES' : '❌ NO');

    if (!isValid) {
      console.log('\n⚠️  Password mismatch! Regenerating password hash...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await client.query(
        'UPDATE users SET "passwordHash" = $1 WHERE email = $2',
        [newHash, email]
      );
      console.log('✅ Password hash updated!');
      
      // Test again
      const isValidAfter = await bcrypt.compare(testPassword, newHash);
      console.log('  Password Valid After Update:', isValidAfter ? '✅ YES' : '❌ NO');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

verifyUser();

