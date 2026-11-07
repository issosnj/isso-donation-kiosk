'use client'

import type { ReactNode } from 'react'

interface TempleOption {
  id: string
  name: string
}

interface CategoryOption {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SUCCEEDED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const inputClass =
  'h-10 w-full min-w-0 px-3 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 outline-none transition-shadow'

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

interface DonationsFiltersToolbarProps {
  isMasterAdmin: boolean
  temples?: TempleOption[]
  selectedTempleId: string
  onTempleChange: (id: string) => void
  startDate: string
  endDate: string
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  categoryFilter: string
  onCategoryFilterChange: (v: string) => void
  categories: CategoryOption[]
  showFailedAndCancelled: boolean
  onShowFailedAndCancelledChange: (v: boolean) => void
  onClearFilters: () => void
  masterAdminActions?: ReactNode
}

export default function DonationsFiltersToolbar({
  isMasterAdmin,
  temples,
  selectedTempleId,
  onTempleChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  showFailedAndCancelled,
  onShowFailedAndCancelledChange,
  onClearFilters,
  masterAdminActions,
}: DonationsFiltersToolbarProps) {
  const rangeInvalid = Boolean(startDate && endDate && startDate > endDate)

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs font-medium text-orange-600 hover:text-orange-800"
        >
          Clear filters
        </button>
      </div>
      <div
        className={
          isMasterAdmin
            ? 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[minmax(13rem,1.4fr)_auto_minmax(11rem,1fr)_minmax(11rem,1fr)]'
            : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[auto_minmax(11rem,1fr)_minmax(11rem,1fr)]'
        }
      >
        {isMasterAdmin && (
          <Field label="Temple">
            <select
              value={selectedTempleId}
              onChange={(e) => onTempleChange(e.target.value)}
              className={inputClass}
            >
              <option value="all">All temples</option>
              {temples?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div>
          <div className="flex items-end gap-2">
            <Field label="Start" className="w-[10.75rem] shrink-0">
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => onStartDateChange(e.target.value)}
                className={inputClass}
                aria-label="Start date"
              />
            </Field>
            <span className="mb-2.5 shrink-0 text-sm text-gray-300" aria-hidden>
              –
            </span>
            <Field label="End" className="w-[10.75rem] shrink-0">
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className={inputClass}
                aria-label="End date"
              />
            </Field>
          </div>
          {rangeInvalid && (
            <p className="mt-1.5 text-xs text-red-600">Start date is after the end date.</p>
          )}
        </div>
        <Field label="Status">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {categories.length > 0 && (
          <Field label="Category">
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Search" className="md:col-span-2 lg:col-span-full">
          <input
            type="search"
            placeholder="Donor name, phone, receipt #…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showFailedAndCancelled}
            onChange={(e) => onShowFailedAndCancelledChange(e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Show failed &amp; cancelled</span>
        </label>
        {masterAdminActions && (
          <div className="flex flex-wrap gap-2">{masterAdminActions}</div>
        )}
      </div>
    </div>
  )
}
