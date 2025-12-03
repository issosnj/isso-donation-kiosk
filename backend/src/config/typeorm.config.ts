import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Temple } from '../temples/entities/temple.entity';
import { Device } from '../devices/entities/device.entity';
import { DonationCategory } from '../donations/entities/donation-category.entity';
import { Donation } from '../donations/entities/donation.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

export const typeOrmConfig = (): DataSourceOptions => {
  const configService = new ConfigService();
  
  // Use DATABASE_PUBLIC_URL if available (more reliable), otherwise fall back to DATABASE_URL
  // Private network (DATABASE_URL) may have connectivity issues, so prefer public URL
  const databaseUrl = configService.get<string>('DATABASE_PUBLIC_URL') || configService.get<string>('DATABASE_URL');
  
  if (databaseUrl) {
    // Parse DATABASE_URL if provided
    const url = new URL(databaseUrl);
    const config = {
      type: 'postgres' as const,
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
      entities: [User, Temple, Device, DonationCategory, Donation, AuditLog],
      synchronize: configService.get('NODE_ENV') === 'development',
      logging: configService.get('NODE_ENV') === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations',
      connectTimeoutMS: 10000,
      extra: {
        connect_timeout: 10,
      },
    };
    
    // Log connection details (without password) for debugging
    const urlSource = configService.get<string>('DATABASE_PUBLIC_URL') ? 'DATABASE_PUBLIC_URL' : 'DATABASE_URL';
    console.log(`[TypeORM] Using ${urlSource}: ${config.host}:${config.port}/${config.database} as ${config.username}`);
    
    return config;
  }
  
  // Fallback to individual variables
  const host = configService.get('DB_HOST', 'localhost');
  const port = parseInt(configService.get('DB_PORT', '5432'), 10);
  const username = configService.get('DB_USERNAME', 'postgres');
  const database = configService.get('DB_DATABASE', 'isso_donation_kiosk');
  
  console.log(`[TypeORM] Using individual DB variables: ${host}:${port}/${database} as ${username}`);
  console.log(`[TypeORM] DATABASE_URL is: ${databaseUrl ? 'set' : 'not set'}`);
  console.log(`[TypeORM] DB_HOST is: ${host}`);
  
  return {
    type: 'postgres',
    host,
    port,
    username,
    password: configService.get('DB_PASSWORD', 'postgres'),
    database,
    entities: [User, Temple, Device, DonationCategory, Donation, AuditLog],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
    connectTimeoutMS: 10000,
    extra: {
      connect_timeout: 10,
    },
  };
};

export default new DataSource({
  ...typeOrmConfig(),
  migrations: ['src/migrations/*.ts'],
});

