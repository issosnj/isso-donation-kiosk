'use client'

type EmptyVariant = 'no_donors' | 'no_results' | 'segment' | 'select_temple'

interface DonorsEmptyStateProps {
  variant: EmptyVariant
  segmentLabel?: string
  templeName?: string
  onAddDonor?: () => void
  onBackfill?: () => void
  onClearSearch?: () => void
}

export default function DonorsEmptyState({
  variant,
  segmentLabel,
  templeName,
  onAddDonor,
  onBackfill,
  onClearSearch,
}: DonorsEmptyStateProps) {
  const config = {
    no_donors: {
      title: 'No donors yet',
      description: templeName
        ? `${templeName} has no donor records. Donors are created when gifts are made—or you can backfill from past donations.`
        : 'Donor records appear when supporters give. Run a backfill to import historical gifts.',
      icon: UsersIcon,
    },
    no_results: {
      title: 'No matching donors',
      description: 'Try a different search term or clear your filters to see more results.',
      icon: SearchIcon,
    },
    segment: {
      title: `No ${segmentLabel || 'matching'} donors`,
      description: 'No donors match this segment on the current page. Try another filter or clear segments.',
      icon: FilterIcon,
    },
    select_temple: {
      title: 'Select a temple',
      description: 'Choose a temple to view its donor directory, analytics, and engagement tools.',
      icon: TempleIcon,
    },
  }[variant]

  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shadow-inner">
          <Icon className="w-10 h-10 text-purple-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-purple-100 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
          </svg>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-md leading-relaxed">{config.description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
        {variant === 'no_results' && onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Clear search
          </button>
        )}
        {variant === 'no_donors' && onBackfill && (
          <button
            type="button"
            onClick={onBackfill}
            className="px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
          >
            Backfill from donations
          </button>
        )}
        {onAddDonor && variant !== 'select_temple' && (
          <button
            type="button"
            onClick={onAddDonor}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-sm transition-colors"
          >
            Add donor
          </button>
        )}
      </div>
    </div>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  )
}

function TempleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  )
}
