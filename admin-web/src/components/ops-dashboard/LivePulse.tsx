'use client'

export default function LivePulse({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`} aria-label="Live">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}
