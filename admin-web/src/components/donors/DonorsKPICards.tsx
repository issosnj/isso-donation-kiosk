'use client'

import type { DonorKpis } from '@/types/donor'
import { KpiGrid, KpiStatCard, KpiStatSkeleton, type KpiStatCardProps } from '@/components/ui/KpiStatCard'
import { formatMoneyPrecise } from './donorUtils'

interface DonorsKPICardsProps {
  kpis: DonorKpis
  isLoading?: boolean
  isError?: boolean
}

export default function DonorsKPICards({ kpis, isLoading, isError }: DonorsKPICardsProps) {
  if (isLoading) {
    return <KpiStatSkeleton count={6} />
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        Donation totals could not be loaded. Dollar amounts are hidden so this page does not show $0 in their place.
      </div>
    )
  }

  const cards: KpiStatCardProps[] = [
    {
      label: 'Total donors',
      value: kpis.total.toLocaleString(),
      trend: kpis.newThisMonth > 0 ? `+${kpis.newThisMonth} this month` : undefined,
      trendUp: true,
      insight: `${kpis.activeCount} active (12 mo)`,
      iconPath:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Total donated',
      value: formatMoneyPrecise(kpis.totalDonated),
      insight: 'Succeeded gifts linked to donors',
      iconPath:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Total gifts',
      value: kpis.totalGifts.toLocaleString(),
      insight: 'Refunds excluded',
      iconPath:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Repeat donors',
      value: kpis.repeatCount.toLocaleString(),
      insight:
        kpis.total > 0
          ? `${Math.round((kpis.repeatCount / kpis.total) * 100)}% of base`
          : 'More than one succeeded gift',
      iconPath:
        'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: 'New this month',
      value: kpis.newThisMonth.toLocaleString(),
      insight: 'Donor records created',
      iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      gradient: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Avg gift',
      value: formatMoneyPrecise(kpis.averageDonation),
      insight: 'Total donated ÷ succeeded gifts',
      iconPath:
        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      gradient: 'from-orange-500 to-pink-600',
    },
  ]

  return (
    <KpiGrid count={6}>
      {cards.map((card) => (
        <KpiStatCard key={card.label} {...card} />
      ))}
    </KpiGrid>
  )
}
