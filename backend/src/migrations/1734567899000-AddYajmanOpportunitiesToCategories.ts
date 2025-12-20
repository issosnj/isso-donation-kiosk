import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddYajmanOpportunitiesToCategories1734567899000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donation_categories');
    
    const columnExists = table?.findColumnByName('yajmanOpportunities');
    if (!columnExists) {
      await queryRunner.addColumn(
        'donation_categories',
        new TableColumn({
          name: 'yajmanOpportunities',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donation_categories');
    
    const column = table?.findColumnByName('yajmanOpportunities');
    if (column) {
      await queryRunner.dropColumn('donation_categories', 'yajmanOpportunities');
    }
  }
}

