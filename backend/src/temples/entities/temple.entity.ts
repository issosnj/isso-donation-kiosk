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

  @Column({ default: false })
  yajmanOpportunitiesEnabled: boolean; // Master admin can enable yajman sponsorship tiers for this temple

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
      tapToDonateButtonColor?: string; // Hex color for "Tap to Donate" button
      categorySelectedColor?: string; // Hex color for selected category buttons
      categoryUnselectedColor?: string; // Hex color for unselected category buttons
      amountSelectedColor?: string; // Hex color for selected amount buttons
      amountUnselectedColor?: string; // Hex color for unselected amount buttons
      doneButtonColor?: string; // Hex color for Done button in modals (e.g., Religious Observances)
      returnToHomeButtonColor?: string; // Hex color for Return to Home button
      proceedToPaymentButtonColor?: string; // Hex color for Proceed to Payment button
      continueButtonColor?: string; // Hex color for Continue button in keypad popups (donor info)
      // Button style preferences (gradient vs solid)
      tapToDonateButtonGradient?: boolean; // Use gradient for Tap to Donate button
      returnToHomeButtonGradient?: boolean; // Use gradient for Return to Home button
      proceedToPaymentButtonGradient?: boolean; // Use gradient for Proceed to Payment button
      doneButtonGradient?: boolean; // Use gradient for Done button
      continueButtonGradient?: boolean; // Use gradient for Continue button in keypad popups
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
      donationSelectionPageLeftPadding?: number; // Left padding for donation selection page (e.g., 40)
      donationSelectionPageRightPadding?: number; // Right padding for donation selection page (e.g., 40)
      customAmountKeypadX?: number; // X position of custom amount keypad (e.g., 0)
      customAmountKeypadY?: number; // Y position of custom amount keypad (e.g., 0)
      customAmountKeypadWidth?: number; // Width of custom amount keypad (e.g., 320)
      customAmountKeypadHeight?: number; // Height of custom amount keypad (auto-calculated if not set)
      customAmountKeypadButtonHeight?: number; // Height of keypad buttons (e.g., 70)
      customAmountKeypadButtonSpacing?: number; // Spacing between keypad buttons (e.g., 12)
      customAmountKeypadButtonCornerRadius?: number; // Corner radius of keypad buttons (e.g., 12)
      customAmountKeypadBackgroundColor?: string; // Background color of keypad (e.g., "#87512B")
      customAmountKeypadBorderColor?: string; // Border color of keypad (e.g., "#F4A44E")
      customAmountKeypadBorderWidth?: number; // Border width of keypad (e.g., 3)
      customAmountKeypadGlowColor?: string; // Glow color around keypad (e.g., "#F4A44E")
      customAmountKeypadGlowRadius?: number; // Glow radius around keypad (e.g., 15)
      customAmountKeypadButtonColor?: string; // Background color of keypad buttons (e.g., "#F8D8A1")
      customAmountKeypadButtonTextColor?: string; // Text color of keypad buttons (e.g., "#333355")
      customAmountKeypadNumberFontSize?: number; // Font size of numbers on keypad (e.g., 32)
      customAmountKeypadLetterFontSize?: number; // Font size of letters on keypad (e.g., 10)
      customAmountKeypadPadding?: number; // Internal padding of keypad (e.g., 16)
      customAmountKeypadCornerRadius?: number; // Corner radius of keypad container (e.g., 16)
      backgroundImageUrl?: string; // URL to custom background image for kiosk home screen
      // Home Screen Layout Positioning
      homeScreenHeaderTopPadding?: number; // Top padding for home screen headers (e.g., 60)
      homeScreenSpacerMaxHeight?: number; // Max height of spacer above Tap to Donate button (e.g., 100)
      homeScreenContentSpacing?: number; // Spacing between home screen content elements (e.g., 20)
      homeScreenBottomButtonsPadding?: number; // Bottom padding for WhatsApp/Observances buttons (e.g., 50)
      homeScreenBottomButtonsLeftPadding?: number; // Left padding for bottom buttons (e.g., 20)
      // Donation Details Page Layout
      detailsPageHorizontalSpacing?: number; // Spacing between left and right sections (e.g., 40)
      detailsPageSidePadding?: number; // Padding on left/right sides (e.g., 60)
      detailsPageTopPadding?: number; // Top padding (e.g., 80)
      detailsPageBottomPadding?: number; // Bottom padding (e.g., 40)
      detailsCardMaxWidth?: number; // Max width for donation details card (e.g., 420)
      donorFormMaxWidth?: number; // Max width for donor form (e.g., 420)
      detailsCardPadding?: number; // Padding inside details card (e.g., 24)
      detailsCardSpacing?: number; // Spacing between items in card (e.g., 16)
      // Donation Details Page Fonts
      detailsAmountFontSize?: number; // Font size for large amount display (e.g., 56)
      detailsLabelFontSize?: number; // Font size for labels (e.g., 18)
      detailsInputFontSize?: number; // Font size for input fields (e.g., 18)
      detailsButtonFontSize?: number; // Font size for button text (e.g., 22)
      // Donation Details Page Colors
      detailsAmountColor?: string; // Hex color for amount display (e.g., "#423232")
      detailsTextColor?: string; // Hex color for text (e.g., "#423232")
      detailsInputBorderColor?: string; // Hex color for input border (e.g., "#CCCCCC")
      detailsInputFocusColor?: string; // Hex color for input focus border (e.g., "#3366CC")
      detailsButtonColor?: string; // Hex color for button background (e.g., "#3366CC")
      detailsButtonTextColor?: string; // Hex color for button text (e.g., "#FFFFFF")
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

