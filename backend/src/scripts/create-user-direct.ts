// Direct database connection script to create user
// Usage: USER_EMAIL=... USER_PASSWORD=... npx ts-node src/scripts/create-user-direct.ts
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env
import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

function requireEnv(name: string): string {
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

    const email = requireEnv('USER_EMAIL');
    const password = requireEnv('USER_PASSWORD');
    const name = process.env.USER_NAME || 'Admin User';
    const role = (process.env.USER_ROLE as UserRole) || UserRole.MASTER_ADMIN;

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
      console.log('Role:', role);
    } else {
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
