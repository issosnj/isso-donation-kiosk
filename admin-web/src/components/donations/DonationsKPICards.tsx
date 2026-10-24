'use client'

import type { DonationsKpis } from '@/types/donation'
import { KpiGrid, KpiStatCard, KpiStatSkeleton, type KpiStatCardProps } from '@/components/ui/KpiStatCard'
import { formatMoney } from './donationUtils'

interface DonationsKPICardsProps {
  kpis: DonationsKpis
  isLoading?: boolean
}

export default function DonationsKPICards({ kpis, isLoading }: DonationsKPICardsProps) {
  if (isLoading) {
    return <KpiStatSkeleton count={5} />
  }

  const cards: KpiStatCardProps[] = [
    {
      label: 'Total gross',
      value: formatMoney(kpis.totalGross),
      insight: 'Completed donations',
      iconPath:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Net donations',
      value: formatMoney(kpis.totalNet),
      insight: 'After processing fees',
      iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Stripe fees',
      value: formatMoney(kpis.totalFees),
      insight: 'Processing costs',
      iconPath:
        'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      gradient: 'from-slate-500 to-gray-600',
    },
    {
      label: 'Completed',
      value: kpis.completedCount.toLocaleString(),
      insight: 'Successful payments',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Pending / failed',
      value: (kpis.pendingCount + kpis.failedCancelledCount).toLocaleString(),
      insight: `${kpis.pendingCount} pending · ${kpis.failedCancelledCount} failed/cancelled`,
      iconPath:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      gradient: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <KpiGrid count={5}>
      {cards.map((card) => (
        <KpiStatCard key={card.label} {...card} />
      ))}
    </KpiGrid>
  )
}
