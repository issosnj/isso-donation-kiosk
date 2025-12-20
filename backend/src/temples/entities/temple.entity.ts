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
      eventsText?: string; // Deprecated - use localEvents instead
      googleCalendarLink?: string;
      localEvents?: Array<{
        id: string;
        title: string;
        description?: string;
        date: string; // ISO date string (YYYY-MM-DD)
        startTime?: string; // Optional time (HH:mm)
        endTime?: string; // Optional time (HH:mm)
        isAllDay?: boolean;
      }>;
      socialMedia?: Array<{
        platform: string;
        url: string;
      }>;
      presetAmounts?: number[]; // Preset donation amounts (e.g., [5, 10, 25, 50, 100])
      buttonColors?: {
        categorySelected?: string; // Hex color for selected category buttons
        categoryUnselected?: string; // Hex color for unselected category buttons
        amountSelected?: string; // Hex color for selected amount buttons
        amountUnselected?: string; // Hex color for unselected amount buttons
      };
      backgroundImageUrl?: string; // URL to custom background image for kiosk home screen
    };

  @Column({ type: 'json', nullable: true })
  kioskTheme: {
    // Font settings
    fonts?: {
      headingFamily?: string; // Font family for headings (e.g., "Inter-SemiBold")
      headingSize?: number; // Base size for headings
      buttonFamily?: string; // Font family for buttons (e.g., "Inter-Medium")
      buttonSize?: number; // Base size for buttons
      bodyFamily?: string; // Font family for body text (e.g., "Inter-Regular")
      bodySize?: number; // Base size for body text
    };
    // Font colors
    colors?: {
      headingColor?: string; // Hex color for headings (e.g., "#423232")
      buttonTextColor?: string; // Hex color for button text (default: white)
      bodyTextColor?: string; // Hex color for body text
      subtitleColor?: string; // Hex color for subtitles
    };
    // Layout settings
    layout?: {
      categoryBoxMaxWidth?: number; // Max width for category boxes (e.g., 400)
      amountButtonWidth?: number; // Width for amount buttons (e.g., 120)
      amountButtonHeight?: number; // Height for amount buttons (e.g., 70)
      categoryButtonHeight?: number; // Height for category buttons (e.g., 70)
      headerTopPadding?: number; // Top padding for headers (e.g., 120)
      sectionSpacing?: number; // Spacing between sections
      buttonSpacing?: number; // Spacing between buttons
      cornerRadius?: number; // Corner radius for buttons (e.g., 12)
    };
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

