import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantityEnabledToDonationCategories1740900000000
  implements MigrationInterface
{
  name = 'AddQuantityEnabledToDonationCategories1740900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation_categories"
      ADD "quantityEnabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation_categories" DROP COLUMN "quantityEnabled"
    `);
  }
}
