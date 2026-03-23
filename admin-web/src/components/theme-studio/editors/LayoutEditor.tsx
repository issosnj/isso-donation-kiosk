'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import SliderInput from '../inputs/SliderInput'
import ToggleInput from '../inputs/ToggleInput'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'

interface LayoutEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function LayoutEditor({ theme, onChange, disabled }: LayoutEditorProps) {
  const updateLayout = (updates: Partial<KioskTheme['layout']>) => {
    onChange({ ...theme, layout: { ...theme.layout, ...updates } })
  }

  return (
    <ThemeSectionCard
      title="Layout"
      description="Spacing, visibility, and density"
      icon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Home Screen Visibility
        </p>
        <ToggleInput
          label="Welcome Text"
          checked={theme.layout.homeScreenWelcomeTextVisible}
          onChange={(v) => updateLayout({ homeScreenWelcomeTextVisible: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="Header / Subtitle"
          checked={theme.layout.homeScreenHeader1Visible}
          onChange={(v) => updateLayout({ homeScreenHeader1Visible: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="Tap to Donate Button"
          checked={theme.layout.homeScreenTapToDonateVisible}
          onChange={(v) => updateLayout({ homeScreenTapToDonateVisible: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="WhatsApp & Observances"
          checked={theme.layout.homeScreenWhatsAppButtonsVisible}
          onChange={(v) => updateLayout({ homeScreenWhatsAppButtonsVisible: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="Language Selector"
          checked={theme.layout.homeScreenLanguageSelectorVisible}
          onChange={(v) => updateLayout({ homeScreenLanguageSelectorVisible: v })}
          disabled={disabled}
        />
        <hr className="border-gray-200" />
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Spacing</p>
        <SliderInput
          label="Header Top Padding"
          value={theme.layout.homeScreenHeaderTopPadding}
          onChange={(v) => updateLayout({ homeScreenHeaderTopPadding: v })}
          min={20}
          max={120}
          unit="px"
          disabled={disabled}
        />
        <SliderInput
          label="Home Spacer Height"
          value={theme.layout.homeScreenSpacerMaxHeight}
          onChange={(v) => updateLayout({ homeScreenSpacerMaxHeight: v })}
          min={20}
          max={200}
          unit="px"
          disabled={disabled}
        />
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
