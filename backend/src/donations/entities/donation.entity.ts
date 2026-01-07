import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Temple } from '../../temples/entities/temple.entity';
import { Device } from '../../devices/entities/device.entity';
import { DonationCategory } from './donation-category.entity';
import { Donor } from '../../donors/entities/donor.entity';

export enum DonationStatus {
  PENDING = 'PENDING',
  PLEDGED = 'PLEDGED',  // Pledged but not paid yet
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
}

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templeId: string;

  @ManyToOne(() => Temple)
  @JoinColumn({ name: 'templeId' })
  temple: Temple;

  @Column({ nullable: true })
  deviceId: string;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => DonationCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: DonationCategory;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  donorName: string;

  @Column({ nullable: true })
  donorPhone: string;

  @Column({ nullable: true })
  donorEmail: string;

  @Column({ type: 'text', nullable: true })
  donorAddress: string; // Mailing address

  @Column({ nullable: true })
  donorId: string; // Link to Donor entity (for assigning anonymous donations)

  @ManyToOne(() => Donor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'donorId' })
  donor: Donor;

  @Column({ nullable: true })
  squarePaymentId: string; // Legacy Square payment ID

  @Column({ nullable: true })
  stripePaymentIntentId: string; // Stripe PaymentIntent ID

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  netAmount: number; // Amount after processing fees

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  squareFee: number; // Square processing fee (legacy)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stripeFee: number; // Stripe processing fee

  @Column({ nullable: true })
  cardLast4: string; // Last 4 digits of card

  @Column({ nullable: true })
  cardType: string; // Card type (VISA, MASTERCARD, etc.)

  @Column({ nullable: true })
  receiptNumber: string; // Format: TempleCode - K - 0001

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.PENDING,
  })
  status: DonationStatus;

  @Column({ nullable: true })
  pledgeToken: string; // Unique token for pledge payment link

  @Column({ type: 'timestamp', nullable: true })
  pledgeExpiryDate: Date; // Optional: when pledge expires

  @Column({ nullable: true })
  pledgePaymentLink: string; // Link to pay later (QR code or URL)

  @Column({ nullable: true })
  assignedBy: string; // User ID who assigned this donation to a donor

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date; // When the donation was assigned to a donor

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

