'use client'

import { KpiGrid, KpiStatCard, KpiStatSkeleton } from '@/components/ui/KpiStatCard'

interface OverviewStatCardsProps {
  totalYtd: number
  countYtd: number
  avgGift: number
  isLoading?: boolean
  isError?: boolean
}

export default function OverviewStatCards({
  totalYtd,
  countYtd,
  avgGift,
  isLoading,
  isError,
}: OverviewStatCardsProps) {
  if (isLoading) {
    return <KpiStatSkeleton count={3} />
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Unable to load overview metrics.
      </div>
    )
  }

  return (
    <KpiGrid count={3}>
      <KpiStatCard
        label="Total raised"
        value={`$${totalYtd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        insight="Year to date"
        iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        gradient="from-orange-500 to-orange-600"
      />
      <KpiStatCard
        label="Donations"
        value={countYtd.toLocaleString()}
        insight="Year to date"
        iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        gradient="from-sky-500 to-blue-600"
      />
      <KpiStatCard
        label="Average gift"
        value={`$${avgGift.toFixed(2)}`}
        insight="Year to date"
        iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        gradient="from-emerald-500 to-teal-600"
      />
    </KpiGrid>
  )
}
