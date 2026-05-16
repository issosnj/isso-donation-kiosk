'use client'

import type { DonorKpis } from '@/types/donor'
import { formatMoney } from './donorUtils'
import MiniSparkline from './MiniSparkline'

interface KpiCardProps {
  label: string
  value: string
  insight: string
  trend?: string
  trendUp?: boolean
  iconPath: string
  gradient: string
  sparkColor: string
}

function KpiCard({
  label,
  value,
  insight,
  trend,
  trendUp,
  iconPath,
  gradient,
  sparkColor,
}: KpiCardProps) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 sm:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>
        <MiniSparkline className={sparkColor} />
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-4">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trendUp === false
                ? 'bg-gray-100 text-gray-600'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {trendUp !== false && trend.startsWith('+') ? '↑ ' : ''}
            {trend}
          </span>
        )}
        <span className="text-xs text-gray-500">{insight}</span>
      </div>
    </div>
  )
}

interface DonorsKPICardsProps {
  kpis: DonorKpis
  isLoading?: boolean
}

export default function DonorsKPICards({ kpis, isLoading }: DonorsKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200/70 p-5 animate-pulse h-[140px]"
          >
            <div className="h-10 w-10 bg-gray-200 rounded-xl mb-4" />
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  const cards: KpiCardProps[] = [
    {
      label: 'Total donors',
      value: kpis.total.toLocaleString(),
      trend: kpis.newThisMonth > 0 ? `+${kpis.newThisMonth} this month` : undefined,
      trendUp: true,
      insight: `${kpis.activeCount} active (12 mo)`,
      iconPath:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      gradient: 'from-purple-500 to-violet-600',
      sparkColor: 'text-purple-400',
    },
    {
      label: 'Total donations',
      value: formatMoney(kpis.totalDonated, true),
      insight: 'Lifetime contributed',
      iconPath:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-emerald-500 to-teal-600',
      sparkColor: 'text-emerald-400',
    },
    {
      label: 'Repeat donors',
      value: kpis.repeatCount.toLocaleString(),
      insight:
        kpis.total > 0
          ? `${Math.round((kpis.repeatCount / kpis.total) * 100)}% of base`
          : 'Multi-gift supporters',
      iconPath:
        'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      gradient: 'from-amber-500 to-orange-500',
      sparkColor: 'text-amber-400',
    },
    {
      label: 'New this month',
      value: kpis.newThisMonth.toLocaleString(),
      trend: kpis.newThisMonth > 0 ? 'Growing' : undefined,
      trendUp: true,
      insight: 'First-time records',
      iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      gradient: 'from-sky-500 to-blue-600',
      sparkColor: 'text-sky-400',
    },
    {
      label: 'Recurring donors',
      value: kpis.recurringCount.toLocaleString(),
      insight: '2+ gifts on record',
      iconPath:
        'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      gradient: 'from-violet-500 to-purple-600',
      sparkColor: 'text-violet-400',
    },
    {
      label: 'Avg donation',
      value: formatMoney(kpis.averageDonation),
      insight: 'Per donor lifetime',
      iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      gradient: 'from-fuchsia-500 to-pink-600',
      sparkColor: 'text-fuchsia-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  )
}
