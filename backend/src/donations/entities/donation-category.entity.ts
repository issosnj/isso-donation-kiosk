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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

