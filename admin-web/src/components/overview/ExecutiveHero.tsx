'use client'

interface ExecutiveHeroProps {
  totalYtd: number
  trendDirection: 'up' | 'down' | 'neutral'
  countYtd: number
  isLoading?: boolean
  isError?: boolean
}

export default function ExecutiveHero({
  totalYtd,
  trendDirection,
  countYtd,
  isLoading,
  isError,
}: ExecutiveHeroProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-48 mb-4" />
        <div className="h-12 bg-white/30 rounded w-64" />
        <div className="h-4 bg-white/20 rounded w-32 mt-4" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 shadow-lg">
        <div className="flex items-center gap-3 text-purple-100">
          <svg className="w-10 h-10 flex-shrink-0 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium">Unable to load overview metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 shadow-lg">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-purple-100 text-sm font-medium mb-1">Total raised · Year to date</p>
          <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            ${totalYtd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-purple-200 text-sm">
              {countYtd} successful donation{countYtd !== 1 ? 's' : ''}
            </span>
            {trendDirection !== 'neutral' && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded ${
                  trendDirection === 'up' ? 'bg-green-500/20 text-green-100' : 'bg-amber-500/20 text-amber-100'
                }`}
              >
                {trendDirection === 'up' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    On track
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Below last month
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex w-16 h-16 bg-white/15 rounded-xl items-center justify-center flex-shrink-0">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
