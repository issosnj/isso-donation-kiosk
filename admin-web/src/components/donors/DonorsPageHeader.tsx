'use client'

import { useEffect, useRef, useState } from 'react'
import PageHeader, {
  PageHeaderActions,
  headerPrimaryButtonClass,
  headerSecondaryButtonClass,
} from '@/components/layout/PageHeader'

interface DonorsPageHeaderProps {
  templeLabel?: string
  isMasterAdmin?: boolean
  onAddDonor: () => void
  onExport: () => void
  onImport: () => void
  onBackfill: () => void
  exportDisabled?: boolean
}

export default function DonorsPageHeader({
  templeLabel,
  isMasterAdmin = false,
  onAddDonor,
  onExport,
  onImport,
  onBackfill,
  exportDisabled,
}: DonorsPageHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  const actions = (
    <>
      <button type="button" onClick={onAddDonor} className={headerPrimaryButtonClass}>
        <PlusIcon />
        Add Donor
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={exportDisabled}
        className={headerSecondaryButtonClass}
      >
        <ExportIcon />
        Export
      </button>
      <button type="button" onClick={onImport} className={headerSecondaryButtonClass}>
        <ImportIcon />
        Import
      </button>
      <div className="relative" ref={moreRef}>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={headerSecondaryButtonClass}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
        >
          More
          <ChevronIcon />
        </button>
        {moreOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1.5 w-52 py-1 bg-white border border-gray-200/80 rounded-xl shadow-lg ring-1 ring-black/5"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMoreOpen(false)
                onBackfill()
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-900 transition-colors"
            >
              Backfill from donations
            </button>
          </div>
        )}
      </div>
    </>
  )

  if (isMasterAdmin) {
    return <PageHeaderActions>{actions}</PageHeaderActions>
  }

  return (
    <PageHeader
      eyebrow={templeLabel}
      title="Donor Management"
      description="Manage temple donor relationships, donation history, recurring contributions, and engagement."
      actions={actions}
    />
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
