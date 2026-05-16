'use client'

import { useRouter } from 'next/navigation'
import MiniSparkline from '@/components/donors/MiniSparkline'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import { formatCurrency, formatCount, formatTrendPercent, safeNumber } from '@/lib/formatters'
import type { TempleOverviewMetrics } from '@/types/templeOverview'

interface TempleKPIGridProps {
  metrics: TempleOverviewMetrics
  isLoading?: boolean
  isError?: boolean
}

type KpiKey = keyof TempleOverviewMetrics['trends']

interface KpiDef {
  key: KpiKey
  label: string
  value: number
  format: (v: number) => string
  tab?: string
  invertTrend?: boolean
  money?: boolean
}

const ICONS: Record<KpiKey, string> = {
  raisedYtd:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  raisedThisMonth:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  raisedToday: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707',
  totalDonations:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  averageGift:
    'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  activeDonors:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  onlineDevices:
    'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  failedPendingPayments:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}

function buildDefs(metrics: TempleOverviewMetrics): KpiDef[] {
  return [
    {
      key: 'raisedYtd',
      label: 'Raised YTD',
      value: metrics.raisedYtd,
      format: (v) => formatCurrency(v, { compact: true }),
      tab: 'donations',
      money: true,
    },
    {
      key: 'raisedThisMonth',
      label: 'Raised This Month',
      value: metrics.raisedThisMonth,
      format: (v) => formatCurrency(v, { compact: true }),
      tab: 'donations',
      money: true,
    },
    {
      key: 'raisedToday',
      label: 'Raised Today',
      value: metrics.raisedToday,
      format: (v) => formatCurrency(v, { compact: true }),
      tab: 'donations',
      money: true,
    },
    {
      key: 'totalDonations',
      label: 'Total Donations',
      value: metrics.totalDonations,
      format: formatCount,
      tab: 'donations',
    },
    {
      key: 'averageGift',
      label: 'Average Gift',
      value: metrics.averageGift,
      format: (v) => formatCurrency(v),
      tab: 'donations',
      money: true,
    },
    {
      key: 'activeDonors',
      label: 'Active Donors',
      value: metrics.activeDonors,
      format: formatCount,
      tab: 'donors',
    },
    {
      key: 'onlineDevices',
      label: 'Online Devices',
      value: metrics.onlineDevices,
      format: formatCount,
      tab: 'devices',
    },
    {
      key: 'failedPendingPayments',
      label: 'Failed / Pending',
      value: metrics.failedPendingPayments,
      format: formatCount,
      tab: 'donations',
      invertTrend: true,
    },
  ]
}

export default function TempleKPIGrid({ metrics, isLoading, isError }: TempleKPIGridProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <WidgetSkeleton key={i} lines={2} height="h-[118px]" className="!p-4" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="dashboard-card p-6 text-sm text-gray-600 text-center">
        Unable to load overview metrics. Try refreshing.
      </div>
    )
  }

  const defs = buildDefs(metrics)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {defs.map((def) => {
        const trend = safeNumber(metrics.trends[def.key])
        const positive = def.invertTrend ? trend <= 0 : trend >= 0
        const spark = metrics.sparklines[def.key] ?? []

        const Card = def.tab ? 'button' : 'div'
        return (
          <Card
            key={def.key}
            type={def.tab ? 'button' : undefined}
            onClick={def.tab ? () => router.push(`/dashboard?tab=${def.tab}`) : undefined}
            className={`dashboard-card p-4 text-left min-w-0 ${
              def.tab ? 'dashboard-card-hover cursor-pointer' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  def.key === 'failedPendingPayments'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-violet-50 text-violet-600'
                }`}
              >
                <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[def.key]} />
                </svg>
              </div>
              <MiniSparkline
                className={def.key === 'failedPendingPayments' ? 'text-amber-400' : 'text-violet-400'}
              />
            </div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mt-3 line-clamp-1">
              {def.label}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums tracking-tight truncate">
              {def.format(def.value)}
            </p>
            <p
              className={`text-[10px] font-semibold mt-1.5 tabular-nums ${
                trend === 0 ? 'text-gray-400' : positive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatTrendPercent(trend)} vs prior period
            </p>
          </Card>
        )
      })}
    </div>
  )
}

