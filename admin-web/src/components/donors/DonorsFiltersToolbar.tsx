'use client'

import { useEffect, useRef } from 'react'
import type { DonorSegment, DonorSortKey } from '@/types/donor'
import TempleFilter from './TempleFilter'

interface TempleOption {
  id: string
  name: string
}

const SEGMENTS: { id: DonorSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vip', label: 'VIP' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'new', label: 'New' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'high_value', label: 'High value' },
  { id: 'anonymous', label: 'Anonymous' },
]

const SORT_OPTIONS: { id: DonorSortKey; label: string }[] = [
  { id: 'last_donation', label: 'Last donation' },
  { id: 'total_amount', label: 'Lifetime total' },
  { id: 'donation_count', label: 'Gift count' },
  { id: 'name', label: 'Name' },
  { id: 'created', label: 'Date added' },
]

interface DonorsFiltersToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  segment: DonorSegment
  onSegmentChange: (s: DonorSegment) => void
  sortKey: DonorSortKey
  onSortChange: (k: DonorSortKey) => void
  onClearFilters: () => void
  isMasterAdmin?: boolean
  temples?: TempleOption[]
  selectedTempleId?: string
  onTempleSelect?: (id: string | undefined) => void
  resultCount?: number
}

export default function DonorsFiltersToolbar({
  search,
  onSearchChange,
  searchInputRef,
  segment,
  onSegmentChange,
  sortKey,
  onSortChange,
  onClearFilters,
  isMasterAdmin,
  temples = [],
  selectedTempleId,
  onTempleSelect,
  resultCount,
}: DonorsFiltersToolbarProps) {
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = searchInputRef ?? internalRef

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inputRef])

  const hasFilters = search.trim() !== '' || segment !== 'all' || sortKey !== 'last_donation'

  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-md shadow-purple-500/5 p-4 sm:p-5 space-y-4">
        {isMasterAdmin && onTempleSelect && (
          <TempleFilter
            temples={temples}
            selectedTempleId={selectedTempleId}
            onSelect={onTempleSelect}
          />
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search donors by name, email, or phone…"
              className="w-full pl-10 pr-24 py-2.5 text-sm bg-gray-50/80 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-300 focus:bg-white transition-all"
              aria-label="Search donors"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded-md shadow-sm">
              ⌘K
            </kbd>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="sr-only" htmlFor="donor-sort">
              Sort donors
            </label>
            <select
              id="donor-sort"
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as DonorSortKey)}
              className="px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200/80 rounded-xl focus:ring-2 focus:ring-purple-500/25 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="px-3 py-2.5 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">Segments</span>
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSegmentChange(s.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                segment === s.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/25'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              {s.label}
            </button>
          ))}
          {typeof resultCount === 'number' && (
            <span className="ml-auto text-xs text-gray-500 tabular-nums">
              {resultCount} {resultCount === 1 ? 'donor' : 'donors'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
