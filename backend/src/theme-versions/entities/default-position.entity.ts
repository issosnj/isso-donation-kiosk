import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('default_positions')
@Unique(['elementType', 'screenType'])
@Index('IDX_default_positions_element_screen', ['elementType', 'screenType'])
export class DefaultPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  elementType: string; // e.g., 'categorySection', 'amountSection', 'welcomeText', etc.

  @Column({ type: 'varchar', length: 50 })
  screenType: string; // e.g., 'home', 'donationSelection', 'details', etc.

  @Column({ type: 'jsonb' })
  position: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    [key: string]: any; // Allow additional positioning properties
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    alignment?: string;
    visibility?: boolean;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true })
  isDefault: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  updatedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

