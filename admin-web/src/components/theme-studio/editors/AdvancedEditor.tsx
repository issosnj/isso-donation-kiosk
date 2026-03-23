'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import SliderInput from '../inputs/SliderInput'
import ColorInput from '../inputs/ColorInput'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

interface AdvancedEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function AdvancedEditor({ theme, onChange, disabled }: AdvancedEditorProps) {
  const updateLayout = (updates: Partial<KioskTheme['layout']>) => {
    onChange({ ...theme, layout: { ...theme.layout, ...updates } })
  }
  const updateColors = (updates: Partial<KioskTheme['colors']>) => {
    onChange({ ...theme, colors: { ...theme.colors, ...updates } })
  }

  return (
    <ThemeSectionCard
      title="Advanced"
      description="Fine-grained layout and keypad overrides"
      icon={<Cog6ToothIcon className="h-5 w-5" />}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Donation Details
        </p>
        <SliderInput
          label="Details Amount Font Size"
          value={theme.layout.detailsAmountFontSize}
          onChange={(v) => updateLayout({ detailsAmountFontSize: v })}
          min={32}
          max={80}
          unit="px"
          disabled={disabled}
        />
        <ColorInput
          label="Details Amount Color"
          value={theme.layout.detailsAmountColor}
          onChange={(v) => updateLayout({ detailsAmountColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Details Input Border"
          value={theme.layout.detailsInputBorderColor}
          onChange={(v) => updateLayout({ detailsInputBorderColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Details Button"
          value={theme.layout.detailsButtonColor}
          onChange={(v) => updateLayout({ detailsButtonColor: v })}
          disabled={disabled}
        />
        <hr className="border-gray-200" />
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Custom Amount Keypad
        </p>
        <ColorInput
          label="Keypad Background"
          value={theme.layout.customAmountKeypadBackgroundColor}
          onChange={(v) => updateLayout({ customAmountKeypadBackgroundColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Keypad Border"
          value={theme.layout.customAmountKeypadBorderColor}
          onChange={(v) => updateLayout({ customAmountKeypadBorderColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Keypad Button"
          value={theme.layout.customAmountKeypadButtonColor}
          onChange={(v) => updateLayout({ customAmountKeypadButtonColor: v })}
          disabled={disabled}
        />
        <SliderInput
          label="Keypad Button Height"
          value={theme.layout.customAmountKeypadButtonHeight}
          onChange={(v) => updateLayout({ customAmountKeypadButtonHeight: v })}
          min={48}
          max={90}
          unit="px"
          disabled={disabled}
        />
      </div>
    </ThemeSectionCard>
  )
}
