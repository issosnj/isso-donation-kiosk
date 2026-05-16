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
import { Donation } from './donation.entity';
import { User } from '../../users/entities/user.entity';

export enum DonationChangeRequestType {
  DONOR_DISPLAY_CHANGE = 'DONOR_DISPLAY_CHANGE',
}

export enum DonationChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/** Snapshot of donor display fields for audit / apply. */
export type DonorDisplaySnapshot = {
  donorName: string | null;
  donorPhone: string | null;
  donorEmail: string | null;
  donorAddress: string | null;
  donorId: string | null;
};

@Entity('donation_change_requests')
export class DonationChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templeId: string;

  @ManyToOne(() => Temple)
  @JoinColumn({ name: 'templeId' })
  temple: Temple;

  @Column()
  donationId: string;

  @ManyToOne(() => Donation)
  @JoinColumn({ name: 'donationId' })
  donation: Donation;

  @Column({
    type: 'enum',
    enum: DonationChangeRequestType,
    enumName: 'donation_change_requests_type_enum',
    default: DonationChangeRequestType.DONOR_DISPLAY_CHANGE,
  })
  type: DonationChangeRequestType;

  @Column({
    type: 'enum',
    enum: DonationChangeRequestStatus,
    enumName: 'donation_change_requests_status_enum',
    default: DonationChangeRequestStatus.PENDING,
  })
  status: DonationChangeRequestStatus;

  @Column()
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @Column({ type: 'varchar', nullable: true })
  reviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedByUserId' })
  reviewedByUser: User | null;

  @Column({ type: 'text', nullable: true })
  templeNote: string | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ type: 'jsonb' })
  previousSnapshot: DonorDisplaySnapshot;

  @Column({ type: 'jsonb' })
  proposedSnapshot: DonorDisplaySnapshot;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
