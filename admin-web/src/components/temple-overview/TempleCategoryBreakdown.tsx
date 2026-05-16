'use client'

import { useRouter } from 'next/navigation'
import { WidgetEmptyState, WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import { formatCurrency } from '@/lib/formatters'
import type { CategoryBreakdownRow } from '@/types/templeOverview'

interface TempleCategoryBreakdownProps {
  rows: CategoryBreakdownRow[]
  isLoading?: boolean
  isError?: boolean
}

export default function TempleCategoryBreakdown({
  rows,
  isLoading,
  isError,
}: TempleCategoryBreakdownProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={5} height="min-h-[280px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-8 text-center text-sm text-gray-500">
        Unable to load category breakdown.
      </div>
    )
  }

  return (
    <div className="dashboard-card overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100/90 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Category breakdown</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last 30 days · succeeded gifts</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard?tab=categories')}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 shrink-0"
        >
          Categories
        </button>
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {rows.length === 0 ? (
          <WidgetEmptyState
            title="No category data yet"
            description="Donations will be grouped by category as they come in."
            icon="inbox"
          />
        ) : (
          rows.map((row) => (
            <div key={row.categoryId}>
              <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                <span className="font-medium text-gray-900 truncate">{row.categoryName}</span>
                <span className="font-semibold text-gray-900 tabular-nums shrink-0">
                  {formatCurrency(row.amountRaised)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{row.donationCount} gifts</span>
                <span>{row.percentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, row.percentage)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
