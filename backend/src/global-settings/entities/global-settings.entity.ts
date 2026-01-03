import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('global_settings')
export class GlobalSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Only one row should exist - use a constant ID
  @Column({ default: 'global' })
  key: string;

  @Column({ type: 'json', nullable: true })
  kioskTheme: {
    // Font settings
    fonts?: {
      headingFamily?: string;
      headingSize?: number;
      buttonFamily?: string;
      buttonSize?: number;
      bodyFamily?: string;
      bodySize?: number;
    };
    // Font colors
    colors?: {
      headingColor?: string;
      buttonTextColor?: string;
      bodyTextColor?: string;
      subtitleColor?: string;
      quantityTotalColor?: string;
      tapToDonateButtonColor?: string;
      categorySelectedColor?: string;
      categoryUnselectedColor?: string;
      amountSelectedColor?: string;
      amountUnselectedColor?: string;
      doneButtonColor?: string;
      returnToHomeButtonColor?: string;
      proceedToPaymentButtonColor?: string;
      continueButtonColor?: string;
      tapToDonateButtonGradient?: boolean;
      returnToHomeButtonGradient?: boolean;
      proceedToPaymentButtonGradient?: boolean;
      doneButtonGradient?: boolean;
      continueButtonGradient?: boolean;
    };
    // Layout settings
    layout?: {
      categoryBoxMaxWidth?: number;
      amountButtonWidth?: number;
      amountButtonHeight?: number;
      categoryButtonHeight?: number;
      headerTopPadding?: number;
      categoryHeaderTopPadding?: number;
      sectionSpacing?: number;
      categoryAmountSectionSpacing?: number;
      buttonSpacing?: number;
      cornerRadius?: number;
      quantityTotalSpacing?: number;
      donationSelectionPageLeftPadding?: number;
      donationSelectionPageRightPadding?: number;
      customAmountKeypadX?: number;
      customAmountKeypadY?: number;
      customAmountKeypadWidth?: number;
      customAmountKeypadHeight?: number;
      customAmountKeypadButtonHeight?: number;
      customAmountKeypadButtonSpacing?: number;
      customAmountKeypadButtonCornerRadius?: number;
      customAmountKeypadBackgroundColor?: string;
      customAmountKeypadBorderColor?: string;
      customAmountKeypadBorderWidth?: number;
      customAmountKeypadGlowColor?: string;
      customAmountKeypadGlowRadius?: number;
      customAmountKeypadButtonColor?: string;
      customAmountKeypadButtonTextColor?: string;
      customAmountKeypadNumberFontSize?: number;
      customAmountKeypadLetterFontSize?: number;
      customAmountKeypadPadding?: number;
      customAmountKeypadCornerRadius?: number;
      backgroundImageUrl?: string;
      homeScreenHeaderTopPadding?: number;
      homeScreenSpacerMaxHeight?: number;
      homeScreenContentSpacing?: number;
      homeScreenBottomButtonsPadding?: number;
      homeScreenBottomButtonsLeftPadding?: number;
      homeScreenWelcomeTextX?: number;
      homeScreenWelcomeTextY?: number;
      homeScreenHeader1X?: number;
      homeScreenHeader1Y?: number;
      homeScreenUnderGadiTextX?: number;
      homeScreenUnderGadiTextY?: number;
      homeScreenAddressX?: number;
      homeScreenAddressY?: number;
      homeScreenTimeStatusX?: number;
      homeScreenTimeStatusY?: number;
      homeScreenTapToDonateX?: number;
      homeScreenTapToDonateY?: number;
      homeScreenQuickActionsX?: number;
      homeScreenQuickActionsY?: number;
      homeScreenCustomMessageX?: number;
      homeScreenCustomMessageY?: number;
      homeScreenWhatsAppButtonsX?: number;
      homeScreenWhatsAppButtonsY?: number;
      homeScreenLanguageSelectorX?: number;
      homeScreenLanguageSelectorY?: number;
      homeScreenWelcomeTextVisible?: boolean;
      homeScreenHeader1Visible?: boolean;
      homeScreenUnderGadiTextVisible?: boolean;
      homeScreenAddressVisible?: boolean;
      homeScreenTimeStatusVisible?: boolean;
      homeScreenTapToDonateVisible?: boolean;
      homeScreenQuickActionsVisible?: boolean;
      homeScreenCustomMessageVisible?: boolean;
      homeScreenWhatsAppButtonsVisible?: boolean;
      homeScreenLanguageSelectorVisible?: boolean;
      detailsPageHorizontalSpacing?: number;
      detailsPageSidePadding?: number;
      detailsPageTopPadding?: number;
      detailsPageBottomPadding?: number;
      detailsCardMaxWidth?: number;
      donorFormMaxWidth?: number;
      detailsCardPadding?: number;
      detailsCardSpacing?: number;
      detailsAmountFontSize?: number;
      detailsLabelFontSize?: number;
      detailsInputFontSize?: number;
      detailsButtonFontSize?: number;
      detailsAmountColor?: string;
      detailsTextColor?: string;
      detailsInputBorderColor?: string;
      detailsInputFocusColor?: string;
      detailsButtonColor?: string;
      detailsButtonTextColor?: string;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

