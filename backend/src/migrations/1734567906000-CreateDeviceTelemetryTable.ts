import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDeviceTelemetryTable1734567906000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_telemetry',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'deviceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'deviceModel',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'osVersion',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'appVersion',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'batteryLevel',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'batteryState',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isCharging',
            type: 'boolean',
            default: false,
          },
          {
            name: 'networkType',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'networkSSID',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isConnected',
            type: 'boolean',
            default: false,
          },
          {
            name: 'diskSpaceUsed',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'diskSpaceTotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'memoryUsed',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'memoryTotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'squareHardwareConnected',
            type: 'boolean',
            default: false,
          },
          {
            name: 'squareHardwareModel',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'logs',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'device_telemetry',
      new TableForeignKey({
        columnNames: ['deviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for efficient querying
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_device_telemetry_deviceId_createdAt',
        columnNames: ['deviceId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('device_telemetry');
  }
}

