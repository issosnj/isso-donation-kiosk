import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class DonationChangeRequestsAndAnonymousFlag1741000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donations"
      ADD COLUMN IF NOT EXISTS "submittedAsAnonymous" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "donation_change_requests_type_enum" AS ENUM('DONOR_DISPLAY_CHANGE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "donation_change_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'donation_change_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'templeId', type: 'uuid', isNullable: false },
          { name: 'donationId', type: 'uuid', isNullable: false },
          {
            name: 'type',
            type: 'donation_change_requests_type_enum',
            default: `'DONOR_DISPLAY_CHANGE'`,
          },
          {
            name: 'status',
            type: 'donation_change_requests_status_enum',
            default: `'PENDING'`,
          },
          { name: 'requestedByUserId', type: 'uuid', isNullable: false },
          { name: 'reviewedByUserId', type: 'uuid', isNullable: true },
          { name: 'templeNote', type: 'text', isNullable: true },
          { name: 'reviewNote', type: 'text', isNullable: true },
          { name: 'previousSnapshot', type: 'jsonb', isNullable: false },
          { name: 'proposedSnapshot', type: 'jsonb', isNullable: false },
          { name: 'reviewedAt', type: 'timestamp', isNullable: true },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'donation_change_requests',
      new TableForeignKey({
        columnNames: ['templeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'temples',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation_change_requests',
      new TableForeignKey({
        columnNames: ['donationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'donations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation_change_requests',
      new TableForeignKey({
        columnNames: ['requestedByUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation_change_requests',
      new TableForeignKey({
        columnNames: ['reviewedByUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'donation_change_requests',
      new TableIndex({
        name: 'IDX_donation_change_requests_status_temple',
        columnNames: ['status', 'templeId'],
      }),
    );

    await queryRunner.createIndex(
      'donation_change_requests',
      new TableIndex({
        name: 'IDX_donation_change_requests_donationId',
        columnNames: ['donationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('donation_change_requests', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "donation_change_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "donation_change_requests_type_enum"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP COLUMN IF EXISTS "submittedAsAnonymous"`);
  }
}
