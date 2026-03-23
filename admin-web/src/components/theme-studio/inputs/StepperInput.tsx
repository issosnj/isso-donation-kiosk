'use client'

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

interface StepperInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
}

export default function StepperInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = '',
  disabled,
}: StepperInputProps) {
  const handleDecrement = () => onChange(Math.max(min, value - step))
  const handleIncrement = () => onChange(Math.min(max, value + step))
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center font-mono text-sm font-medium text-gray-900">
          {value}
          {unit}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
