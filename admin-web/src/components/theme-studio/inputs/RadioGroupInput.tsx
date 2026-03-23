'use client'

interface RadioOption<T extends string> {
  value: T
  label: string
}

interface RadioGroupInputProps<T extends string> {
  label: string
  description?: string
  value: T
  options: RadioOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

export default function RadioGroupInput<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
  disabled,
}: RadioGroupInputProps<T>) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {description && (
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              value === opt.value
                ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
