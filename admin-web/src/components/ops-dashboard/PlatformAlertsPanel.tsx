'use client'

import type { Alert } from '@/components/alerts/types'
import { WidgetHeader, WidgetSkeleton, WidgetEmptyState } from './WidgetShell'

interface PlatformAlertsPanelProps {
  alerts: Alert[]
  onDismiss: (id: string) => void
  onSnooze: (id: string) => void
  filter: 'all' | 'critical' | 'warning' | 'info'
  onFilterChange: (f: 'all' | 'critical' | 'warning' | 'info') => void
  isLoading?: boolean
}

const severityStyles = {
  critical: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    border: 'border-l-red-500',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-l-amber-500',
  },
  info: {
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    border: 'border-l-violet-500',
  },
} as const

export default function PlatformAlertsPanel({
  alerts,
  onDismiss,
  onSnooze,
  filter,
  onFilterChange,
  isLoading,
}: PlatformAlertsPanelProps) {
  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  if (isLoading) {
    return <WidgetSkeleton lines={3} height="min-h-[220px]" />
  }

  return (
    <div id="alert-center" className="dashboard-card h-full flex flex-col min-h-[220px] scroll-mt-24">
      <WidgetHeader
        title="Alert center"
        subtitle={filtered.length === 0 ? 'No active alerts' : `${filtered.length} active`}
        action={
          <div className="flex flex-wrap gap-1">
            {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-lg capitalize transition-colors ${
                  filter === f
                    ? 'bg-violet-100 text-[#7C3AED]'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px] custom-scrollbar">
        {filtered.length === 0 ? (
          <WidgetEmptyState title="No active alerts" description="You're all caught up." icon="check" />
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border border-gray-100 bg-gray-50/50 p-3 border-l-4 ${severityStyles[alert.severity].border} hover:border-violet-200 transition-colors`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${severityStyles[alert.severity].badge}`}
                    >
                      {alert.severity}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                    {alert.count != null && (
                      <span className="text-[10px] font-bold text-gray-500">×{alert.count}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{alert.description}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSnooze(alert.id)}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    Snooze 1h
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(alert.id)}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
