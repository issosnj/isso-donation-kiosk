/**
 * Kiosk Theme — Shared types for admin editor, preview, and API persistence.
 * Maps to backend global_settings.kioskTheme and kiosk app DesignSystem.
 */

export interface ThemeFonts {
  headingFamily: string
  headingSize: number
  buttonFamily: string
  buttonSize: number
  bodyFamily: string
  bodySize: number
}

export interface ThemeColors {
  headingColor: string
  buttonTextColor: string
  bodyTextColor: string
  subtitleColor: string
  quantityTotalColor: string
  tapToDonateButtonColor: string
  categorySelectedColor: string
  categoryUnselectedColor: string
  amountSelectedColor: string
  amountUnselectedColor: string
  doneButtonColor: string
  returnToHomeButtonColor: string
  proceedToPaymentButtonColor: string
  continueButtonColor: string
  tapToDonateButtonGradient: boolean
  returnToHomeButtonGradient: boolean
  proceedToPaymentButtonGradient: boolean
  doneButtonGradient: boolean
  continueButtonGradient: boolean
}

export interface ThemeLayout {
  // Donation Selection
  categoryBoxMaxWidth: number
  amountButtonWidth: number
  amountButtonHeight: number
  categoryButtonHeight: number
  headerTopPadding: number
  categoryHeaderTopPadding: number
  categoryAmountSectionSpacing: number
  buttonSpacing: number
  cornerRadius: number
  quantityTotalSpacing: number
  donationSelectionPageLeftPadding: number
  donationSelectionPageRightPadding: number
  // Custom Amount Keypad
  customAmountKeypadWidth: number
  customAmountKeypadButtonHeight: number
  customAmountKeypadButtonSpacing: number
  customAmountKeypadButtonCornerRadius: number
  customAmountKeypadBackgroundColor: string
  customAmountKeypadBorderColor: string
  customAmountKeypadBorderWidth: number
  customAmountKeypadGlowColor: string
  customAmountKeypadGlowRadius: number
  customAmountKeypadButtonColor: string
  customAmountKeypadButtonTextColor: string
  customAmountKeypadNumberFontSize: number
  customAmountKeypadLetterFontSize: number
  customAmountKeypadPadding: number
  customAmountKeypadCornerRadius: number
  // Home Screen — structured presets only (no raw x/y)
  homeScreenHeroTextPosition: 'slightly-higher' | 'centered'
  homeScreenCtaPosition: 'centered' | 'lower-center'
  homeScreenUtilityBarLayout: 'split' | 'grouped-left' | 'grouped-right'
  homeScreenWelcomeTextVisible: boolean
  homeScreenHeader1Visible: boolean
  homeScreenTimeStatusVisible: boolean
  homeScreenTapToDonateVisible: boolean
  homeScreenWhatsAppVisible: boolean
  homeScreenLanguageSelectorVisible: boolean
  // Legacy pixel values (computed from presets in kiosk app; kept for API compat)
  homeScreenHeaderTopPadding: number
  homeScreenSpacerMaxHeight: number
  homeScreenContentSpacing: number
  homeScreenBottomButtonsPadding: number
  // Donation Details
  detailsPageHorizontalSpacing: number
  detailsPageSidePadding: number
  detailsPageTopPadding: number
  detailsPageBottomPadding: number
  detailsCardMaxWidth: number
  donorFormMaxWidth: number
  detailsCardPadding: number
  detailsCardSpacing: number
  detailsAmountFontSize: number
  detailsLabelFontSize: number
  detailsInputFontSize: number
  detailsButtonFontSize: number
  detailsAmountColor: string
  detailsTextColor: string
  detailsInputBorderColor: string
  detailsInputFocusColor: string
  detailsButtonColor: string
  detailsButtonTextColor: string
}

export interface KioskTheme {
  fonts: ThemeFonts
  colors: ThemeColors
  layout: ThemeLayout
}

export type PresetId = 'default' | 'minimal' | 'premium' | 'modern-clean' | 'temple-classic'

export interface ThemePreset {
  id: PresetId
  name: string
  description: string
  theme: Partial<KioskTheme>
  previewColors: [string, string, string] // 3 swatch colors
}
