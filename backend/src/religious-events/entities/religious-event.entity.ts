import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('religious_events')
export class ReligiousEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Poonam", "Upvas", "Ekadashi"

  @Column({ type: 'text', nullable: true })
  description: string; // Optional description

  @Column({ type: 'date' })
  date: Date; // Date of the religious event

  @Column({ nullable: true })
  startTime: string; // Optional time (HH:mm format)

  @Column({ default: true })
  isRecurring: boolean; // Whether this event repeats (e.g., monthly Poonam)

  @Column({ nullable: true })
  recurrencePattern: string; // e.g., "monthly", "yearly" - for future use

  @Column({ default: 0 })
  displayOrder: number; // Order in which events are displayed

  @Column({ default: true })
  isActive: boolean; // Whether to show this event

  @Column({ type: 'json', nullable: true })
  googleCalendarLinks: string[]; // Array of Google public calendar URLs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

