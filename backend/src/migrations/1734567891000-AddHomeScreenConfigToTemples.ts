import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHomeScreenConfigToTemples1734567891000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'temples',
      new TableColumn({
        name: 'homeScreenConfig',
        type: 'json',
        isNullable: true,
        default: JSON.stringify({
          idleTimeoutSeconds: 60,
          customMessage: 'Thank you for your generous donation!',
          whatsAppLink: '',
          eventsText: 'Check our website for upcoming events.',
          socialMedia: [],
        }),
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('temples', 'homeScreenConfig');
  }
}

