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

@Entity('donation_categories')
export class DonationCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templeId: string;

  @ManyToOne(() => Temple)
  @JoinColumn({ name: 'templeId' })
  temple: Temple;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  showOnKiosk: boolean;

  /** When true, kiosk shows +/- quantity under Custom Amount for this category. */
  @Column({ default: false })
  quantityEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  showStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  showEndDate: Date;

  @Column({ type: 'json', nullable: true })
  yajmanOpportunities?: Array<{
    id: string;                    // Unique ID for this opportunity
    name: string;                  // e.g., "ANNUAL POONAM SABHA YAJMAN"
    description?: string;           // Optional description
  }>;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;            // Order for displaying categories (lower = first)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

