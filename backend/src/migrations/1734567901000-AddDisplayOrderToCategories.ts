import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDisplayOrderToCategories1734567901000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'donation_categories',
      new TableColumn({
        name: 'displayOrder',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // Set initial display order based on current order (name ASC)
    await queryRunner.query(`
      UPDATE donation_categories
      SET "displayOrder" = subquery.row_num - 1
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "templeId" ORDER BY name ASC) as row_num
        FROM donation_categories
      ) AS subquery
      WHERE donation_categories.id = subquery.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation_categories', 'displayOrder');
  }
}

