/**
 * Theme utilities — sync between API theme and editor form state.
 * Single source of truth for defaults; eliminates duplicated setFormData blocks.
 */

import type { KioskTheme, ThemePreset, PresetId } from '@/types/theme'

export const DEFAULT_THEME: KioskTheme = {
  fonts: {
    headingFamily: 'Inter-SemiBold',
    headingSize: 32,
    buttonFamily: 'Inter-Medium',
    buttonSize: 18,
    bodyFamily: 'Inter-Regular',
    bodySize: 14,
  },
  colors: {
    headingColor: '#423232',
    buttonTextColor: '#FFFFFF',
    bodyTextColor: '#808080',
    subtitleColor: '#808080',
    quantityTotalColor: '#423232',
    tapToDonateButtonColor: '#D4AF37',
    categorySelectedColor: '#3366CC',
    categoryUnselectedColor: '#3366CC',
    amountSelectedColor: '#3366CC',
    amountUnselectedColor: '#3366CC',
    doneButtonColor: '#007AFF',
    returnToHomeButtonColor: '#D9C080',
    proceedToPaymentButtonColor: '#FF9500',
    continueButtonColor: '#D9C080',
    tapToDonateButtonGradient: false,
    returnToHomeButtonGradient: true,
    proceedToPaymentButtonGradient: true,
    doneButtonGradient: false,
    continueButtonGradient: true,
  },
  layout: {
    categoryBoxMaxWidth: 400,
    amountButtonWidth: 120,
    amountButtonHeight: 70,
    categoryButtonHeight: 70,
    headerTopPadding: 80,
    categoryHeaderTopPadding: 80,
    categoryAmountSectionSpacing: 40,
    buttonSpacing: 12,
    cornerRadius: 12,
    quantityTotalSpacing: 24,
    donationSelectionPageLeftPadding: 40,
    donationSelectionPageRightPadding: 40,
    customAmountKeypadWidth: 320,
    customAmountKeypadButtonHeight: 70,
    customAmountKeypadButtonSpacing: 12,
    customAmountKeypadButtonCornerRadius: 12,
    customAmountKeypadBackgroundColor: '#87512B',
    customAmountKeypadBorderColor: '#F4A44E',
    customAmountKeypadBorderWidth: 3,
    customAmountKeypadGlowColor: '#F4A44E',
    customAmountKeypadGlowRadius: 15,
    customAmountKeypadButtonColor: '#F8D8A1',
    customAmountKeypadButtonTextColor: '#333355',
    customAmountKeypadNumberFontSize: 32,
    customAmountKeypadLetterFontSize: 10,
    customAmountKeypadPadding: 16,
    customAmountKeypadCornerRadius: 16,
    homeScreenHeroTextPosition: 'slightly-higher',
    homeScreenCtaPosition: 'centered',
    homeScreenUtilityBarLayout: 'split',
    homeScreenWelcomeTextVisible: true,
    homeScreenHeader1Visible: true,
    homeScreenTimeStatusVisible: true,
    homeScreenTapToDonateVisible: true,
    homeScreenWhatsAppVisible: true,
    homeScreenObservanceVisible: true,
    homeScreenLanguageSelectorVisible: true,
    homeScreenHeaderTopPadding: 36,
    homeScreenSpacerMaxHeight: 48,
    homeScreenContentSpacing: 20,
    homeScreenBottomButtonsPadding: 40,
    detailsPageHorizontalSpacing: 40,
    detailsPageSidePadding: 60,
    detailsPageTopPadding: 80,
    detailsPageBottomPadding: 40,
    detailsCardMaxWidth: 420,
    donorFormMaxWidth: 420,
    detailsCardPadding: 24,
    detailsCardSpacing: 16,
    detailsAmountFontSize: 56,
    detailsLabelFontSize: 18,
    detailsInputFontSize: 18,
    detailsButtonFontSize: 22,
    detailsAmountColor: '#423232',
    detailsTextColor: '#423232',
    detailsInputBorderColor: '#CCCCCC',
    detailsInputFocusColor: '#3366CC',
    detailsButtonColor: '#3366CC',
    detailsButtonTextColor: '#FFFFFF',
  },
}

/** Sync API theme (or partial) into full KioskTheme. Use for load + cancel. */
export function themeFromApi(apiTheme: Record<string, unknown> | null | undefined): KioskTheme {
  if (!apiTheme) return { ...JSON.parse(JSON.stringify(DEFAULT_THEME)) }
  const migrated = migrateLegacyLayout(apiTheme)
  return deepMergeTheme(DEFAULT_THEME, migrated as Partial<KioskTheme>)
}

