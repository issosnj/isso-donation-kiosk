'use client'

import { useRouter } from 'next/navigation'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import type { DonorInsightSummary } from '@/types/templeOverview'

interface TempleDonorInsightsProps {
  insights: DonorInsightSummary
  isLoading?: boolean
  isError?: boolean
}

export default function TempleDonorInsights({
  insights,
  isLoading,
  isError,
}: TempleDonorInsightsProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={4} height="min-h-[220px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-6 text-sm text-gray-500 text-center">
        Unable to load donor insights.
      </div>
    )
  }

  const items = [
    { label: 'New donors this month', value: insights.newDonorsThisMonth.toLocaleString() },
    { label: 'Returning donors', value: insights.returningDonors.toLocaleString() },
    { label: 'Top donor category', value: insights.topDonorCategory },
    {
      label: 'Avg gifts per donor',
      value: insights.averageDonorFrequency.toFixed(1),
    },
  ]

  return (
    <div className="dashboard-card overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100/90 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Donor insights</h3>
          <p className="text-xs text-gray-500 mt-0.5">Engagement snapshot</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard?tab=donors')}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          Donors tab
        </button>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3 flex-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-violet-50/60 border border-violet-100/80 p-3"
          >
            <p className="text-[10px] font-semibold text-violet-700/80 uppercase tracking-wide">
              {item.label}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
