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
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'isso_donation_kiosk'),
    entities: [User, Temple, Device, DonationCategory, Donation, AuditLog],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
  };
};

export default new DataSource({
  ...typeOrmConfig(),
  migrations: ['src/migrations/*.ts'],
});

