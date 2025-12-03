import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { typeOrmConfig } from '../config/typeorm.config';

async function createMasterAdmin() {
  const dataSource = new DataSource(typeOrmConfig());
  
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const usersRepository = dataSource.getRepository(User);

    // Check if master admin already exists
    const existingAdmin = await usersRepository.findOne({
      where: { role: UserRole.MASTER_ADMIN },
    });

    if (existingAdmin) {
      console.log('Master admin already exists:', existingAdmin.email);
      await dataSource.destroy();
      return;
    }

    // Get email and password from environment or use defaults
    const email = process.env.MASTER_ADMIN_EMAIL || 'admin@isso.org';
    const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123456';
    const name = process.env.MASTER_ADMIN_NAME || 'Master Admin';

    // Check if user with this email exists
    const existingUser = await usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      console.log('User with this email already exists:', email);
      await dataSource.destroy();
      return;
    }

    // Create master admin
    const passwordHash = await bcrypt.hash(password, 10);
    const masterAdmin = usersRepository.create({
      name,
      email,
      passwordHash,
      role: UserRole.MASTER_ADMIN,
    });

    await usersRepository.save(masterAdmin);
    console.log('✅ Master admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  Please change the password after first login!');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error creating master admin:', error);
    process.exit(1);
  }
}

createMasterAdmin();

