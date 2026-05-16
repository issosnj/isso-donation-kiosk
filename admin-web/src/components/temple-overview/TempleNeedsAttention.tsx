'use client'

import { useRouter } from 'next/navigation'
import { WidgetEmptyState, WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import type { TempleDashboardAlert } from '@/types/templeOverview'

interface TempleNeedsAttentionProps {
  alerts: TempleDashboardAlert[]
  isLoading?: boolean
}

function severityStyles(severity: TempleDashboardAlert['severity']) {
  if (severity === 'critical') return 'border-red-200/80 bg-red-50/80'
  if (severity === 'warning') return 'border-amber-200/80 bg-amber-50/60'
  return 'border-violet-200/60 bg-violet-50/40'
}

function severityDot(severity: TempleDashboardAlert['severity']) {
  if (severity === 'critical') return 'bg-red-500'
  if (severity === 'warning') return 'bg-amber-500'
  return 'bg-violet-500'
}

export default function TempleNeedsAttention({ alerts, isLoading }: TempleNeedsAttentionProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={4} height="min-h-[220px]" />
  }

  return (
    <div className="dashboard-card overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100/90">
        <h3 className="text-sm font-semibold text-gray-900">Needs attention</h3>
        <p className="text-xs text-gray-500 mt-0.5">Action center</p>
      </div>
      <div className="p-4 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <WidgetEmptyState
            title="Everything looks good"
            description="No critical issues detected across payments, kiosks, or receipts."
            icon="check"
          />
        ) : (
          alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => router.push(`/dashboard?tab=${alert.tab}`)}
              className={`w-full text-left rounded-xl border px-3 py-3 transition-colors hover:shadow-sm ${severityStyles(alert.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDot(alert.severity)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
