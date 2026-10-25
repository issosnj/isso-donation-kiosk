import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundedAmountToDonations1742000000000 implements MigrationInterface {
  name = 'AddRefundedAmountToDonations1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donations
      ADD COLUMN IF NOT EXISTS "refundedAmount" numeric(10,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN IF EXISTS "refundedAmount"`);
  }
}
