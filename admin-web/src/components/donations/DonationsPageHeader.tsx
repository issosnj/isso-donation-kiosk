'use client'

import PageHeader, {
  PageHeaderActions,
  headerPrimaryButtonClass,
  headerSecondaryButtonClass,
} from '@/components/layout/PageHeader'

interface DonationsPageHeaderProps {
  templeLabel?: string
  isMasterAdmin?: boolean
  onExport: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

function HeaderActions({
  onExport,
  onRefresh,
  isRefreshing,
}: Pick<DonationsPageHeaderProps, 'onExport' | 'onRefresh' | 'isRefreshing'>) {
  return (
    <>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className={headerSecondaryButtonClass}
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </button>
      <button type="button" onClick={onExport} className={headerPrimaryButtonClass}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export CSV
      </button>
    </>
  )
}

export default function DonationsPageHeader({
  templeLabel,
  isMasterAdmin = false,
  onExport,
  onRefresh,
  isRefreshing = false,
}: DonationsPageHeaderProps) {
  const actions = (
    <HeaderActions onExport={onExport} onRefresh={onRefresh} isRefreshing={isRefreshing} />
  )

  if (isMasterAdmin) {
    return <PageHeaderActions>{actions}</PageHeaderActions>
  }

  return (
    <PageHeader
      eyebrow={templeLabel}
      title="Donations"
      description="Track temple donations, receipts, refunds, and payment status."
      actions={actions}
    />
  )
}
