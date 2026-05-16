'use client'

import { useRouter } from 'next/navigation'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import type { ReceiptOpsSummary } from '@/types/templeOverview'

interface TempleReceiptOpsProps {
  summary: ReceiptOpsSummary
  isLoading?: boolean
  isError?: boolean
}

export default function TempleReceiptOps({ summary, isLoading, isError }: TempleReceiptOpsProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={4} height="min-h-[220px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-6 text-sm text-gray-500 text-center">
        Unable to load receipt operations.
      </div>
    )
  }

  const stats = [
    { label: 'Receipts sent', value: summary.receiptsSent, tone: 'text-emerald-600' },
    { label: 'Failed receipts', value: summary.failedReceipts, tone: 'text-red-600' },
    { label: 'Pending resend', value: summary.pendingResend, tone: 'text-amber-600' },
  ]

  return (
    <div className="dashboard-card overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100/90 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Receipt operations</h3>
          <p className="text-xs text-gray-500 mt-0.5">Email delivery overview</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard?tab=receipts')}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          Receipts
        </button>
      </div>
      <div className="p-5 space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="text-center rounded-xl border border-gray-100 py-3 px-1">
              <p className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Recent activity
          </p>
          <p className="text-xs text-gray-700 mt-1 leading-relaxed">{summary.recentResendLabel}</p>
        </div>
      </div>
    </div>
  )
}
