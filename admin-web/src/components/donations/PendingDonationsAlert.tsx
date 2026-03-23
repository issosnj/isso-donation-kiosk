'use client'

interface PendingDonationsAlertProps {
  count: number
  onReview: () => void
  onCleanupPending?: () => void
  isCleaningUp?: boolean
  isMasterAdmin?: boolean
}

export default function PendingDonationsAlert({
  count,
  onReview,
  onCleanupPending,
  isCleaningUp = false,
  isMasterAdmin = false,
}: PendingDonationsAlertProps) {
  if (count === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              {count} donation{count !== 1 ? 's' : ''} pending
            </h3>
            <p className="text-sm text-amber-800 mt-0.5">
              These were initiated but the payment flow was interrupted (app closed, network error,
              etc.). Toggle &quot;Show Failed & Cancelled&quot; to see them, then review or clean
              up.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
          <button
            onClick={onReview}
            className="px-3 py-1.5 text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Review
          </button>
          {isMasterAdmin && onCleanupPending && (
            <button
              onClick={onCleanupPending}
              disabled={isCleaningUp}
              className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCleaningUp ? 'Cleaning...' : 'Cleanup All Pending'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
