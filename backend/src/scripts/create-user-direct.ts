import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

// Direct database connection script
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
    entities: [User],
    synchronize: false,
  });
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const usersRepository = dataSource.getRepository(User);

    // User details
    const email = process.env.USER_EMAIL || 'patelmit101@gmail.com';
    const password = process.env.USER_PASSWORD || 'Admin123';
    const name = process.env.USER_NAME || 'Admin User';
    const role = (process.env.USER_ROLE as UserRole) || UserRole.MASTER_ADMIN;

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
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', role);
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
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', role);
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUserDirect();

