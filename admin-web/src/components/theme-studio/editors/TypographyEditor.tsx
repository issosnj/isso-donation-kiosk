'use client'

import type { KioskTheme } from '@/types/theme'
import ThemeSectionCard from '../ThemeSectionCard'
import SliderInput from '../inputs/SliderInput'
import { LanguageIcon } from '@heroicons/react/24/outline'

const FONT_OPTIONS = [
  { value: 'Inter-SemiBold', label: 'Inter SemiBold' },
  { value: 'Inter-Medium', label: 'Inter Medium' },
  { value: 'Inter-Regular', label: 'Inter Regular' },
  { value: 'Roboto-Regular', label: 'Roboto' },
  { value: 'Roboto-Medium', label: 'Roboto Medium' },
  { value: 'OpenSans-SemiBold', label: 'Open Sans SemiBold' },
  { value: 'OpenSans-Regular', label: 'Open Sans' },
]

interface TypographyEditorProps {
  theme: KioskTheme
  onChange: (theme: KioskTheme) => void
  disabled?: boolean
}

export default function TypographyEditor({ theme, onChange, disabled }: TypographyEditorProps) {
  const updateFonts = (updates: Partial<KioskTheme['fonts']>) => {
    onChange({
      ...theme,
      fonts: { ...theme.fonts, ...updates },
    })
  }

  return (
    <ThemeSectionCard
      title="Typography"
      description="Fonts and sizes"
      icon={<LanguageIcon className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Heading Font</label>
          <select
            value={theme.fonts.headingFamily}
            onChange={(e) => updateFonts({ headingFamily: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <SliderInput
          label="Heading Size"
          value={theme.fonts.headingSize}
          onChange={(v) => updateFonts({ headingSize: v })}
          min={20}
          max={48}
          unit="px"
          disabled={disabled}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Body Font</label>
          <select
            value={theme.fonts.bodyFamily}
            onChange={(e) => updateFonts({ bodyFamily: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <SliderInput
          label="Body Size"
          value={theme.fonts.bodySize}
          onChange={(v) => updateFonts({ bodySize: v })}
          min={12}
          max={24}
          unit="px"
          disabled={disabled}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Button Font</label>
          <select
            value={theme.fonts.buttonFamily}
            onChange={(e) => updateFonts({ buttonFamily: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <SliderInput
          label="Button Size"
          value={theme.fonts.buttonSize}
          onChange={(v) => updateFonts({ buttonSize: v })}
          min={14}
          max={28}
          unit="px"
          disabled={disabled}
        />
      </div>
    </ThemeSectionCard>
  )
}
