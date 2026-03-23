'use client'

interface ToggleInputProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export default function ToggleInput({
  label,
  description,
  checked,
  onChange,
  disabled,
}: ToggleInputProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-purple-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
