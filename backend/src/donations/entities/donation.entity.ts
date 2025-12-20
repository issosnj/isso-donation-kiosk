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

  @Column()
  deviceId: string;

  @ManyToOne(() => Device)
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

  @Column({ nullable: true })
  squarePaymentId: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

