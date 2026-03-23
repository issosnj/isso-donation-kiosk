'use client'

import type { DeviceOperationalStatus } from '@/types/device'

const statusConfig: Record<
  DeviceOperationalStatus,
  { label: string; className: string }
> = {
  online: {
    label: 'Online',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  offline: {
    label: 'Offline',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  deactivated: {
    label: 'Deactivated',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
}

interface DeviceStatusBadgeProps {
  status: DeviceOperationalStatus
  size?: 'sm' | 'md' | 'lg'
}

export default function DeviceStatusBadge({ status, size = 'md' }: DeviceStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.offline
  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
        ? 'px-4 py-2 text-sm'
        : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.className} ${sizeClass}`}
    >
      {config.label}
    </span>
  )
}
