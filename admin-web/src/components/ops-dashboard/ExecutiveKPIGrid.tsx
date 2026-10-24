'use client'

import { useRouter } from 'next/navigation'
import { KpiGrid, KpiStatCard, KpiStatSkeleton } from '@/components/ui/KpiStatCard'
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
  insight: string
  iconPath: string
  gradient: string
}

const KPI_DEFS: KpiDef[] = [
  {
    key: 'totalDonations',
    label: 'Total Donations',
    format: (v) => formatCurrency(v, { compact: true }),
    tab: 'donations',
    insight: 'Succeeded gifts',
    iconPath:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    key: 'donationsToday',
    label: 'Donations Today',
    format: formatCount,
    tab: 'donations',
    insight: 'Gift count today',
    iconPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Revenue',
    format: (v) => formatCurrency(v, { compact: true }),
    tab: 'donations',
    insight: 'This calendar month',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'activeTemples',
    label: 'Active Temples',
    format: formatCount,
    tab: 'temples',
    insight: 'Temples on the platform',
    iconPath:
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    key: 'onlineKiosks',
    label: 'Online Kiosks',
    format: formatCount,
    tab: 'devices',
    insight: 'Heartbeat within 30 minutes',
    iconPath:
      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    gradient: 'from-teal-500 to-emerald-600',
  },
  {
    key: 'failedTransactions',
    label: 'Failed Transactions',
    format: formatCount,
    tab: 'donations',
    invertTrend: true,
    insight: 'Needs review',
    iconPath:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    key: 'avgDonation',
    label: 'Avg Donation',
    format: (v) => formatCurrency(v),
    tab: 'donations',
    insight: 'Average succeeded gift',
    iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    gradient: 'from-orange-500 to-pink-600',
  },
  {
    key: 'activeDonors',
    label: 'Active Donors',
    format: formatCount,
    tab: 'donors',
    insight: 'Gave in the last 12 months',
    iconPath:
      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    gradient: 'from-indigo-500 to-orange-600',
  },
]

export default function ExecutiveKPIGrid({
  kpis,
  sparklines: _sparklines,
  trends,
  kpiPending = {},
  isLoading,
  isError,
}: ExecutiveKPIGridProps) {
  const router = useRouter()
  void _sparklines

  if (isLoading) {
    return <KpiStatSkeleton count={8} />
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Unable to load executive metrics. Check API configuration.
      </div>
    )
  }

  return (
    <KpiGrid count={8}>
      {KPI_DEFS.map((def) => {
        const value = safeNumber(kpis[def.key])
        const trend = safeNumber(trends[def.key])
        const positive = def.invertTrend ? trend <= 0 : trend >= 0
        const pending = kpiPending[def.key]

        return (
          <KpiStatCard
            key={def.key}
            label={def.label}
            value={
              pending ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded-md bg-gray-200" aria-hidden />
              ) : (
                formatKpiValue(value, def.format)
              )
            }
            iconPath={def.iconPath}
            gradient={def.gradient}
            trend={formatTrendPercentCompact(trend)}
            trendUp={positive}
            insight={def.insight}
            onClick={() => router.push(`/dashboard?tab=${def.tab}`)}
          />
        )
      })}
    </KpiGrid>
  )
}
