import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDonorPhoneToDonations1734567894000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');
    const columnExists = table?.findColumnByName('donorPhone');

    if (!columnExists) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'donorPhone',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');
    const column = table?.findColumnByName('donorPhone');

    if (column) {
      await queryRunner.dropColumn('donations', 'donorPhone');
    }
  }
}

