import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTempleCodeAndReceiptNumber1734567896000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add templeCode to temples table
    const templesTable = await queryRunner.getTable('temples');
    const templeCodeExists = templesTable?.findColumnByName('templeCode');

    if (!templeCodeExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'templeCode',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Add receiptNumber to donations table
    const donationsTable = await queryRunner.getTable('donations');
    const receiptNumberExists = donationsTable?.findColumnByName('receiptNumber');

    if (!receiptNumberExists) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'receiptNumber',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove receiptNumber from donations table
    const donationsTable = await queryRunner.getTable('donations');
    const receiptNumberColumn = donationsTable?.findColumnByName('receiptNumber');

    if (receiptNumberColumn) {
      await queryRunner.dropColumn('donations', 'receiptNumber');
    }

    // Remove templeCode from temples table
    const templesTable = await queryRunner.getTable('temples');
    const templeCodeColumn = templesTable?.findColumnByName('templeCode');

    if (templeCodeColumn) {
      await queryRunner.dropColumn('temples', 'templeCode');
    }
  }
}

