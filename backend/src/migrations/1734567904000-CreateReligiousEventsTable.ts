import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReligiousEventsTable1734567904000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'religious_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'startTime',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'isRecurring',
            type: 'boolean',
            default: true,
          },
          {
            name: 'recurrencePattern',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
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
        indices: [
          {
            columnNames: ['date'],
          },
          {
            columnNames: ['isActive'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('religious_events');
  }
}

