'use client'

import type { Donor } from '@/types/donor'
import {
  donorDisplayName,
  donorInitials,
  formatDonorDate,
  formatMoneyPrecise,
  getDonorBadges,
  isDonorVip,
} from './donorUtils'
import DonorRowActionsMenu, { type DonorRowActions } from './DonorRowActionsMenu'

interface DonorsTableProps {
  donors: Donor[]
  isLoading?: boolean
  isMasterAdmin?: boolean
  onRowClick: (donor: Donor) => void
  getRowActions: (donor: Donor) => DonorRowActions
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export default function DonorsTable({
  donors,
  isLoading,
  isMasterAdmin,
  onRowClick,
  getRowActions,
  page,
  limit,
  total,
  onPageChange,
}: DonorsTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return <DonorsTableSkeleton />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Donor
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Lifetime
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gifts
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Last gift
              </th>
              {isMasterAdmin && (
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Temple
                </th>
              )}
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {donors.map((donor) => (
              <DonorTableRow
                key={donor.id}
                donor={donor}
                isMasterAdmin={isMasterAdmin}
                onRowClick={onRowClick}
                actions={getRowActions(donor)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {donors.map((donor) => (
          <DonorMobileCard
            key={donor.id}
            donor={donor}
            isMasterAdmin={isMasterAdmin}
            onRowClick={onRowClick}
            actions={getRowActions(donor)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600 tabular-nums">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <PaginationButton
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              label="Previous"
            />
            <PaginationButton
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              label="Next"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function DonorTableRow({
  donor,
  isMasterAdmin,
  onRowClick,
  actions,
}: {
  donor: Donor
  isMasterAdmin?: boolean
  onRowClick: (d: Donor) => void
  actions: DonorRowActions
}) {
  const badges = getDonorBadges(donor)
  const vip = isDonorVip(donor.id)

  return (
    <tr
      className="group hover:bg-purple-50/40 transition-colors cursor-pointer"
      onClick={() => onRowClick(donor)}
    >
      <td className="px-5 py-4">
        <DonorIdentity donor={donor} badges={badges} vip={vip} compact={false} />
      </td>
      <td className="px-5 py-4">
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatMoneyPrecise(Number(donor.totalAmount))}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 tabular-nums">
          {donor.totalDonations}
          {donor.totalDonations > 1 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700">
              Repeat
            </span>
          )}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600">{formatDonorDate(donor.lastDonationDate)}</td>
      {isMasterAdmin && (
        <td className="px-5 py-4 text-sm text-gray-600">{donor.temple?.name || '—'}</td>
      )}
      <td className="px-5 py-4 text-right">
        <DonorRowActionsMenu actions={actions} />
      </td>
    </tr>
  )
}

function DonorMobileCard({
  donor,
  isMasterAdmin,
  onRowClick,
  actions,
}: {
  donor: Donor
  isMasterAdmin?: boolean
  onRowClick: (d: Donor) => void
  actions: DonorRowActions
}) {
  const badges = getDonorBadges(donor)
  const vip = isDonorVip(donor.id)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(donor)}
      onKeyDown={(e) => e.key === 'Enter' && onRowClick(donor)}
      className="p-4 hover:bg-purple-50/30 transition-colors cursor-pointer active:bg-purple-50/50"
    >
      <div className="flex items-start justify-between gap-3">
        <DonorIdentity donor={donor} badges={badges} vip={vip} compact />
        <DonorRowActionsMenu actions={actions} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatPill label="Lifetime" value={formatMoneyPrecise(Number(donor.totalAmount))} />
        <StatPill label="Gifts" value={String(donor.totalDonations)} />
        <StatPill label="Last" value={formatDonorDate(donor.lastDonationDate)} small />
      </div>
      {isMasterAdmin && donor.temple?.name && (
        <p className="text-xs text-gray-500 mt-2">{donor.temple.name}</p>
      )}
    </div>
  )
}

function DonorIdentity({
  donor,
  badges,
  vip,
  compact,
}: {
  donor: Donor
  badges: ReturnType<typeof getDonorBadges>
  vip: boolean
  compact: boolean
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-sm ${
          compact ? 'w-10 h-10 text-sm' : 'w-11 h-11 text-sm'
        }`}
      >
        {donorInitials(donor)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
            {donorDisplayName(donor)}
          </p>
          {vip && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
              VIP
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{donor.email || donor.phone}</p>
        {!compact && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {badges.slice(0, 3).map((b) => (
              <span
                key={b.id}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ring-inset ${b.className}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  small,
}: {
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-2 py-2">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={`font-semibold text-gray-900 tabular-nums mt-0.5 truncate ${
          small ? 'text-xs' : 'text-sm'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function PaginationButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
    >
      {label}
    </button>
  )
}

function DonorsTableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-56" />
          </div>
        </div>
      ))}
    </div>
  )
}
