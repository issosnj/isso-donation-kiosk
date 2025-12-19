import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryFields1734567892000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add defaultAmount column
    await queryRunner.addColumn(
      'donation_categories',
      new TableColumn({
        name: 'defaultAmount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );

    // Add showStartDate column
    await queryRunner.addColumn(
      'donation_categories',
      new TableColumn({
        name: 'showStartDate',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    // Add showEndDate column
    await queryRunner.addColumn(
      'donation_categories',
      new TableColumn({
        name: 'showEndDate',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('donation_categories', 'showEndDate');
    await queryRunner.dropColumn('donation_categories', 'showStartDate');
    await queryRunner.dropColumn('donation_categories', 'defaultAmount');
  }
}

