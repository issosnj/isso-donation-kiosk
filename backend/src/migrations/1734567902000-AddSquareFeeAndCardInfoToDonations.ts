import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSquareFeeAndCardInfoToDonations1734567902000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');

    // Add netAmount column
    const netAmountColumn = table?.findColumnByName('netAmount');
    if (!netAmountColumn) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'netAmount',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    // Add squareFee column
    const squareFeeColumn = table?.findColumnByName('squareFee');
    if (!squareFeeColumn) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'squareFee',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    // Add cardLast4 column
    const cardLast4Column = table?.findColumnByName('cardLast4');
    if (!cardLast4Column) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'cardLast4',
          type: 'varchar',
          length: '4',
          isNullable: true,
        }),
      );
    }

    // Add cardType column
    const cardTypeColumn = table?.findColumnByName('cardType');
    if (!cardTypeColumn) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'cardType',
          type: 'varchar',
          length: '50',
          isNullable: true,
        }),
      );
    }

    // Backfill netAmount for existing donations (netAmount = amount - squareFee, but we don't have fee data, so set to amount)
    await queryRunner.query(`
      UPDATE donations
      SET "netAmount" = amount
      WHERE "netAmount" IS NULL AND "squarePaymentId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');

    const netAmountColumn = table?.findColumnByName('netAmount');
    if (netAmountColumn) {
      await queryRunner.dropColumn('donations', 'netAmount');
    }

    const squareFeeColumn = table?.findColumnByName('squareFee');
    if (squareFeeColumn) {
      await queryRunner.dropColumn('donations', 'squareFee');
    }

    const cardLast4Column = table?.findColumnByName('cardLast4');
    if (cardLast4Column) {
      await queryRunner.dropColumn('donations', 'cardLast4');
    }

    const cardTypeColumn = table?.findColumnByName('cardType');
    if (cardTypeColumn) {
      await queryRunner.dropColumn('donations', 'cardType');
    }
  }
}

