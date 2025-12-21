import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Temple } from '../../temples/entities/temple.entity';

@Entity('donors')
@Index(['templeId', 'phone'], { unique: true }) // Unique phone per temple
export class Donor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templeId: string;

  @ManyToOne(() => Temple)
  @JoinColumn({ name: 'templeId' })
  temple: Temple;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  @Index()
  phone: string; // Used for lookup

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string; // Mailing address

  @Column({ type: 'int', default: 0 })
  totalDonations: number; // Count of donations

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number; // Total amount donated

  @Column({ type: 'timestamp', nullable: true })
  lastDonationDate: Date; // Date of most recent donation

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

