'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import SliderInput from '../inputs/SliderInput'
import ToggleInput from '../inputs/ToggleInput'
import ColorInput from '../inputs/ColorInput'
import { Squares2X2Icon } from '@heroicons/react/24/outline'

interface ButtonCardEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function ButtonCardEditor({ theme, onChange, disabled }: ButtonCardEditorProps) {
  const updateColors = (updates: Partial<KioskTheme['colors']>) => {
    onChange({ ...theme, colors: { ...theme.colors, ...updates } })
  }
  const updateLayout = (updates: Partial<KioskTheme['layout']>) => {
    onChange({ ...theme, layout: { ...theme.layout, ...updates } })
  }

  return (
    <ThemeSectionCard
      title="Buttons & Cards"
      description="Button styles, borders, and shadows"
      icon={<Squares2X2Icon className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <SliderInput
          label="Corner Radius"
          value={theme.layout.cornerRadius}
          onChange={(v) => updateLayout({ cornerRadius: v })}
          min={0}
          max={24}
          unit="px"
          disabled={disabled}
        />
        <SliderInput
          label="Amount Button Height"
          value={theme.layout.amountButtonHeight}
          onChange={(v) => updateLayout({ amountButtonHeight: v })}
          min={48}
          max={100}
          unit="px"
          disabled={disabled}
        />
        <SliderInput
          label="Button Spacing"
          value={theme.layout.buttonSpacing}
          onChange={(v) => updateLayout({ buttonSpacing: v })}
          min={4}
          max={24}
          unit="px"
          disabled={disabled}
        />
        <ToggleInput
          label="Tap to Donate Gradient"
          checked={theme.colors.tapToDonateButtonGradient}
          onChange={(v) => updateColors({ tapToDonateButtonGradient: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="Proceed to Payment Gradient"
          checked={theme.colors.proceedToPaymentButtonGradient}
          onChange={(v) => updateColors({ proceedToPaymentButtonGradient: v })}
          disabled={disabled}
        />
        <ToggleInput
          label="Return to Home Gradient"
          checked={theme.colors.returnToHomeButtonGradient}
          onChange={(v) => updateColors({ returnToHomeButtonGradient: v })}
          disabled={disabled}
        />
      </div>
    </ThemeSectionCard>
  )
}
