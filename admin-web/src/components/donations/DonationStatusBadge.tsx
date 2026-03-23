'use client'

type DonationStatus =
  | 'SUCCEEDED'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PLEDGED'

const statusConfig: Record<
  DonationStatus,
  { label: string; className: string }
> = {
  SUCCEEDED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  CANCELED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  PLEDGED: {
    label: 'Pledged',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
}

interface DonationStatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export default function DonationStatusBadge({ status, size = 'md' }: DonationStatusBadgeProps) {
  const config =
    statusConfig[status as DonationStatus] ?? {
      label: status,
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    }
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.className} ${sizeClass}`}
    >
      {config.label}
    </span>
  )
}
