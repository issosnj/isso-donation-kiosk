import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPledgeFieldsToDonations1734567900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');
    
    // Add pledgeToken
    const tokenExists = table?.findColumnByName('pledgeToken');
    if (!tokenExists) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'pledgeToken',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Add pledgeExpiryDate
    const expiryExists = table?.findColumnByName('pledgeExpiryDate');
    if (!expiryExists) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'pledgeExpiryDate',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    // Add pledgePaymentLink
    const linkExists = table?.findColumnByName('pledgePaymentLink');
    if (!linkExists) {
      await queryRunner.addColumn(
        'donations',
        new TableColumn({
          name: 'pledgePaymentLink',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Update enum to include PLEDGED status
    // Note: TypeORM doesn't support enum updates directly, so we'll need to handle this
    // For now, the enum change is in the entity and will be applied on next schema sync
    // In production, you may need to manually update the enum type in PostgreSQL
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donations');
    
    const linkColumn = table?.findColumnByName('pledgePaymentLink');
    if (linkColumn) {
      await queryRunner.dropColumn('donations', 'pledgePaymentLink');
    }

    const expiryColumn = table?.findColumnByName('pledgeExpiryDate');
    if (expiryColumn) {
      await queryRunner.dropColumn('donations', 'pledgeExpiryDate');
    }

    const tokenColumn = table?.findColumnByName('pledgeToken');
    if (tokenColumn) {
      await queryRunner.dropColumn('donations', 'pledgeToken');
    }
  }
}

