import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { DonationCategory } from '../../donations/entities/donation-category.entity';
import { Donation } from '../../donations/entities/donation.entity';

@Entity('temples')
export class Temple {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  squareMerchantId: string;

  @Column({ type: 'text', nullable: true })
  squareAccessToken: string; // Encrypted

  @Column({ nullable: true })
  squareRefreshToken: string; // Encrypted

  @Column({ nullable: true })
  squareLocationId: string;

  @Column({ default: 'USD' })
  defaultCurrency: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'json', nullable: true })
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
  };

  @Column({ type: 'json', nullable: true })
  homeScreenConfig: {
    idleTimeoutSeconds?: number;
    customMessage?: string;
    whatsAppLink?: string;
    eventsText?: string;
    googleCalendarLink?: string;
    socialMedia?: Array<{
      platform: string;
      url: string;
    }>;
  };

  @OneToMany(() => Device, (device) => device.temple)
  devices: Device[];

  @OneToMany(() => DonationCategory, (category) => category.temple)
  categories: DonationCategory[];

  @OneToMany(() => Donation, (donation) => donation.temple)
  donations: Donation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

