'use client'

export default function MiniSparkline({ className = 'text-purple-400' }: { className?: string }) {
  const heights = [40, 65, 45, 80, 55, 90, 70]
  return (
    <svg viewBox="0 0 56 24" className={`h-6 w-14 opacity-70 ${className}`} aria-hidden>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 8}
          y={24 - (h / 100) * 24}
          width={5}
          height={(h / 100) * 24}
          rx={1}
          className="fill-current"
        />
      ))}
    </svg>
  )
}
