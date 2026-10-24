'use client'

import { useRouter } from 'next/navigation'
import { KpiGrid, KpiStatCard, KpiStatSkeleton } from '@/components/ui/KpiStatCard'
import { formatCount, formatCurrencyExact, formatTrendPercent } from '@/lib/formatters'
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
  iconPath: string
  gradient: string
}

const CAPTIONS: Record<KpiKey, string> = {
  raisedYtd: 'vs same dates last year',
  raisedThisMonth: 'vs last month',
  raisedToday: 'vs yesterday',
  totalDonations: 'vs same dates last year',
  averageGift: 'vs same dates last year',
  activeDonors: 'Gave in the last 12 months',
  onlineDevices: 'Heartbeat within 30 minutes',
  failedPendingPayments: 'Last 30 days',
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

const GRADIENTS: Record<KpiKey, string> = {
  raisedYtd: 'from-orange-500 to-orange-600',
  raisedThisMonth: 'from-emerald-500 to-teal-600',
  raisedToday: 'from-sky-500 to-blue-600',
  totalDonations: 'from-orange-500 to-orange-600',
  averageGift: 'from-orange-500 to-pink-600',
  activeDonors: 'from-indigo-500 to-orange-600',
  onlineDevices: 'from-teal-500 to-emerald-600',
  failedPendingPayments: 'from-amber-500 to-orange-500',
}

function buildDefs(metrics: TempleOverviewMetrics): KpiDef[] {
  return [
    {
      key: 'raisedYtd',
      label: 'Raised YTD',
      value: metrics.raisedYtd,
      format: formatCurrencyExact,
      tab: 'donations',
      iconPath: ICONS.raisedYtd,
      gradient: GRADIENTS.raisedYtd,
    },
    {
      key: 'raisedThisMonth',
      label: 'Raised This Month',
      value: metrics.raisedThisMonth,
      format: formatCurrencyExact,
      tab: 'donations',
      iconPath: ICONS.raisedThisMonth,
      gradient: GRADIENTS.raisedThisMonth,
    },
    {
      key: 'raisedToday',
      label: 'Raised Today',
      value: metrics.raisedToday,
      format: formatCurrencyExact,
      tab: 'donations',
      iconPath: ICONS.raisedToday,
      gradient: GRADIENTS.raisedToday,
    },
    {
      key: 'totalDonations',
      label: 'Donations YTD',
      value: metrics.totalDonations,
      format: formatCount,
      tab: 'donations',
      iconPath: ICONS.totalDonations,
      gradient: GRADIENTS.totalDonations,
    },
    {
      key: 'averageGift',
      label: 'Avg Gift YTD',
      value: metrics.averageGift,
      format: formatCurrencyExact,
      tab: 'donations',
      iconPath: ICONS.averageGift,
      gradient: GRADIENTS.averageGift,
    },
    {
      key: 'activeDonors',
      label: 'Active Donors',
      value: metrics.activeDonors,
      format: formatCount,
      tab: 'donors',
      iconPath: ICONS.activeDonors,
      gradient: GRADIENTS.activeDonors,
    },
    {
      key: 'onlineDevices',
      label: 'Online Devices',
      value: metrics.onlineDevices,
      format: formatCount,
      tab: 'devices',
      iconPath: ICONS.onlineDevices,
      gradient: GRADIENTS.onlineDevices,
    },
    {
      key: 'failedPendingPayments',
      label: 'Failed & Pending',
      value: metrics.failedPendingPayments,
      format: formatCount,
      tab: 'donations',
      invertTrend: true,
      iconPath: ICONS.failedPendingPayments,
      gradient: GRADIENTS.failedPendingPayments,
    },
  ]
}

export default function TempleKPIGrid({ metrics, isLoading, isError }: TempleKPIGridProps) {
  const router = useRouter()

  if (isLoading) {
    return <KpiStatSkeleton count={8} />
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 text-center">
        Unable to load overview metrics. Try refreshing.
      </div>
    )
  }

  const defs = buildDefs(metrics)

  return (
    <KpiGrid count={8}>
      {defs.map((def) => {
        const trend = metrics.trends[def.key]
        const positive = trend != null && (def.invertTrend ? trend <= 0 : trend >= 0)
        return (
          <KpiStatCard
            key={def.key}
            label={def.label}
            value={def.format(def.value)}
            iconPath={def.iconPath}
            gradient={def.gradient}
            trend={trend == null ? undefined : formatTrendPercent(trend)}
            trendUp={trend == null ? undefined : positive}
            insight={CAPTIONS[def.key]}
            onClick={def.tab ? () => router.push(`/dashboard?tab=${def.tab}`) : undefined}
          />
        )
      })}
    </KpiGrid>
  )
}

