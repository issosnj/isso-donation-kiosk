'use client'

import { useRouter } from 'next/navigation'
import type { TemplePerformance } from '@/hooks/useOverviewData'

interface TemplePerformanceSectionProps {
  temples: TemplePerformance[]
  isLoading?: boolean
  isError?: boolean
}

export default function TemplePerformanceSection({
  temples,
  isLoading,
  isError,
}: TemplePerformanceSectionProps) {
  const router = useRouter()
  const maxTotal = Math.max(...temples.map((t) => t.total), 1)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Temple performance</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Temple performance</h3>
        </div>
        <div className="px-6 py-12 flex items-center justify-center gap-2 text-gray-500">
          <svg className="w-10 h-10 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium">Unable to load temple data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Temple performance</h3>
        <p className="text-xs text-gray-500 mt-0.5">By donation total · Last 90 days</p>
      </div>
      <div className="divide-y divide-gray-100">
        {temples.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">No temple data yet</div>
        ) : (
          temples.slice(0, 8).map((t, i) => (
            <div
              key={t.templeId}
              className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
            >
              <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate">{t.templeName}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                    ${t.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${(t.total / maxTotal) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{t.count} donations</p>
              </div>
              <button
                onClick={() => {
                  sessionStorage.setItem('openTempleId', t.templeId)
                  router.push('/dashboard?tab=temples')
                }}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 flex-shrink-0"
              >
                View
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
