import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStripeFieldsToDonations1734567920000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');

    // Add stripePaymentIntentId column
    const stripePaymentIntentIdColumn = table?.findColumnByName('stripePaymentIntentId');
    if (!stripePaymentIntentIdColumn) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'stripePaymentIntentId',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    // Add stripeFee column
    const stripeFeeColumn = table?.findColumnByName('stripeFee');
    if (!stripeFeeColumn) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'stripeFee',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');

    const stripePaymentIntentIdColumn = table?.findColumnByName('stripePaymentIntentId');
    if (stripePaymentIntentIdColumn) {
      await queryRunner.dropColumn('donations', 'stripePaymentIntentId');
    }

    const stripeFeeColumn = table?.findColumnByName('stripeFee');
    if (stripeFeeColumn) {
      await queryRunner.dropColumn('donations', 'stripeFee');
    }
  }
}

