'use client'

import { useRouter } from 'next/navigation'
import type { AlertSummary } from './types'

interface StatusSummaryStripProps {
  summary: AlertSummary
  isLoading?: boolean
}

export default function StatusSummaryStrip({ summary, isLoading }: StatusSummaryStripProps) {
  const router = useRouter()
  const hasAlerts = summary.total > 0

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-48" />
      </div>
    )
  }

  if (!hasAlerts) {
    return (
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">All systems normal</span>
        </div>
      </div>
    )
  }

  const parts: string[] = []
  if (summary.critical) parts.push(`${summary.critical} critical`)
  if (summary.warning) parts.push(`${summary.warning} warning`)
  if (summary.info) parts.push(`${summary.info} info`)

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard?tab=overview')}
      className="w-full text-left flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 hover:bg-gray-50 hover:border-purple-200 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {summary.critical > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              {summary.critical} critical
            </span>
          )}
          {summary.warning > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              {summary.warning} warning
            </span>
          )}
          {summary.info > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {summary.info} info
            </span>
          )}
        </div>
        <span className="text-sm text-gray-600">{parts.join(' · ')} need attention</span>
      </div>
      <span className="text-xs font-medium text-purple-600 group-hover:text-purple-700">
        View all →
      </span>
    </button>
  )
}
