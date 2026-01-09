import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('theme_versions')
@Index('IDX_theme_versions_created_at', ['createdAt'])
@Index('IDX_theme_versions_version', ['version'])
export class ThemeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'integer',
    generated: true,
    generationStrategy: 'increment',
  })
  version: number;

  @Column({ type: 'jsonb' })
  kioskTheme: any;

  @Column({ nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  user: User;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isAutomatic: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

