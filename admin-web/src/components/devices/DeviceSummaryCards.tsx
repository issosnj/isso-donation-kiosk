'use client'

import type { DeviceSummary } from '@/types/device'

interface DeviceSummaryCardsProps {
  summary: DeviceSummary
  isLoading?: boolean
}

export default function DeviceSummaryCards({ summary, isLoading }: DeviceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Devices',
      value: summary.total,
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
    },
    {
      label: 'Online',
      value: summary.online,
      icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
      bg: 'bg-green-50',
      text: 'text-green-600',
    },
    {
      label: 'Offline',
      value: summary.offline,
      icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      bg: 'bg-gray-100',
      text: 'text-gray-600',
    },
    {
      label: 'Needs Attention',
      value: summary.needingAttention,
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">{card.label}</span>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}
            >
              <svg
                className={`w-5 h-5 ${card.text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={card.icon}
                />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
