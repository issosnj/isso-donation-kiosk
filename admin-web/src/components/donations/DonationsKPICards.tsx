'use client'

import type { DonationsKpis } from '@/types/donation'
import { formatMoney } from './donationUtils'

interface KpiCardProps {
  label: string
  value: string
  helper: string
  iconPath: string
  accentClass: string
}

function KpiCard({ label, value, helper, iconPath, accentClass }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums tracking-tight">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{helper}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>
      </div>
    </div>
  )
}

interface DonationsKPICardsProps {
  kpis: DonationsKpis
  isLoading?: boolean
}

export default function DonationsKPICards({ kpis, isLoading }: DonationsKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-[108px]"
          >
            <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  const cards: KpiCardProps[] = [
    {
      label: 'Total gross',
      value: formatMoney(kpis.totalGross),
      helper: 'Completed donations',
      iconPath:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      accentClass: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Net donations',
      value: formatMoney(kpis.totalNet),
      helper: 'After processing fees',
      iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      accentClass: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Stripe fees',
      value: formatMoney(kpis.totalFees),
      helper: 'Processing costs',
      iconPath:
        'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      accentClass: 'bg-gray-100 text-gray-600',
    },
    {
      label: 'Completed',
      value: kpis.completedCount.toLocaleString(),
      helper: 'Successful payments',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      accentClass: 'bg-green-50 text-green-600',
    },
    {
      label: 'Pending / failed',
      value: (kpis.pendingCount + kpis.failedCancelledCount).toLocaleString(),
      helper: `${kpis.pendingCount} pending · ${kpis.failedCancelledCount} failed/cancelled`,
      iconPath:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      accentClass: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  )
}
