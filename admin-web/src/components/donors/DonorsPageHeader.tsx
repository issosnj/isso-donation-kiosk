'use client'

import { useEffect, useRef, useState } from 'react'

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-100/80 bg-gradient-to-br from-white via-purple-50/30 to-violet-50/40 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent pointer-events-none" />
      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {!isMasterAdmin ? (
            <div className="min-w-0 max-w-2xl">
              {templeLabel && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
                  {templeLabel}
                </p>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Donor Management
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Manage temple donor relationships, donation history, recurring contributions, and
                engagement.
              </p>
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAddDonor}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-md shadow-purple-500/20 hover:from-purple-700 hover:to-violet-700 transition-all"
            >
              <PlusIcon />
              Add Donor
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white/90 border border-gray-200/80 rounded-xl shadow-sm hover:bg-white hover:shadow transition-all disabled:opacity-50"
            >
              <ExportIcon />
              Export
            </button>
            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white/90 border border-gray-200/80 rounded-xl shadow-sm hover:bg-white hover:shadow transition-all"
            >
              <ImportIcon />
              Import
            </button>
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white/90 border border-gray-200/80 rounded-xl shadow-sm hover:bg-white transition-all"
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
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                  >
                    Backfill from donations
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
