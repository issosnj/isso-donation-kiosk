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
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none transition-shadow'

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
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs font-medium text-purple-600 hover:text-purple-800"
        >
          Clear filters
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isMasterAdmin && (
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Temple</label>
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
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Search</label>
          <input
            type="search"
            placeholder="Donor name, phone, receipt #…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
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
        </div>
        {categories.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
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
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showFailedAndCancelled}
            onChange={(e) => onShowFailedAndCancelledChange(e.target.checked)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
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
