'use client'

import { useRouter } from 'next/navigation'

interface DeviceHealthSectionProps {
  total: number
  online: number
  offline: number
  needingAttention: number
  setupIssuesCount?: number
  isLoading?: boolean
}

export default function DeviceHealthSection({
  total,
  online,
  offline,
  needingAttention,
  setupIssuesCount = 0,
  isLoading,
}: DeviceHealthSectionProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const items = [
    {
      label: 'Online',
      value: online,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Offline',
      value: offline,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      label: 'Needs attention',
      value: needingAttention,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    ...(setupIssuesCount > 0
      ? [
          {
            label: 'Setup issues',
            value: setupIssuesCount,
            color: 'text-red-600',
            bg: 'bg-red-50',
          },
        ]
      : []),
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Platform health</h3>
          <p className="text-xs text-gray-500 mt-0.5">{total} kiosks total</p>
        </div>
        <button
          onClick={() => router.push('/dashboard?tab=devices')}
          className="text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          View all
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.bg} rounded-lg p-3 text-center`}
          >
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
