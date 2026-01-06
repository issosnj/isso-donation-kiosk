import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStripeFieldsToTemples1734567910000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');

    // Add stripeAccountId column
    const stripeAccountIdColumn = table?.findColumnByName('stripeAccountId');
    if (!stripeAccountIdColumn) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'stripeAccountId',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    // Add stripePublishableKey column
    const stripePublishableKeyColumn = table?.findColumnByName('stripePublishableKey');
    if (!stripePublishableKeyColumn) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'stripePublishableKey',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    // Add stripeLocationId column (required for Terminal reader registration)
    const stripeLocationIdColumn = table?.findColumnByName('stripeLocationId');
    if (!stripeLocationIdColumn) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'stripeLocationId',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');

    const stripeAccountIdColumn = table?.findColumnByName('stripeAccountId');
    if (stripeAccountIdColumn) {
      await queryRunner.dropColumn('temples', 'stripeAccountId');
    }

    const stripePublishableKeyColumn = table?.findColumnByName('stripePublishableKey');
    if (stripePublishableKeyColumn) {
      await queryRunner.dropColumn('temples', 'stripePublishableKey');
    }

    const stripeLocationIdColumn = table?.findColumnByName('stripeLocationId');
    if (stripeLocationIdColumn) {
      await queryRunner.dropColumn('temples', 'stripeLocationId');
    }
  }
}

