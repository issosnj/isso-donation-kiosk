'use client'

import { format } from 'date-fns'
import type { Donation } from '@/types/donation'
import { isAnonymousForAssign } from '@/lib/donationDisplay'
import { safeNumber } from '@/lib/formatters'
import DonationStatusBadge from './DonationStatusBadge'
import DonationRowActionsMenu, { type DonationRowActions } from './DonationRowActionsMenu'
import { donationFee, donationNet } from './donationUtils'

interface DonationsTableProps {
  donations: Donation[]
  showTempleColumn: boolean
  selectedIds: Set<string>
  onToggleSelectAll: () => void
  onToggleSelect: (id: string) => void
  allSelected: boolean
  getRowActions: (donation: Donation) => DonationRowActions
  onViewDonorDetails: (info: {
    phone: string
    donorId?: string | null
    name?: string | null
    email?: string | null
    address?: string | null
  }) => void
  onAssignDonor: (donationId: string) => void
  emptyMessage?: string
  emptyHint?: string
}

function DonorCell({
  donation,
  onViewDonorDetails,
  onAssignDonor,
}: {
  donation: Donation
  onViewDonorDetails: DonationsTableProps['onViewDonorDetails']
  onAssignDonor: (id: string) => void
}) {
  if (isAnonymousForAssign(donation)) {
    return (
      <div className="space-y-1.5 min-w-[140px]">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/60">
          Anonymous
        </span>
        {donation.status === 'SUCCEEDED' && (
          <button
            type="button"
            onClick={() => onAssignDonor(donation.id)}
            className="block text-xs font-medium text-purple-600 hover:text-purple-800"
          >
            Assign to donor
          </button>
        )}
      </div>
    )
  }

  if (donation.donorPhone || donation.donorId) {
    return (
      <div className="min-w-[140px] space-y-0.5">
        <p className="text-sm font-medium text-gray-900 leading-snug">
          {donation.donorName || 'Unknown'}
        </p>
        {donation.donorPhone && (
          <p className="text-xs text-gray-500 tabular-nums">{donation.donorPhone}</p>
        )}
        <button
          type="button"
          onClick={() =>
            onViewDonorDetails({
              phone: donation.donorPhone ?? '',
              donorId: donation.donorId,
              name: donation.donorName,
              email: donation.donorEmail,
              address: donation.donorAddress,
            })
          }
          className="text-xs font-medium text-purple-600 hover:text-purple-800"
        >
          View details
        </button>
        {donation.assignedAt && (
          <p className="text-xs text-gray-400">
            Assigned {format(new Date(donation.assignedAt), 'MMM d')}
          </p>
        )}
      </div>
    )
  }

  return <span className="text-sm text-gray-400">—</span>
}

export default function DonationsTable({
  donations,
  showTempleColumn,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  allSelected,
  getRowActions,
  onViewDonorDetails,
  onAssignDonor,
  emptyMessage = 'No donations match your filters',
  emptyHint,
}: DonationsTableProps) {
  const thClass =
    'px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/95'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[960px] w-full">
        <thead className="sticky top-0 z-[1]">
          <tr className="border-b border-gray-200">
            <th className={`${thClass} w-12`}>
              <input
                type="checkbox"
                checked={allSelected && donations.length > 0}
                onChange={onToggleSelectAll}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                aria-label="Select all"
              />
            </th>
            <th className={thClass}>Date</th>
            {showTempleColumn && <th className={thClass}>Temple</th>}
            <th className={thClass}>Receipt #</th>
            <th className={thClass}>Donor</th>
            <th className={thClass}>Category</th>
            <th className={`${thClass} text-right`}>Gross</th>
            <th className={`${thClass} text-right`}>Fee</th>
            <th className={`${thClass} text-right`}>Net</th>
            <th className={thClass}>Status</th>
            <th className={`${thClass} text-right w-28`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {donations.length === 0 ? (
            <tr>
              <td
                colSpan={showTempleColumn ? 11 : 10}
                className="px-6 py-16 text-center"
              >
                <p className="text-sm font-medium text-gray-600">{emptyMessage}</p>
                {emptyHint && <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>}
              </td>
            </tr>
          ) : (
            donations.map((donation) => {
              const fee = donationFee(donation)
              const net = donationNet(donation)

              return (
                <tr
                  key={donation.id}
                  className="hover:bg-purple-50/40 transition-colors group"
                >
                  <td className="px-4 py-4 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(donation.id)}
                      onChange={() => onToggleSelect(donation.id)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(donation.createdAt), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {format(new Date(donation.createdAt), 'h:mm a')}
                    </p>
                  </td>
                  {showTempleColumn && (
                    <td className="px-4 py-4 whitespace-nowrap align-middle text-sm text-gray-700">
                      {donation.temple?.name || '—'}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap align-middle">
                    <span className="text-sm font-mono text-gray-800">
                      {donation.receiptNumber || (
                        <span className="text-gray-400 italic font-sans">—</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <DonorCell
                      donation={donation}
                      onViewDonorDetails={onViewDonorDetails}
                      onAssignDonor={onAssignDonor}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle text-sm text-gray-600">
                    {donation.category?.name || 'General'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle text-right">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      ${safeNumber(donation.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle text-right">
                    <span className="text-sm text-gray-500 tabular-nums">
                      {donation.status === 'SUCCEEDED' && fee > 0
                        ? `-$${fee.toFixed(2)}`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle text-right">
                    <span className="text-sm font-bold text-purple-700 tabular-nums">
                      {net != null ? `$${net.toFixed(2)}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle">
                    <DonationStatusBadge status={donation.status} size="sm" />
                  </td>
                  <td className="px-4 py-4 align-middle text-right">
                    <DonationRowActionsMenu actions={getRowActions(donation)} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
