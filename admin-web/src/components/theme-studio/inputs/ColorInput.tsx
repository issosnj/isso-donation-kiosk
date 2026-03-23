'use client'

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  compact?: boolean
}

export default function ColorInput({ label, value, onChange, disabled, compact }: ColorInputProps) {
  const normalized = value.startsWith('#') ? value : `#${value}`
  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-1'}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            onChange(v.startsWith('#') ? v : v ? `#${v}` : '#')
          }}
          disabled={disabled}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:opacity-60"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}
