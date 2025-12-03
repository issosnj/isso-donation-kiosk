// Simple script to create user - can run with: node create-user-simple.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createUser() {
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    const email = process.env.USER_EMAIL || 'patelmit101@gmail.com';
    const password = process.env.USER_PASSWORD || 'Admin123';
    const name = process.env.USER_NAME || 'Admin User';
    const role = process.env.USER_ROLE || 'MASTER_ADMIN';

    // Check if user exists
    const checkResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

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
      // Create new user
      const result = await client.query(
        `INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, role`,
        [name, email, passwordHash, role]
      );
      
      console.log('✅ User created successfully!');
      console.log('User ID:', result.rows[0].id);
    }
    
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', role);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

createUser();

