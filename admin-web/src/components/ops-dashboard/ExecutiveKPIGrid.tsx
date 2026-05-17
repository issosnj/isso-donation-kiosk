'use client'

import { useRouter } from 'next/navigation'
import AnimatedCounter from './AnimatedCounter'
import DataSparkline from './DataSparkline'
import LivePulse from './LivePulse'
import { WidgetSkeleton } from './WidgetShell'
import type { ExecutiveKpis } from '@/hooks/useOverviewData'
import {
  formatCount,
  formatCurrency,
  formatKpiValue,
  formatTrendPercentCompact,
  safeNumber,
} from '@/lib/formatters'

interface ExecutiveKPIGridProps {
  kpis: ExecutiveKpis
  sparklines: Record<string, number[]>
  trends: Record<string, number>
  kpiPending?: Partial<Record<keyof ExecutiveKpis, boolean>>
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
  kpiPending = {},
  isLoading,
  isError,
}: ExecutiveKPIGridProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="ops-kpi-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <WidgetSkeleton key={i} lines={3} height="min-h-[8.75rem]" className="!p-4" />
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
    <div className="ops-kpi-grid">
      {KPI_DEFS.map((def) => {
        const value = safeNumber(kpis[def.key])
        const trend = safeNumber(trends[def.key])
        const positive = def.invertTrend ? trend <= 0 : trend >= 0
        const spark = sparklines[def.key] ?? []
        const pending = kpiPending[def.key]

        return (
          <button
            key={def.key}
            type="button"
            onClick={() => router.push(`/dashboard?tab=${def.tab}`)}
            className="dashboard-card dashboard-card-hover ops-kpi-card p-4 pb-3.5 text-left group min-w-0"
          >
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide leading-snug">
                {def.label}
              </span>
              <LivePulse className="opacity-40 group-hover:opacity-100 transition-opacity scale-75 shrink-0 mt-0.5" />
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900 tracking-tight leading-tight tabular-nums">
              {pending ? (
                <span
                  className="inline-block h-6 w-14 animate-pulse rounded-md bg-gray-200/90"
                  aria-hidden
                />
              ) : def.animate ? (
                <AnimatedCounter value={value} format={def.format} />
              ) : (
                formatKpiValue(value, def.format)
              )}
            </p>
            <div className="mt-auto space-y-1.5 pt-2">
              <div className="flex items-end justify-between gap-2">
                <span
                  className={`shrink-0 text-[10px] font-semibold leading-tight tabular-nums ${
                    trend === 0
                      ? 'text-gray-400'
                      : positive
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                  }`}
                >
                  {formatTrendPercentCompact(trend)}
                </span>
                <DataSparkline data={spark} />
              </div>
              <p className="text-[10px] leading-tight text-gray-400">vs prior period</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
