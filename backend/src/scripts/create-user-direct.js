const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

// Simple JavaScript version that works without TypeScript
async function createUserDirect() {
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://postgres:QtyRmuiBsJQcMLAJUfwpsJmTvMXQHSll@caboose.proxy.rlwy.net:30512/railway';
  
  const url = new URL(databaseUrl);
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: url.hostname,
    port: parseInt(url.port, 10) || 5432,
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    entities: [__dirname + '/../users/entities/user.entity.ts'],
    synchronize: false,
  });
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const User = dataSource.getRepository('User');
    if (!User) {
      // Try alternative approach
      const usersRepository = dataSource.getRepository('users');
      
      // User details
      const email = process.env.USER_EMAIL || 'patelmit101@gmail.com';
      const password = process.env.USER_PASSWORD || 'Admin123';
      const name = process.env.USER_NAME || 'Admin User';
      const role = process.env.USER_ROLE || 'MASTER_ADMIN';

      // Check if user exists
      const existingUser = await usersRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        console.log('⚠️  User already exists:', email);
        console.log('Updating password...');
        const passwordHash = await bcrypt.hash(password, 10);
        existingUser.passwordHash = passwordHash;
        existingUser.name = name;
        existingUser.role = role;
        await usersRepository.save(existingUser);
        console.log('✅ User updated successfully!');
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(password, 10);
        const user = usersRepository.create({
          name,
          email,
          passwordHash,
          role,
        });

        await usersRepository.save(user);
        console.log('✅ User created successfully!');
      }
      
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', role);
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createUserDirect();

