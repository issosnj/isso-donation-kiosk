import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDevicesAndDonationsTables1734567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types first
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "devices_status_enum" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "donations_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create devices table
    await queryRunner.createTable(
      new Table({
        name: 'devices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'templeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'label',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'deviceCode',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'deviceToken',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'devices_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'lastSeenAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on deviceCode
    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_deviceCode',
        columnNames: ['deviceCode'],
        isUnique: true,
      }),
    );

    // Create foreign key for devices.templeId
    await queryRunner.createForeignKey(
      'devices',
      new TableForeignKey({
        columnNames: ['templeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'temples',
        onDelete: 'CASCADE',
      }),
    );

    // Create donation_categories table
    await queryRunner.createTable(
      new Table({
        name: 'donation_categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'templeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showOnKiosk',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for donation_categories.templeId
    await queryRunner.createForeignKey(
      'donation_categories',
      new TableForeignKey({
        columnNames: ['templeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'temples',
        onDelete: 'CASCADE',
      }),
    );

    // Create donations table
    await queryRunner.createTable(
      new Table({
        name: 'donations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'templeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'deviceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
          },
          {
            name: 'donorName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'donorEmail',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'squarePaymentId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'donations_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys for donations
    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['templeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'temples',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['deviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'donation_categories',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const donationsTable = await queryRunner.getTable('donations');
    if (donationsTable) {
      const foreignKeys = donationsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('donations', fk);
      }
    }

    const donationCategoriesTable = await queryRunner.getTable('donation_categories');
    if (donationCategoriesTable) {
      const foreignKeys = donationCategoriesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('donation_categories', fk);
      }
    }

    const devicesTable = await queryRunner.getTable('devices');
    if (devicesTable) {
      const foreignKeys = devicesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('devices', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('donations', true);
    await queryRunner.dropTable('donation_categories', true);
    await queryRunner.dropTable('devices', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "donations_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "devices_status_enum"`);
  }
}

