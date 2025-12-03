import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { typeOrmConfig } from '../config/typeorm.config';

async function createUser() {
  const dataSource = new DataSource(typeOrmConfig());
  
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const usersRepository = dataSource.getRepository(User);

    // Get user details from environment or use defaults
    const email = process.env.USER_EMAIL || 'patelmit101@gmail.com';
    const password = process.env.USER_PASSWORD || 'Admin123';
    const name = process.env.USER_NAME || 'Admin User';
    const role = (process.env.USER_ROLE as UserRole) || UserRole.MASTER_ADMIN;
    const templeId = process.env.USER_TEMPLE_ID || undefined;

    // Check if user with this email exists
    const existingUser = await usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      console.log('User with this email already exists:', email);
      console.log('Updating password...');
      const passwordHash = await bcrypt.hash(password, 10);
      existingUser.passwordHash = passwordHash;
      await usersRepository.save(existingUser);
      console.log('✅ Password updated successfully!');
      await dataSource.destroy();
      return;
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = usersRepository.create({
      name,
      email,
      passwordHash,
      role,
      templeId: templeId || undefined,
    });

    await usersRepository.save(user);
    console.log('✅ User created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', role);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();

