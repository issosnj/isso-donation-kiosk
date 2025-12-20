import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGmailFieldsToTemples1734567897000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    
    // Add gmailAccessToken
    const accessTokenExists = table?.findColumnByName('gmailAccessToken');
    if (!accessTokenExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'gmailAccessToken',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    // Add gmailRefreshToken
    const refreshTokenExists = table?.findColumnByName('gmailRefreshToken');
    if (!refreshTokenExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'gmailRefreshToken',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Add gmailEmail
    const emailExists = table?.findColumnByName('gmailEmail');
    if (!emailExists) {
      await queryRunner.addColumn(
        'temples',
        new TableColumn({
          name: 'gmailEmail',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('temples');
    
    const emailColumn = table?.findColumnByName('gmailEmail');
    if (emailColumn) {
      await queryRunner.dropColumn('temples', 'gmailEmail');
    }

    const refreshTokenColumn = table?.findColumnByName('gmailRefreshToken');
    if (refreshTokenColumn) {
      await queryRunner.dropColumn('temples', 'gmailRefreshToken');
    }

    const accessTokenColumn = table?.findColumnByName('gmailAccessToken');
    if (accessTokenColumn) {
      await queryRunner.dropColumn('temples', 'gmailAccessToken');
    }
  }
}

