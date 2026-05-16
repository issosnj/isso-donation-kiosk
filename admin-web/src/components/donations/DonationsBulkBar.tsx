'use client'

interface DonationsBulkBarProps {
  selectedCount: number
  onExportSelected: () => void
  onResendSelected: () => void
  onClearSelection: () => void
  onCancelPending?: () => void
  pendingSelectedCount?: number
  isResending?: boolean
  isCancelling?: boolean
}

export default function DonationsBulkBar({
  selectedCount,
  onExportSelected,
  onResendSelected,
  onClearSelection,
  onCancelPending,
  pendingSelectedCount = 0,
  isResending = false,
  isCancelling = false,
}: DonationsBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-purple-50/80 border-b border-purple-100">
      <p className="text-sm font-medium text-purple-900">
        <span className="tabular-nums">{selectedCount}</span> selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportSelected}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Export selected
        </button>
        <button
          type="button"
          onClick={onResendSelected}
          disabled={isResending}
          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50"
        >
          {isResending ? 'Sending…' : 'Resend receipts'}
        </button>
        {pendingSelectedCount > 0 && onCancelPending && (
          <button
            type="button"
            onClick={onCancelPending}
            disabled={isCancelling}
            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
          >
            Cancel {pendingSelectedCount} pending
          </button>
        )}
        <button
          type="button"
          onClick={onClearSelection}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          Clear selection
        </button>
      </div>
    </div>
  )
}
