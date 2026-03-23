'use client'

import type { PresetId, ThemePreset } from '@/types/theme'
import { THEME_PRESETS } from '@/lib/theme-utils'

interface ThemePresetPickerProps {
  selectedId: PresetId | 'custom'
  onSelect: (id: PresetId) => void
  disabled?: boolean
}

export default function ThemePresetPicker({ selectedId, onSelect, disabled }: ThemePresetPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Preset</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEME_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedId !== 'custom' && selectedId === preset.id}
            onSelect={() => !disabled && onSelect(preset.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

function PresetCard({
  preset,
  selected,
  onSelect,
  disabled,
}: {
  preset: ThemePreset
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all ${
        selected
          ? 'border-purple-500 bg-purple-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className="flex gap-1">
        {preset.previewColors.map((color, i) => (
          <div
            key={i}
            className="h-6 flex-1 rounded-md"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{preset.name}</p>
        <p className="text-xs text-gray-500 line-clamp-2">{preset.description}</p>
      </div>
    </button>
  )
}
