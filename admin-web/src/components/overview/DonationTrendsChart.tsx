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

interface DonationTrendsChartProps {
  data: TrendDataPoint[]
  granularity: ChartGranularity
  onGranularityChange: (g: ChartGranularity) => void
  isLoading?: boolean
}

function formatXAxis(dateStr: string, granularity: ChartGranularity) {
  try {
    const d = parseISO(dateStr)
    if (granularity === 'month') return format(d, 'MMM yy')
    if (granularity === 'week') return format(d, 'MMM d')
    return format(d, 'MMM d')
  } catch {
    return dateStr
  }
}

export default function DonationTrendsChart({
  data,
  granularity,
  onGranularityChange,
  isLoading,
}: DonationTrendsChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatXAxis(d.date, granularity),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Donation trends</h3>
        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                granularity === g
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 px-4 pb-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No donation data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Amount']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
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
