import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddStripeWebhookEventsAndIndexes1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create stripe_webhook_events table for persistent idempotency
    await queryRunner.createTable(
      new Table({
        name: 'stripe_webhook_events',
        columns: [
          {
            name: 'eventId',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'eventType',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'receivedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'RECEIVED'",
          },
          {
            name: 'donationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'paymentIntentId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // eventId is primary key, unique index implicit
    await queryRunner.createIndex(
      'stripe_webhook_events',
      new TableIndex({
        name: 'IDX_stripe_webhook_events_received_at',
        columnNames: ['receivedAt'],
      }),
    );
    await queryRunner.createIndex(
      'stripe_webhook_events',
      new TableIndex({
        name: 'IDX_stripe_webhook_events_status',
        columnNames: ['status'],
      }),
    );

    // 2. Add indexes for high-traffic queries
    const donationsIndexes = [
      { name: 'IDX_donations_temple_id', columns: ['templeId'] },
      { name: 'IDX_donations_device_id', columns: ['deviceId'] },
      { name: 'IDX_donations_stripe_payment_intent_id', columns: ['stripePaymentIntentId'] },
      { name: 'IDX_donations_status', columns: ['status'] },
      { name: 'IDX_donations_created_at', columns: ['createdAt'] },
      { name: 'IDX_donations_temple_created', columns: ['templeId', 'createdAt'] },
    ];

    for (const idx of donationsIndexes) {
      try {
        await queryRunner.createIndex(
          'donations',
          new TableIndex({ name: idx.name, columnNames: idx.columns }),
        );
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }

    const devicesIndexes = [
      { name: 'IDX_devices_temple_id', columns: ['templeId'] },
    ];
    for (const idx of devicesIndexes) {
      try {
        await queryRunner.createIndex(
          'devices',
          new TableIndex({ name: idx.name, columnNames: idx.columns }),
        );
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }

    const donorsIndexes = [
      { name: 'IDX_donors_temple_id', columns: ['templeId'] },
    ];
    for (const idx of donorsIndexes) {
      try {
        await queryRunner.createIndex(
          'donors',
          new TableIndex({ name: idx.name, columnNames: idx.columns }),
        );
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }

    const categoryIndexes = [
      { name: 'IDX_donation_categories_temple_id', columns: ['templeId'] },
    ];
    for (const idx of categoryIndexes) {
      try {
        await queryRunner.createIndex(
          'donation_categories',
          new TableIndex({ name: idx.name, columnNames: idx.columns }),
        );
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stripe_webhook_events', true);

    const indexesToDrop = [
      { table: 'donations', name: 'IDX_donations_temple_id' },
      { table: 'donations', name: 'IDX_donations_device_id' },
      { table: 'donations', name: 'IDX_donations_stripe_payment_intent_id' },
      { table: 'donations', name: 'IDX_donations_status' },
      { table: 'donations', name: 'IDX_donations_created_at' },
      { table: 'donations', name: 'IDX_donations_temple_created' },
      { table: 'devices', name: 'IDX_devices_temple_id' },
      { table: 'donors', name: 'IDX_donors_temple_id' },
      { table: 'donation_categories', name: 'IDX_donation_categories_temple_id' },
    ];
    for (const idx of indexesToDrop) {
      try {
        await queryRunner.dropIndex(idx.table, idx.name);
      } catch {
        // Ignore if index doesn't exist
      }
    }
  }
}
