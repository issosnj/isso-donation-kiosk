'use client'

import { useEffect, useState } from 'react'
import { safeNumber } from '@/lib/formatters'

interface AnimatedCounterProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  format = (n) => safeNumber(n).toLocaleString(),
  duration = 600,
  className = '',
}: AnimatedCounterProps) {
  const target = safeNumber(value)
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    const start = display
    const diff = target - start
    if (Math.abs(diff) < 0.001) return

    const startTime = performance.now()
    let frame: number

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(start + diff * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return <span className={`tabular-nums ${className}`}>{format(display)}</span>
}
