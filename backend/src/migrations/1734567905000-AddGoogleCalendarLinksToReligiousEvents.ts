import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoogleCalendarLinksToReligiousEvents1734567905000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('religious_events');
    if (table && !table.findColumnByName('googleCalendarLinks')) {
      await queryRunner.addColumn(
        'religious_events',
        new TableColumn({
          name: 'googleCalendarLinks',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('religious_events');
    if (table && table.findColumnByName('googleCalendarLinks')) {
      await queryRunner.dropColumn('religious_events', 'googleCalendarLinks');
    }
  }
}

