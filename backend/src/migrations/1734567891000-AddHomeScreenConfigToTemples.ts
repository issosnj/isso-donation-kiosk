import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHomeScreenConfigToTemples1734567891000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('temples');
    const columnExists = table?.findColumnByName('homeScreenConfig');

    if (!columnExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'homeScreenConfig',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    const column = table?.findColumnByName('homeScreenConfig');
    
    if (column) {
      await queryRunner.dropColumn('temples', 'homeScreenConfig');
    }
  }
}

