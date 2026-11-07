'use client'

import type { ReactNode } from 'react'

export interface KpiStatCardProps {
  label: string
  value: ReactNode
  insight?: string
  trend?: string
  trendUp?: boolean
  iconPath: string
  gradient: string
  onClick?: () => void
}

export function KpiGrid({ count, children }: { count?: number; children: ReactNode }) {
  // Six cards would otherwise wrap as five plus one. Fit them on one row and let each card shrink.
  const columns =
    count === 6
      ? '[grid-template-columns:repeat(2,minmax(0,14rem))] sm:[grid-template-columns:repeat(3,minmax(0,14rem))] xl:[grid-template-columns:repeat(6,minmax(0,14rem))]'
      : '[grid-template-columns:repeat(auto-fit,minmax(11rem,14rem))]'

  return (
    <div className="min-w-0">
      <div className={`grid min-w-0 items-stretch gap-3 ${columns}`}>{children}</div>
    </div>
  )
}

export function KpiStatCard({
  label,
  value,
  insight,
  trend,
  trendUp,
  iconPath,
  gradient,
  onClick,
}: KpiStatCardProps) {
  const className =
    'group flex h-full w-full min-w-0 flex-col gap-1.5 rounded-xl border border-gray-200/70 bg-white px-3 py-3 text-left shadow-sm transition-shadow hover:shadow-md'

  const body = (
    <>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br shadow-sm ${gradient}`}
      >
        <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <p className="truncate text-[11px] font-medium leading-4 text-gray-500">{label}</p>
      <p className="text-lg font-bold leading-none tabular-nums tracking-tight text-gray-900">{value}</p>
      {(trend || insight) && (
        <div className="flex items-center gap-1.5">
          {trend ? (
            <span
              className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[10px] font-semibold leading-4 ${
                trendUp === false ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {trendUp !== false && trend.startsWith('+') ? '↑ ' : ''}
              {trend}
            </span>
          ) : null}
          {insight ? <span className="truncate text-[10px] leading-4 text-gray-500">{insight}</span> : null}
        </div>
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} cursor-pointer`}>
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}

export function KpiStatSkeleton({ count }: { count: number }) {
  return (
    <KpiGrid count={count}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[7.25rem] animate-pulse rounded-xl border border-gray-200/70 bg-white px-3 py-3"
        >
          <div className="mb-2 h-7 w-7 rounded-lg bg-gray-200" />
          <div className="mb-2 h-3 w-16 rounded bg-gray-200" />
          <div className="h-5 w-14 rounded bg-gray-200" />
        </div>
      ))}
    </KpiGrid>
  )
}
