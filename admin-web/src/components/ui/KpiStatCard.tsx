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

/** One row when the page is wide enough; otherwise a second row. */
function kpiColumns(count: number): string {
  const base = 'grid gap-3 min-w-0'
  switch (count) {
    case 3:
      return `${base} grid-cols-1 @md/kpi:grid-cols-3`
    case 4:
      return `${base} grid-cols-2 @2xl/kpi:grid-cols-4`
    case 5:
      return `${base} grid-cols-2 @lg/kpi:grid-cols-3 @4xl/kpi:grid-cols-5`
    case 6:
      return `${base} grid-cols-2 @xl/kpi:grid-cols-3 @5xl/kpi:grid-cols-6`
    case 8:
      return `${base} grid-cols-2 @3xl/kpi:grid-cols-4 @7xl/kpi:grid-cols-8`
    default:
      return `${base} grid-cols-2 @3xl/kpi:grid-cols-4`
  }
}

export function KpiGrid({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="@container/kpi min-w-0">
      <div className={kpiColumns(count)}>{children}</div>
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
    'group w-full min-w-0 bg-white rounded-2xl border border-gray-200/70 shadow-sm px-3.5 py-3.5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'

  const body = (
    <>
      <div
        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-3 leading-tight">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums tracking-tight leading-tight break-words">{value}</p>
      {(trend || insight) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {trend ? (
            <span
              className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                trendUp === false ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {trendUp !== false && trend.startsWith('+') ? '↑ ' : ''}
              {trend}
            </span>
          ) : null}
          {insight ? <span className="text-[11px] text-gray-500 leading-snug line-clamp-2">{insight}</span> : null}
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
          className="bg-white rounded-2xl border border-gray-200/70 px-3.5 py-3.5 animate-pulse h-[124px]"
        >
          <div className="h-9 w-9 bg-gray-200 rounded-xl mb-3" />
          <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </KpiGrid>
  )
}
