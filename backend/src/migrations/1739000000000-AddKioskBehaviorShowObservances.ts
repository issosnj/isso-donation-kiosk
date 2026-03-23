import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKioskBehaviorShowObservances1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "global_settings"
      ADD COLUMN IF NOT EXISTS "kioskBehavior" json DEFAULT '{"showObservances": true}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN IF EXISTS "kioskBehavior"`);
  }
}
