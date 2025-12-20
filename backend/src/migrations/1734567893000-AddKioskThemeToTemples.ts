import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddKioskThemeToTemples1734567893000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('temples');
    const columnExists = table?.findColumnByName('kioskTheme');

    if (!columnExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'kioskTheme',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    const column = table?.findColumnByName('kioskTheme');
    
    if (column) {
      await queryRunner.dropColumn('temples', 'kioskTheme');
    }
  }
}

