'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendDataPoint, ChartGranularity } from '@/hooks/useOverviewData'
import { formatCurrency, safeNumber } from '@/lib/formatters'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'

const CHART_BODY_HEIGHT = 280

interface DonationTrendsChartProps {
  data: TrendDataPoint[]
  granularity: ChartGranularity
  onGranularityChange: (g: ChartGranularity) => void
  isLoading?: boolean
  isError?: boolean
  className?: string
}

function formatXAxis(dateStr: string, granularity: ChartGranularity) {
  try {
    const d = parseISO(dateStr)
    if (granularity === 'year') return format(d, 'yyyy')
    if (granularity === 'month') return format(d, 'MMM yy')
    if (granularity === 'week') return format(d, 'MMM d')
    if (granularity === 'hour') return format(d, 'h a')
    return format(d, 'MMM d')
  } catch {
    return dateStr
  }
}

const GRANULARITY_OPTIONS: { id: ChartGranularity; label: string }[] = [
  { id: 'hour', label: 'Hourly' },
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
]

function ChartEmptyState() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ height: CHART_BODY_HEIGHT }}
    >
      <div className="flex h-16 items-end gap-1 opacity-30" aria-hidden>
        {[35, 55, 40, 70, 50, 85, 60].map((h, i) => (
          <div key={i} className="w-3 rounded-t bg-violet-300" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">No donation trend data yet</p>
        <p className="mt-1 max-w-xs text-xs text-gray-500">
          Donations will appear here once kiosks begin processing transactions.
        </p>
      </div>
    </div>
  )
}

export default function DonationTrendsChart({
  data,
  granularity,
  onGranularityChange,
  isLoading,
  isError,
  className = '',
}: DonationTrendsChartProps) {
  const cardClass = `dashboard-card ops-chart-card flex flex-col overflow-hidden ${className}`.trim()

  if (isLoading) {
    return (
      <WidgetSkeleton
        lines={1}
        height="min-h-[var(--ops-chart-min-height)]"
        className={`!p-6 ${className}`}
      />
    )
  }

  if (isError) {
    return (
      <div className={cardClass}>
        <div className="px-6 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-gray-900">Donation analytics</h3>
        </div>
        <div
          className="flex items-center justify-center px-4 pb-4 text-sm text-gray-500"
          style={{ height: CHART_BODY_HEIGHT }}
        >
          Unable to load chart data. Try refreshing the page.
        </div>
      </div>
    )
  }

  const chartData = (Array.isArray(data) ? data : []).map((d) => ({
    date: d.date,
    amount: safeNumber(d.amount),
    count: safeNumber(d.count),
    label: formatXAxis(d.date, granularity),
  }))

  const hasPlottableData = chartData.some((d) => d.amount > 0 || d.count > 0)

  return (
    <div className={cardClass}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Donation analytics</h3>
          <p className="mt-0.5 text-xs text-gray-500">Platform-wide trends · last 90 days</p>
        </div>
        <div className="flex flex-wrap gap-0.5 rounded-xl border border-gray-200/80 bg-gray-50/80 p-0.5">
          {GRANULARITY_OPTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onGranularityChange(g.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                granularity === g.id
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-4" style={{ minHeight: CHART_BODY_HEIGHT }}>
        {!hasPlottableData ? (
          <ChartEmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_BODY_HEIGHT}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, { compact: true })}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#donationGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
