'use client'

import PageHeader, {
  headerPrimaryButtonClass,
  headerSecondaryButtonClass,
} from '@/components/layout/PageHeader'
import type { TempleOverviewStatusChips } from '@/types/templeOverview'

interface TempleOverviewHeaderProps {
  eyebrow?: string
  title: string
  subtitle: string
  statusChips: TempleOverviewStatusChips
  onRefresh: () => void
  onExport: () => void
  onViewDonations: () => void
  isRefreshing?: boolean
}

export default function TempleOverviewHeader({
  eyebrow,
  title,
  subtitle,
  statusChips,
  onRefresh,
  onExport,
  onViewDonations,
  isRefreshing,
}: TempleOverviewHeaderProps) {
  const stripeChipClass =
    statusChips.stripeStatus === 'connected'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
      : 'bg-amber-50 text-amber-800 border-amber-200/80'

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={subtitle}
        actions={
          <>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={headerSecondaryButtonClass}
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button type="button" onClick={onExport} className={headerSecondaryButtonClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Summary
            </button>
            <button type="button" onClick={onViewDonations} className={headerPrimaryButtonClass}>
              View Donations
            </button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${stripeChipClass}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${statusChips.stripeStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          {statusChips.stripeLabel}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200/80 rounded-full">
          {statusChips.kiosksOnlineLabel}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200/60 rounded-full tabular-nums">
          {statusChips.lastSyncedLabel}
        </span>
      </div>
    </div>
  )
}