/** Migrate old layout keys to new preset-based structure. */
function migrateLegacyLayout(api: Record<string, unknown>): Record<string, unknown> {
  const layout = api.layout as Record<string, unknown> | undefined
  if (!layout) return api
  const out = { ...api, layout: { ...layout } }
  const L = out.layout as Record<string, unknown>
  if (L.homeScreenWhatsAppButtonsVisible !== undefined && L.homeScreenWhatsAppVisible === undefined) {
    L.homeScreenWhatsAppVisible = L.homeScreenWhatsAppButtonsVisible
    L.homeScreenObservanceVisible = L.homeScreenWhatsAppButtonsVisible
  }
  if (L.homeScreenHeroTextPosition === undefined && L.homeScreenHeaderTopPadding !== undefined) {
    L.homeScreenHeroTextPosition = (L.homeScreenHeaderTopPadding as number) < 45 ? 'slightly-higher' : 'centered'
  }
  if (L.homeScreenCtaPosition === undefined && L.homeScreenSpacerMaxHeight !== undefined) {
    L.homeScreenCtaPosition = (L.homeScreenSpacerMaxHeight as number) < 65 ? 'centered' : 'lower-center'
  }
  if (L.homeScreenUtilityBarLayout === undefined) {
    L.homeScreenUtilityBarLayout = 'split'
  }
  return out
}

function deepMergeTheme(base: KioskTheme, override: Partial<KioskTheme>): KioskTheme {
  const result = JSON.parse(JSON.stringify(base)) as KioskTheme
  if (override.fonts) {
    result.fonts = { ...result.fonts, ...override.fonts }
  }
  if (override.colors) {
    result.colors = { ...result.colors, ...override.colors }
  }
  if (override.layout) {
    result.layout = { ...result.layout, ...override.layout }
  }
  return result
}

/** Convert editor form state to API payload shape. Theme is already correct shape. */
export function themeToApi(theme: KioskTheme): Record<string, unknown> {
  return theme as unknown as Record<string, unknown>
}

/** Presets — curated theme configurations. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Balanced, devotional look with blue accents',
    previewColors: ['#423232', '#3366CC', '#D4AF37'],
    theme: {},
  },
  {
    id: 'temple-classic',
    name: 'Temple Classic',
    description: 'Warm gold and red, traditional devotional',
    previewColors: ['#8B4513', '#D4AF37', '#B22222'],
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        tapToDonateButtonColor: '#B8860B',
        categorySelectedColor: '#8B4513',
        categoryUnselectedColor: '#A0522D',
        amountSelectedColor: '#8B4513',
        amountUnselectedColor: '#A0522D',
        proceedToPaymentButtonColor: '#D4AF37',
        returnToHomeButtonColor: '#CD853F',
        continueButtonColor: '#D4AF37',
      },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, light, minimal distraction',
    previewColors: ['#333333', '#666666', '#FFFFFF'],
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        headingColor: '#333333',
        categorySelectedColor: '#555555',
        categoryUnselectedColor: '#CCCCCC',
        amountSelectedColor: '#555555',
        amountUnselectedColor: '#E5E5E5',
        proceedToPaymentButtonColor: '#333333',
        returnToHomeButtonColor: '#666666',
        continueButtonColor: '#333333',
        tapToDonateButtonColor: '#333333',
      },
      layout: {
        ...DEFAULT_THEME.layout,
        cornerRadius: 8,
        customAmountKeypadBackgroundColor: '#F5F5F5',
        customAmountKeypadBorderColor: '#DDDDDD',
        customAmountKeypadButtonColor: '#FFFFFF',
        customAmountKeypadButtonTextColor: '#333333',
      },
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Rich, elevated look with depth',
    previewColors: ['#1a1a2e', '#16213e', '#e94560'],
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        headingColor: '#1a1a2e',
        categorySelectedColor: '#16213e',
        categoryUnselectedColor: '#0f3460',
        amountSelectedColor: '#e94560',
        amountUnselectedColor: '#0f3460',
        proceedToPaymentButtonColor: '#e94560',
        returnToHomeButtonColor: '#16213e',
        continueButtonColor: '#e94560',
        tapToDonateButtonColor: '#e94560',
      },
      layout: {
        ...DEFAULT_THEME.layout,
        cornerRadius: 16,
        customAmountKeypadBackgroundColor: '#16213e',
        customAmountKeypadBorderColor: '#e94560',
        customAmountKeypadButtonColor: '#0f3460',
        customAmountKeypadButtonTextColor: '#ffffff',
      },
    },
  },
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Fresh, contemporary with blue accent',
    previewColors: ['#2563eb', '#f8fafc', '#1e293b'],
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        headingColor: '#1e293b',
        categorySelectedColor: '#2563eb',
        categoryUnselectedColor: '#e2e8f0',
        amountSelectedColor: '#2563eb',
        amountUnselectedColor: '#f1f5f9',
        proceedToPaymentButtonColor: '#2563eb',
        returnToHomeButtonColor: '#64748b',
        continueButtonColor: '#2563eb',
        tapToDonateButtonColor: '#2563eb',
      },
      layout: {
        ...DEFAULT_THEME.layout,
        cornerRadius: 12,
      },
    },
  },
]

export function applyPreset(presetId: PresetId): KioskTheme {
  const preset = THEME_PRESETS.find((p) => p.id === presetId)
  if (!preset) return themeFromApi(null)
  return deepMergeTheme(DEFAULT_THEME, preset.theme)
}
