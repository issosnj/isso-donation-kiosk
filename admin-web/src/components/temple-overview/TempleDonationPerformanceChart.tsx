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
import type { TrendDataPoint } from '@/hooks/useOverviewData'
import type { DonationPerformanceSummary, TempleChartPeriod } from '@/types/templeOverview'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import { formatCurrency, safeNumber } from '@/lib/formatters'

const PERIOD_OPTIONS: { id: TempleChartPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'ytd', label: 'YTD' },
]

interface TempleDonationPerformanceChartProps {
  data: TrendDataPoint[]
  period: TempleChartPeriod
  onPeriodChange: (p: TempleChartPeriod) => void
  summary: DonationPerformanceSummary
  isLoading?: boolean
  isError?: boolean
}

function formatLabel(dateStr: string, period: TempleChartPeriod) {
  try {
    const d = parseISO(dateStr)
    if (period === 'ytd') return format(d, 'MMM')
    if (period === 'today') return format(d, 'h a')
    return format(d, 'MMM d')
  } catch {
    return dateStr
  }
}

export default function TempleDonationPerformanceChart({
  data,
  period,
  onPeriodChange,
  summary,
  isLoading,
  isError,
}: TempleDonationPerformanceChartProps) {
  if (isLoading) {
    return <WidgetSkeleton lines={1} height="h-[340px]" className="!p-6" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-8 text-center text-sm text-gray-500">
        Unable to load donation performance. Try refreshing.
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date,
    amount: safeNumber(d.amount),
    label: formatLabel(d.date, period),
  }))

  return (
    <div className="dashboard-card overflow-hidden flex flex-col min-h-[340px]">
      <div className="px-5 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Donation Performance</h3>
          <p className="text-xs text-gray-500 mt-0.5">Succeeded gifts over time</p>
        </div>
        <div className="flex rounded-xl border border-gray-200/80 p-0.5 bg-gray-50/80 gap-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPeriodChange(opt.id)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                period === opt.id
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56 px-3">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
            <div className="flex items-end gap-1 h-16 opacity-40">
              {[35, 55, 40, 70, 50, 85, 60].map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-t bg-violet-300"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p>No trend data for this period yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="templeDonationGradient" x1="0" y1="0" x2="0" y2="1">
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
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#templeDonationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-100/90 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-500 font-medium">Best day</p>
          <p className="text-gray-900 font-semibold mt-0.5">{summary.bestDay}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Peak hour</p>
          <p className="text-gray-900 font-semibold mt-0.5">{summary.peakHour}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Top category</p>
          <p className="text-gray-900 font-semibold mt-0.5 truncate">{summary.highestCategory}</p>
        </div>
      </div>
    </div>
  )
}
