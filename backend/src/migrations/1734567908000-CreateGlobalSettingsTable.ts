import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGlobalSettingsTable1734567908000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const table = await queryRunner.getTable('global_settings');
    if (table) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'global_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            default: "'global'",
          },
          {
            name: 'kioskTheme',
            type: 'json',
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

    // Create unique constraint on key to ensure only one global settings row
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_global_settings_key" ON "global_settings" ("key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('global_settings');
    if (table) {
      await queryRunner.dropTable('global_settings');
    }
  }
}

