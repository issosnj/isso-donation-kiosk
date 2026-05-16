'use client'

import { useEffect, useRef } from 'react'
import { WidgetHeader, WidgetSkeleton } from './WidgetShell'
import { formatCount, formatPercent, safeNumber } from '@/lib/formatters'

export interface HealthMetric {
  id: string
  label: string
  value: number
  unit: '%' | 'ms' | ''
  status: 'healthy' | 'warning' | 'critical'
}

interface SystemHealthPanelProps {
  metrics: HealthMetric[]
  isLoading?: boolean
}

const statusColors = {
  healthy: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  warning: 'text-amber-700 bg-amber-50 border-amber-100',
  critical: 'text-red-700 bg-red-50 border-red-100',
}

function formatMetricValue(value: number, unit: HealthMetric['unit']): string {
  const n = safeNumber(value)
  if (unit === '%') return formatPercent(n, 1)
  if (unit === 'ms') return `${formatCount(n)}ms`
  return formatCount(n)
}

export default function SystemHealthPanel({ metrics, isLoading }: SystemHealthPanelProps) {
  const lastWarnedMetricsRef = useRef<unknown>(null)

  useEffect(() => {
    if (Array.isArray(metrics)) {
      lastWarnedMetricsRef.current = null
      return
    }
    if (lastWarnedMetricsRef.current === metrics) return
    lastWarnedMetricsRef.current = metrics
    console.warn('[SystemHealthPanel] Expected metrics to be an array', {
      component: 'SystemHealthPanel',
      metrics,
      metricsType: typeof metrics,
    })
  }, [metrics])

  if (isLoading) {
    return <WidgetSkeleton lines={6} height="min-h-[220px]" />
  }

  const rows = Array.isArray(metrics) ? metrics : []

  return (
    <div className="dashboard-card h-full flex flex-col min-h-[220px]">
      <WidgetHeader title="System health" subtitle="Platform operational metrics" />
      <div className="p-4 grid grid-cols-2 gap-3 flex-1">
        {rows.length === 0 ? (
          <p className="col-span-2 text-sm text-gray-500 text-center py-6">No metrics available</p>
        ) : (
          rows.map((m) => (
            <div
              key={m.id}
              className="rounded-xl bg-gray-50/80 p-3 border border-gray-100/80 hover:border-violet-100 transition-colors"
            >
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide line-clamp-2">
                {m.label}
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                {formatMetricValue(m.value, m.unit)}
              </p>
              <span
                className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColors[m.status]}`}
              >
                {m.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
