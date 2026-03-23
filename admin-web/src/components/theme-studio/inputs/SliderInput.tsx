'use client'

interface SliderInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
}

export default function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  disabled,
}: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-mono text-gray-500">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  )
}
