'use client'

import { useRouter } from 'next/navigation'
import { WidgetEmptyState, WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import { formatCurrency } from '@/lib/formatters'
import type { RecentDonationActivity } from '@/types/templeOverview'

interface TempleRecentActivityProps {
  items: RecentDonationActivity[]
  isLoading?: boolean
  isError?: boolean
}

function statusClass(status: string): string {
  if (status === 'SUCCEEDED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'FAILED') return 'bg-red-50 text-red-700'
  if (status === 'PENDING') return 'bg-amber-50 text-amber-800'
  return 'bg-gray-100 text-gray-600'
}

function receiptClass(status: RecentDonationActivity['receiptStatus']): string {
  if (status === 'sent') return 'text-emerald-600'
  if (status === 'pending') return 'text-amber-600'
  return 'text-gray-400'
}

export default function TempleRecentActivity({
  items,
  isLoading,
  isError,
}: TempleRecentActivityProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={6} height="min-h-[360px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-8 text-center text-sm text-gray-500">
        Unable to load recent activity.
      </div>
    )
  }

  return (
    <div className="dashboard-card flex flex-col min-h-[360px] overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100/90 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Recent donation activity</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
        {items.length === 0 ? (
          <WidgetEmptyState
            title="No recent donations"
            description="New gifts will appear here as they are processed."
            icon="inbox"
          />
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-5 py-3.5 hover:bg-violet-50/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.donorLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.categoryName}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase ${statusClass(item.paymentStatus)}`}
                >
                  {item.paymentStatus}
                </span>
                <span className={`text-[10px] font-medium ${receiptClass(item.receiptStatus)}`}>
                  Receipt {item.receiptStatus}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{item.timeAgo}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-100/90 shrink-0">
        <button
          type="button"
          onClick={() => router.push('/dashboard?tab=donations')}
          className="w-full text-center text-xs font-semibold text-violet-600 hover:text-violet-700 py-2 rounded-lg hover:bg-violet-50 transition-colors"
        >
          View all donations
        </button>
      </div>
    </div>
  )
}
