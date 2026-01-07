import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAssignmentHistoryToDonations1736500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add assignedBy column
    await queryRunner.addColumn(
      'donations',
      new TableColumn({
        name: 'assignedBy',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add assignedAt column
    await queryRunner.addColumn(
      'donations',
      new TableColumn({
        name: 'assignedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donations', 'assignedAt');
    await queryRunner.dropColumn('donations', 'assignedBy');
  }
}

