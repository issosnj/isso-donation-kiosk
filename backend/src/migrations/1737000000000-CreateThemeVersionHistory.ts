import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateThemeVersionHistory1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create theme_versions table for version history
    await queryRunner.createTable(
      new Table({
        name: 'theme_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'version',
            type: 'integer',
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'kioskTheme',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isAutomatic',
            type: 'boolean',
            default: false,
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

    // Create index on createdAt for faster queries
    await queryRunner.createIndex(
      'theme_versions',
      new TableIndex({
        name: 'IDX_theme_versions_created_at',
        columnNames: ['createdAt'],
      }),
    );

    // Create index on version for ordering
    await queryRunner.createIndex(
      'theme_versions',
      new TableIndex({
        name: 'IDX_theme_versions_version',
        columnNames: ['version'],
      }),
    );

    // Create foreign key to users table (optional, if user is deleted, keep the version)
    await queryRunner.createForeignKey(
      'theme_versions',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create default_positions table for storing default UI element positions
    await queryRunner.createTable(
      new Table({
        name: 'default_positions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'elementType',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'screenType',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'jsonb',
            isNullable: false,
            comment: 'JSON object with x, y, width, height, or other positioning data',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional metadata about the position (e.g., alignment, visibility)',
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
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

    // Create unique index on elementType and screenType combination
    await queryRunner.createIndex(
      'default_positions',
      new TableIndex({
        name: 'IDX_default_positions_element_screen',
        columnNames: ['elementType', 'screenType'],
        isUnique: true,
      }),
    );

    // Create foreign keys to users table
    await queryRunner.createForeignKey(
      'default_positions',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'default_positions',
      new TableForeignKey({
        columnNames: ['updatedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const defaultPositionsTable = await queryRunner.getTable('default_positions');
    if (defaultPositionsTable) {
      const foreignKeys = defaultPositionsTable.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf('createdBy') !== -1 || fk.columnNames.indexOf('updatedBy') !== -1,
      );
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('default_positions', fk);
      }
    }

    const themeVersionsTable = await queryRunner.getTable('theme_versions');
    if (themeVersionsTable) {
      const foreignKeys = themeVersionsTable.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf('createdBy') !== -1,
      );
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('theme_versions', fk);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('default_positions', 'IDX_default_positions_element_screen');
    await queryRunner.dropIndex('theme_versions', 'IDX_theme_versions_version');
    await queryRunner.dropIndex('theme_versions', 'IDX_theme_versions_created_at');

    // Drop tables
    await queryRunner.dropTable('default_positions');
    await queryRunner.dropTable('theme_versions');
  }
}

