import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export enum WebhookEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

@Entity('stripe_webhook_events')
export class StripeWebhookEvent {
  @PrimaryColumn()
  eventId: string;

  @Column()
  eventType: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: WebhookEventStatus.RECEIVED,
  })
  status: WebhookEventStatus;

  @Column({ nullable: true })
  donationId: string | null;

  @Column({ nullable: true })
  paymentIntentId: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
