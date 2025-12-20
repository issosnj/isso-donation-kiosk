import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddYajmanOpportunitiesEnabledToTemples1734567898000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    
    const columnExists = table?.findColumnByName('yajmanOpportunitiesEnabled');
    if (!columnExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'yajmanOpportunitiesEnabled',
          type: 'boolean',
          default: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    
    const column = table?.findColumnByName('yajmanOpportunitiesEnabled');
    if (column) {
      await queryRunner.dropColumn('temples', 'yajmanOpportunitiesEnabled');
    }
  }
}

