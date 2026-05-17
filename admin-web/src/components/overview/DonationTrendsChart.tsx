'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TrendDataPoint, ChartGranularity } from '@/hooks/useOverviewData'
import { formatCurrency, safeNumber } from '@/lib/formatters'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'

interface DonationTrendsChartProps {
  data: TrendDataPoint[]
  granularity: ChartGranularity
  onGranularityChange: (g: ChartGranularity) => void
  isLoading?: boolean
  isError?: boolean
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

export default function DonationTrendsChart({
  data,
  granularity,
  onGranularityChange,
  isLoading,
  isError,
}: DonationTrendsChartProps) {
  if (isLoading) {
    return <WidgetSkeleton lines={1} height="min-h-[var(--ops-chart-min-height)]" className="!p-6" />
  }

  if (isError) {
    return (
      <div className="dashboard-card overflow-hidden">
        <div className="px-6 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-gray-900">Donation analytics</h3>
        </div>
        <div className="h-72 px-4 pb-4 flex items-center justify-center text-gray-500 text-sm">
          Unable to load chart data
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

  return (
    <div className="dashboard-card ops-chart-card overflow-hidden">
      <div className="shrink-0 px-5 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Donation analytics</h3>
          <p className="text-xs text-gray-500 mt-0.5">Platform-wide trends · last 90 days</p>
        </div>
        <div className="flex flex-wrap rounded-xl border border-gray-200/80 p-0.5 bg-gray-50/80 gap-0.5">
          {GRANULARITY_OPTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onGranularityChange(g.id)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all ${
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
      <div className="min-h-[14rem] flex-1 px-3 pb-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No donation data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
