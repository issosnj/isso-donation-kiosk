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
  templeCode: string; // Code used in receipt numbers (e.g., "ISSO", "NJ01")

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

  @Column({ type: 'text', nullable: true })
  gmailAccessToken: string; // Encrypted Gmail OAuth access token

  @Column({ nullable: true })
  gmailRefreshToken: string; // Encrypted Gmail OAuth refresh token

  @Column({ nullable: true })
  gmailEmail: string; // Gmail address that is connected

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
      quantityTotalColor?: string; // Hex color for quantity and total display (e.g., "#423232")
    };
    // Layout settings
    layout?: {
      categoryBoxMaxWidth?: number; // Max width for category boxes (e.g., 400)
      amountButtonWidth?: number; // Width for amount buttons (e.g., 120)
      amountButtonHeight?: number; // Height for amount buttons (e.g., 70)
      categoryButtonHeight?: number; // Height for category buttons (e.g., 70)
      headerTopPadding?: number; // Top padding for headers (e.g., 120)
      categoryHeaderTopPadding?: number; // Top padding for category header (to align with amount header)
      sectionSpacing?: number; // Spacing between sections
      categoryAmountSectionSpacing?: number; // Horizontal spacing between category and amount sections (e.g., 40)
      buttonSpacing?: number; // Spacing between buttons
      cornerRadius?: number; // Corner radius for buttons (e.g., 12)
      quantityTotalSpacing?: number; // Spacing between quantity and total when category selected (e.g., 24)
    };
  };

  @Column({ type: 'json', nullable: true })
  receiptConfig: {
    // Email settings
    fromEmail?: string; // Email address to send receipts from (e.g., "donations@temple.org")
    fromName?: string; // Name to display as sender (e.g., "ISSO Temple")
    subject?: string; // Email subject template (e.g., "Donation Receipt - {{templeName}}")
    
    // Receipt header
    organizationName?: string; // Main organization name (e.g., "International Swaminarayan Satsang Organization")
    organizationSubtitle?: string; // Subtitle/affiliation (e.g., "Under Shree NarNarayandev Gadi")
    headerTitle?: string; // Top center title (e.g., "Shree Swaminarayan Vijaytetram")
    logoUrl?: string; // Logo URL for receipt
    
    // Contact information
    showContactInfo?: boolean; // Whether to show contact info on receipt
    phone?: string; // Phone number
    email?: string; // Email address
    website?: string; // Website URL
    
    // Receipt content
    headerText?: string; // Header text for receipt (e.g., "Thank You for Your Donation")
    footerText?: string; // Footer text for receipt (e.g., "Your donation helps support our temple")
    customMessage?: string; // Custom message to include in receipt
    thankYouMessage?: string; // Thank you message (e.g., "Thank you for your kind donation, your donation may be tax deductible.")
    
    // Tax information
    includeTaxId?: boolean; // Whether to include tax ID in receipt
    taxId?: string; // Tax ID number (EIN) to include in receipt
    taxExemptMessage?: string; // Tax exempt status message
    
    // Additional fields
    showPreparedBy?: boolean; // Whether to show "Prepared by" field
    preparedBy?: string; // Default prepared by name
    showPaymentMethod?: boolean; // Whether to show payment method
    showAmountInWords?: boolean; // Whether to show amount in words
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

