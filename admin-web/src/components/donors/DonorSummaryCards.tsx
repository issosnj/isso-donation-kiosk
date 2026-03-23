'use client'

interface DonorSummaryCardsProps {
  total: number
  totalDonated: number
  newThisMonth: number
  repeatCount: number
  activeCount?: number
  isLoading?: boolean
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const cards = [
  {
    key: 'total',
    label: 'Total donors',
    format: (v: number) => v.toLocaleString(),
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    key: 'totalDonated',
    label: 'Total donated',
    format: formatCurrency,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    key: 'newThisMonth',
    label: 'New this month',
    format: (v: number) => v.toLocaleString(),
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'repeatCount',
    label: 'Repeat donors',
    format: (v: number) => v.toLocaleString(),
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
]

export default function DonorSummaryCards({
  total,
  totalDonated,
  newThisMonth,
  repeatCount,
  activeCount,
  isLoading,
}: DonorSummaryCardsProps) {
  const values = {
    total,
    totalDonated,
    newThisMonth,
    repeatCount,
    activeCount: activeCount ?? 0,
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums">
            {c.format(values[c.key as keyof typeof values])}
          </p>
        </div>
      ))}
    </div>
  )
}
