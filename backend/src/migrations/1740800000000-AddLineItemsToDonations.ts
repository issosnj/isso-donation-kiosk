import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLineItemsToDonations1740800000000 implements MigrationInterface {
  name = 'AddLineItemsToDonations1740800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donations" ADD "lineItems" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN "lineItems"`);
  }
}
