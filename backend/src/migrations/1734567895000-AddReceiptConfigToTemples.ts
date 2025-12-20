import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReceiptConfigToTemples1734567895000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    const columnExists = table?.findColumnByName('receiptConfig');

    if (!columnExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'receiptConfig',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    const column = table?.findColumnByName('receiptConfig');

    if (column) {
      await queryRunner.dropColumn('temples', 'receiptConfig');
    }
  }
}

