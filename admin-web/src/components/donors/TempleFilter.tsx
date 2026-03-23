'use client'

interface Temple {
  id: string
  name: string
}

interface TempleFilterProps {
  temples: Temple[]
  selectedTempleId: string | undefined
  onSelect: (templeId: string | undefined) => void
  isLoading?: boolean
}

export default function TempleFilter({
  temples,
  selectedTempleId,
  onSelect,
  isLoading,
}: TempleFilterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Temple</label>
      <div className="relative">
        <select
          value={selectedTempleId ?? ''}
          onChange={(e) => onSelect(e.target.value || undefined)}
          disabled={isLoading}
          className="w-full min-w-[220px] px-4 py-2.5 pr-10 appearance-none bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select a temple to view donors</option>
          {temples.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
