'use client'

import { useRouter } from 'next/navigation'
import AnimatedCounter from './AnimatedCounter'
import DataSparkline from './DataSparkline'
import LivePulse from './LivePulse'
import { WidgetSkeleton } from './WidgetShell'
import type { ExecutiveKpis } from '@/hooks/useOverviewData'
import { formatCount, formatCurrency, formatTrendPercent, safeNumber } from '@/lib/formatters'

interface ExecutiveKPIGridProps {
  kpis: ExecutiveKpis
  sparklines: Record<string, number[]>
  trends: Record<string, number>
  isLoading?: boolean
  isError?: boolean
}

type KpiDef = {
  key: keyof ExecutiveKpis
  label: string
  format: (v: number) => string
  tab: string
  invertTrend?: boolean
  animate?: boolean
}

const KPI_DEFS: KpiDef[] = [
  {
    key: 'totalDonations',
    label: 'Total Donations',
    format: (v) => formatCurrency(v, { compact: true }),
    tab: 'donations',
    animate: true,
  },
  {
    key: 'donationsToday',
    label: 'Donations Today',
    format: formatCount,
    tab: 'donations',
    animate: true,
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Revenue',
    format: (v) => formatCurrency(v, { compact: true }),
    tab: 'donations',
    animate: true,
  },
  { key: 'activeTemples', label: 'Active Temples', format: formatCount, tab: 'temples' },
  { key: 'onlineKiosks', label: 'Online Kiosks', format: formatCount, tab: 'devices' },
  {
    key: 'failedTransactions',
    label: 'Failed Transactions',
    format: formatCount,
    tab: 'donations',
    invertTrend: true,
  },
  { key: 'avgDonation', label: 'Avg Donation', format: (v) => formatCurrency(v), tab: 'donations' },
  { key: 'activeDonors', label: 'Active Donors', format: formatCount, tab: 'donors' },
]

export default function ExecutiveKPIGrid({
  kpis,
  sparklines,
  trends,
  isLoading,
  isError,
}: ExecutiveKPIGridProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <WidgetSkeleton key={i} lines={2} height="h-[108px]" className="!p-4" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="dashboard-card p-6 text-sm text-gray-600">
        Unable to load executive metrics. Check API configuration.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {KPI_DEFS.map((def) => {
        const value = safeNumber(kpis[def.key])
        const trend = safeNumber(trends[def.key])
        const positive = def.invertTrend ? trend <= 0 : trend >= 0
        const spark = sparklines[def.key] ?? []

        return (
          <button
            key={def.key}
            type="button"
            onClick={() => router.push(`/dashboard?tab=${def.tab}`)}
            className="dashboard-card dashboard-card-hover p-4 text-left group min-w-0"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide leading-tight line-clamp-2">
                {def.label}
              </span>
              <LivePulse className="opacity-40 group-hover:opacity-100 transition-opacity scale-75 shrink-0" />
            </div>
            <p className="text-lg font-bold text-gray-900 tracking-tight leading-none truncate">
              {def.animate ? (
                <AnimatedCounter value={value} format={def.format} />
              ) : (
                def.format(value)
              )}
            </p>
            <div className="flex items-end justify-between mt-2 gap-1">
              <span
                className={`text-[10px] font-semibold tabular-nums ${
                  trend === 0
                    ? 'text-gray-400'
                    : positive
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                }`}
              >
                {formatTrendPercent(trend)}
              </span>
              <DataSparkline data={spark} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">vs prior period</p>
          </button>
        )
      })}
    </div>
  )
}
