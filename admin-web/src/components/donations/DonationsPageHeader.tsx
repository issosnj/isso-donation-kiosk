'use client'

interface DonationsPageHeaderProps {
  templeLabel?: string
  isMasterAdmin?: boolean
  onExport: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export default function DonationsPageHeader({
  templeLabel,
  isMasterAdmin = false,
  onExport,
  onRefresh,
  isRefreshing = false,
}: DonationsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {templeLabel && (
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            {templeLabel}
          </p>
        )}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {isMasterAdmin ? 'All Donations' : 'Donations'}
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-xl">
          Track temple donations, receipts, refunds, and payment status.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl shadow-sm hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  )
}
