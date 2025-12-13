// Script to check what database the backend is using - can run with: node check-backend-db.js
const { Client } = require('pg');

async function checkDatabase() {
  // Check both possible database URLs
  const publicUrl = 'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  const privateUrl = 'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@postgres.railway.internal:5432/railway';
  
  console.log('Checking databases...\n');
  
  // Check public database
  try {
    const publicClient = new Client({ connectionString: publicUrl });
    await publicClient.connect();
    console.log('✅ Public DB connected');
    
    const publicUsers = await publicClient.query('SELECT id, email, role FROM users');
    console.log(`Public DB - Users found: ${publicUsers.rows.length}`);
    publicUsers.rows.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    
    await publicClient.end();
  } catch (error) {
    console.log('❌ Public DB error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Check private database (might not work from local)
  try {
    const privateClient = new Client({ connectionString: privateUrl });
    await privateClient.connect();
    console.log('✅ Private DB connected');
    
    const privateUsers = await privateClient.query('SELECT id, email, role FROM users');
    console.log(`Private DB - Users found: ${privateUsers.rows.length}`);
    privateUsers.rows.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    
    await privateClient.end();
  } catch (error) {
    console.log('❌ Private DB error (expected from local):', error.message);
  }
}

checkDatabase();

