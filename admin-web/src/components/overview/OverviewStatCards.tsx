'use client'

interface OverviewStatCardsProps {
  totalYtd: number
  countYtd: number
  avgGift: number
  isLoading?: boolean
  isError?: boolean
}

const cards = [
  {
    key: 'total',
    label: 'Total raised',
    format: (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    key: 'count',
    label: 'Donations',
    format: (v: number) => v.toLocaleString(),
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'avg',
    label: 'Average gift',
    format: (v: number) => `$${v.toFixed(2)}`,
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
]

export default function OverviewStatCards({
  totalYtd,
  countYtd,
  avgGift,
  isLoading,
  isError,
}: OverviewStatCardsProps) {
  const values = { total: totalYtd, count: countYtd, avg: avgGift }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-10 h-10 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium">Unable to load overview metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {c.label}
            </span>
            <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
              <svg
                className={`w-4 h-4 ${c.iconColor}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">
            {c.format(values[c.key as keyof typeof values])}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Year to date</p>
        </div>
      ))}
    </div>
  )
}
