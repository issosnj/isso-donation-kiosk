import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixDonationDeviceCascade1734567907000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the existing foreign key constraint with CASCADE
    const donationsTable = await queryRunner.getTable('donations');
    const existingForeignKey = donationsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('deviceId') !== -1,
    );

    if (existingForeignKey) {
      await queryRunner.dropForeignKey('donations', existingForeignKey);
    }

    // Step 2: Make deviceId nullable (so donations can exist without a device)
    await queryRunner.query(`
      ALTER TABLE "donations" 
      ALTER COLUMN "deviceId" DROP NOT NULL;
    `);

    // Step 3: Recreate the foreign key with SET NULL instead of CASCADE
    // This ensures donations are preserved when devices are deleted
    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['deviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'SET NULL', // Set deviceId to NULL instead of deleting donation
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: Drop the SET NULL foreign key
    const donationsTable = await queryRunner.getTable('donations');
    const existingForeignKey = donationsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('deviceId') !== -1,
    );

    if (existingForeignKey) {
      await queryRunner.dropForeignKey('donations', existingForeignKey);
    }

    // Revert: Make deviceId NOT NULL again
    // Note: This will fail if there are donations with NULL deviceId
    // In that case, you'd need to assign them to a device first
    await queryRunner.query(`
      ALTER TABLE "donations" 
      ALTER COLUMN "deviceId" SET NOT NULL;
    `);

    // Revert: Recreate CASCADE foreign key
    await queryRunner.createForeignKey(
      'donations',
      new TableForeignKey({
        columnNames: ['deviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'CASCADE',
      }),
    );
  }
}

