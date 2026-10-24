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
import type { TrendDataPoint } from '@/hooks/useOverviewData'
import type { DonationPerformanceSummary, TempleChartPeriod } from '@/types/templeOverview'
import { WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import { formatCurrency, formatCurrencyExact, safeNumber } from '@/lib/formatters'

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
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const utc = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: period === 'ytd' ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(utc)
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
    return <WidgetSkeleton lines={1} height="h-[380px]" className="!p-6" />
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
    <div className="dashboard-card overflow-hidden flex flex-col h-[380px]">
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
                  ? 'bg-white text-orange-700 shadow-sm'
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
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <p>No succeeded gifts in this period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="templeDonationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
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
                formatter={(value: number) => [formatCurrencyExact(value), 'Succeeded']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#ea580c"
                strokeWidth={2}
                fill="url(#templeDonationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-100/90 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-500 font-medium">Best Day · This View</p>
          <p className="text-gray-900 font-semibold mt-0.5">
            {summary.bestAmount > 0
              ? `${summary.bestDay} · ${formatCurrencyExact(summary.bestAmount)}`
              : summary.bestDay}
          </p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Peak Hour · 30 Days</p>
          <p className="text-gray-900 font-semibold mt-0.5">{summary.peakHour}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Top Category · 30 Days</p>
          <p className="text-gray-900 font-semibold mt-0.5 truncate">{summary.highestCategory}</p>
        </div>
      </div>
    </div>
  )
}
