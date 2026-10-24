'use client'

import type { DeviceSummary } from '@/types/device'
import { KpiGrid, KpiStatCard, KpiStatSkeleton, type KpiStatCardProps } from '@/components/ui/KpiStatCard'

interface DeviceSummaryCardsProps {
  summary: DeviceSummary
  isLoading?: boolean
}

export default function DeviceSummaryCards({ summary, isLoading }: DeviceSummaryCardsProps) {
  if (isLoading) {
    return <KpiStatSkeleton count={4} />
  }

  const cards: KpiStatCardProps[] = [
    {
      label: 'Total Devices',
      value: summary.total.toLocaleString(),
      insight: 'Registered kiosks',
      iconPath:
        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Online',
      value: summary.online.toLocaleString(),
      insight: 'Heartbeat within 30 minutes',
      iconPath:
        'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Offline',
      value: summary.offline.toLocaleString(),
      insight: 'No recent heartbeat',
      iconPath:
        'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      gradient: 'from-slate-500 to-gray-600',
    },
    {
      label: 'Needs Attention',
      value: summary.needingAttention.toLocaleString(),
      insight: 'Warning, offline, or setup',
      iconPath:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      gradient: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <KpiGrid count={4}>
      {cards.map((card) => (
        <KpiStatCard key={card.label} {...card} />
      ))}
    </KpiGrid>
  )
}
