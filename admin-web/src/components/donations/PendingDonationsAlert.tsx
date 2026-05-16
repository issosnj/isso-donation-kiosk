'use client'

interface PendingDonationsAlertProps {
  count: number
  onReview: () => void
  onShowFailedAndCancelled?: () => void
  onCleanupPending?: () => void
  isCleaningUp?: boolean
  isMasterAdmin?: boolean
}

export default function PendingDonationsAlert({
  count,
  onReview,
  onShowFailedAndCancelled,
  onCleanupPending,
  isCleaningUp = false,
  isMasterAdmin = false,
}: PendingDonationsAlertProps) {
  if (count === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-100 border border-amber-200/60 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-amber-950">
              {count} donation{count !== 1 ? 's' : ''} pending
            </h3>
            <p className="text-sm text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
              These were started on a kiosk but payment was not completed (app closed, network
              issue, etc.). Review them or clean up stale records.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <button
            type="button"
            onClick={onReview}
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-sm transition-colors"
          >
            Review pending
          </button>
          {onShowFailedAndCancelled && (
            <button
              type="button"
              onClick={onShowFailedAndCancelled}
              className="px-4 py-2 text-sm font-medium text-amber-900 bg-white/80 border border-amber-200 rounded-xl hover:bg-white transition-colors"
            >
              Show failed &amp; cancelled
            </button>
          )}
          {isMasterAdmin && onCleanupPending && (
            <button
              type="button"
              onClick={onCleanupPending}
              disabled={isCleaningUp}
              className="px-4 py-2 text-sm font-medium text-amber-800 border border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {isCleaningUp ? 'Cleaning…' : 'Cleanup all pending'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
