'use client'

interface ThemeModeToggleProps {
  mode: 'basic' | 'advanced'
  onChange: (mode: 'basic' | 'advanced') => void
  className?: string
}

export default function ThemeModeToggle({ mode, onChange, className = '' }: ThemeModeToggleProps) {
  return (
    <div
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 ${className}`}
      role="group"
      aria-label="Editing mode"
    >
      <button
        type="button"
        onClick={() => onChange('basic')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === 'basic'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Basic
      </button>
      <button
        type="button"
        onClick={() => onChange('advanced')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === 'advanced'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Advanced
      </button>
    </div>
  )
}
