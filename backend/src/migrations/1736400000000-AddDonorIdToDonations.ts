import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddDonorIdToDonations1736400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add donorId column
    await queryRunner.addColumn(
      'donations',
      new TableColumn({
        name: 'donorId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['donorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'donors',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('donorId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('donations', foreignKey);
    }
    await queryRunner.dropColumn('donations', 'donorId');
  }
}

