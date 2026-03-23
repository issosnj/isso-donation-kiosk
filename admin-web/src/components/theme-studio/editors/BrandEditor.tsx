'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import ColorInput from '../inputs/ColorInput'
import { SwatchIcon } from '@heroicons/react/24/outline'

interface BrandEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function BrandEditor({ theme, onChange, disabled }: BrandEditorProps) {
  const updateColors = (updates: Partial<KioskTheme['colors']>) => {
    onChange({
      ...theme,
      colors: { ...theme.colors, ...updates },
    })
  }

  return (
    <ThemeSectionCard
      title="Brand"
      description="Logo, colors, and visual identity"
      icon={<SwatchIcon className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <ColorInput
          label="Heading / Text"
          value={theme.colors.headingColor}
          onChange={(v) => updateColors({ headingColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Primary CTA (Tap to Donate)"
          value={theme.colors.tapToDonateButtonColor}
          onChange={(v) => updateColors({ tapToDonateButtonColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Amount & Category Selected"
          value={theme.colors.amountSelectedColor}
          onChange={(v) => updateColors({ amountSelectedColor: v, categorySelectedColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Amount & Category Unselected"
          value={theme.colors.amountUnselectedColor}
          onChange={(v) => updateColors({ amountUnselectedColor: v, categoryUnselectedColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Proceed to Payment"
          value={theme.colors.proceedToPaymentButtonColor}
          onChange={(v) => updateColors({ proceedToPaymentButtonColor: v })}
          disabled={disabled}
        />
        <ColorInput
          label="Return to Home"
          value={theme.colors.returnToHomeButtonColor}
          onChange={(v) => updateColors({ returnToHomeButtonColor: v })}
          disabled={disabled}
        />
      </div>
    </ThemeSectionCard>
  )
}
