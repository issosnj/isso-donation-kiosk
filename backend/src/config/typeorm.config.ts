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
  
  // Support DATABASE_URL (Railway provides this automatically)
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  if (databaseUrl) {
    // Parse DATABASE_URL if provided
    const url = new URL(databaseUrl);
    return {
      type: 'postgres',
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
  }
  
  // Fallback to individual variables
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: parseInt(configService.get('DB_PORT', '5432'), 10),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'isso_donation_kiosk'),
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

