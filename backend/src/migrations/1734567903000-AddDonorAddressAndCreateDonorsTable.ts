import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddDonorAddressAndCreateDonorsTable1734567903000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add donorAddress column to donations table
    await queryRunner.addColumn(
      'donations',
      new TableColumn({
        name: 'donorAddress',
        type: 'text',
        isNullable: true,
      }),
    );

    // Create donors table
    await queryRunner.createTable(
      new Table({
        name: 'donors',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
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
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'totalDonations',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'lastDonationDate',
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

    // Add foreign key to temples
    await queryRunner.createForeignKey(
      'donors',
      new TableForeignKey({
        columnNames: ['templeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'temples',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique index on templeId + phone
    await queryRunner.createIndex(
      'donors',
      new TableIndex({
        name: 'IDX_donors_temple_phone',
        columnNames: ['templeId', 'phone'],
        isUnique: true,
      }),
    );

    // Create index on phone for faster lookups
    await queryRunner.createIndex(
      'donors',
      new TableIndex({
        name: 'IDX_donors_phone',
        columnNames: ['phone'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('donors', 'IDX_donors_phone');
    await queryRunner.dropIndex('donors', 'IDX_donors_temple_phone');

    // Drop foreign keys
    const table = await queryRunner.getTable('donors');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('templeId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('donors', foreignKey);
    }

    // Drop donors table
    await queryRunner.dropTable('donors');

    // Remove donorAddress column from donations
    await queryRunner.dropColumn('donations', 'donorAddress');
  }
}

