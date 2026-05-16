'use client'

import { safeNumber, sanitizeSparkline } from '@/lib/formatters'

interface DataSparklineProps {
  data: number[]
  className?: string
  strokeClass?: string
}

export default function DataSparkline({
  data,
  className = '',
  strokeClass = 'stroke-[#9333EA]',
}: DataSparklineProps) {
  const values = sanitizeSparkline(data)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 64
  const h = 24
  const step = values.length > 1 ? w / (values.length - 1) : 0

  const points =
    values.length === 1
      ? `0,${h / 2} ${w},${h / 2}`
      : values
          .map((v, i) => {
            const x = i * step
            const y = h - ((safeNumber(v) - min) / range) * (h - 2) - 1
            return `${x},${y}`
          })
          .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-6 w-16 shrink-0 ${className}`} aria-hidden>
      <polyline
        fill="none"
        className={strokeClass}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
