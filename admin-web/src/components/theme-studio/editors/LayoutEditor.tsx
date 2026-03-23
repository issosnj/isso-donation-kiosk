'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import SliderInput from '../inputs/SliderInput'
import ToggleInput from '../inputs/ToggleInput'
import RadioGroupInput from '../inputs/RadioGroupInput'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'

const HERO_POSITIONS = [
  { value: 'slightly-higher' as const, label: 'Slightly Higher' },
  { value: 'centered' as const, label: 'Centered' },
]

const CTA_POSITIONS = [
  { value: 'centered' as const, label: 'Centered' },
  { value: 'lower-center' as const, label: 'Lower Center' },
]

const UTILITY_BAR_LAYOUTS = [
  { value: 'split' as const, label: 'Split (left utilities, right language)' },
  { value: 'grouped-left' as const, label: 'Grouped Left' },
  { value: 'grouped-right' as const, label: 'Grouped Right' },
]

interface LayoutEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function LayoutEditor({ theme, onChange, disabled }: LayoutEditorProps) {
  const updateLayout = (updates: Partial<KioskTheme['layout']>) => {
    onChange({ ...theme, layout: { ...theme.layout, ...updates } })
  }

  const heroPosition = theme.layout.homeScreenHeroTextPosition ?? 'slightly-higher'
  const ctaPosition = theme.layout.homeScreenCtaPosition ?? 'centered'
  const utilityLayout = theme.layout.homeScreenUtilityBarLayout ?? 'split'

  return (
    <ThemeSectionCard
      title="Layout"
      description="Home screen positioning and visibility"
      icon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Hero Text Position */}
        <RadioGroupInput
          label="Hero Text Position"
          description="Vertical placement of welcome/title block"
          value={heroPosition}
          options={HERO_POSITIONS}
          onChange={(v) => updateLayout({ homeScreenHeroTextPosition: v })}
          disabled={disabled}
        />

        {/* CTA Position */}
        <RadioGroupInput
          label="CTA Position"
          description="Vertical placement of Tap to Donate button"
          value={ctaPosition}
          options={CTA_POSITIONS}
          onChange={(v) => updateLayout({ homeScreenCtaPosition: v })}
          disabled={disabled}
        />

        {/* Utility Bar Layout */}
        <RadioGroupInput
          label="Utility Bar Layout"
          description="Arrangement of WhatsApp, Observance, and Language"
          value={utilityLayout}
          options={UTILITY_BAR_LAYOUTS}
          onChange={(v) => updateLayout({ homeScreenUtilityBarLayout: v })}
          disabled={disabled}
        />

        <hr className="border-gray-200" />

        {/* Utility Visibility */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Utility Visibility
          </p>
          <div className="mt-2 space-y-3">
            <ToggleInput
              label="Show WhatsApp"
              checked={theme.layout.homeScreenWhatsAppVisible ?? true}
              onChange={(v) => updateLayout({ homeScreenWhatsAppVisible: v })}
              disabled={disabled}
            />
            <ToggleInput
              label="Show Observance"
              checked={theme.layout.homeScreenObservanceVisible ?? true}
              onChange={(v) => updateLayout({ homeScreenObservanceVisible: v })}
              disabled={disabled}
            />
            <ToggleInput
              label="Show Language Selector"
              checked={theme.layout.homeScreenLanguageSelectorVisible ?? true}
              onChange={(v) => updateLayout({ homeScreenLanguageSelectorVisible: v })}
              disabled={disabled}
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Other visibility toggles */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Content Visibility
          </p>
          <div className="mt-2 space-y-3">
            <ToggleInput
              label="Welcome Text"
              checked={theme.layout.homeScreenWelcomeTextVisible ?? true}
              onChange={(v) => updateLayout({ homeScreenWelcomeTextVisible: v })}
              disabled={disabled}
            />
            <ToggleInput
              label="Header / Subtitle"
              checked={theme.layout.homeScreenHeader1Visible ?? true}
              onChange={(v) => updateLayout({ homeScreenHeader1Visible: v })}
              disabled={disabled}
            />
            <ToggleInput
              label="Tap to Donate Button"
              checked={theme.layout.homeScreenTapToDonateVisible ?? true}
              onChange={(v) => updateLayout({ homeScreenTapToDonateVisible: v })}
              disabled={disabled}
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Donation screen layout (unchanged) */}
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Donation Screen
        </p>
        <SliderInput
          label="Category Box Max Width"
          value={theme.layout.categoryBoxMaxWidth}
          onChange={(v) => updateLayout({ categoryBoxMaxWidth: v })}
          min={200}
          max={500}
          unit="px"
          disabled={disabled}
        />
      </div>
    </ThemeSectionCard>
  )
}
