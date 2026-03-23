'use client'

import { useRouter } from 'next/navigation'
import type { Alert, AlertAction } from './types'

const severityStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
} as const

function SeverityIcon({ severity }: { severity: Alert['severity'] }) {
  const styles = severityStyles[severity]
  if (severity === 'critical') {
    return (
      <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  if (severity === 'warning') {
    return (
      <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return (
    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AlertCard({
  alert,
  onAction,
}: {
  alert: Alert
  onAction: (action: AlertAction, alert: Alert) => void
}) {
  const styles = severityStyles[alert.severity]
  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3`}
    >
      <div className="flex gap-3 min-w-0">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg} ${styles.border} border`}>
          <SeverityIcon severity={alert.severity} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
            {alert.count != null && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                {alert.count}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{alert.description}</p>
          {alert.templeName && (
            <p className="text-xs text-gray-500 mt-2">
              Affected: <span className="font-medium">{alert.templeName}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
        {alert.actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onAction(action, alert)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              action.variant === 'primary'
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface AlertCenterProps {
  alerts: Alert[]
  isLoading?: boolean
  emptyMessage?: string
}

export default function AlertCenter({ alerts, isLoading, emptyMessage = 'No alerts' }: AlertCenterProps) {
  const router = useRouter()

  const handleAction = (action: AlertAction, alert: Alert) => {
    if (action.onClick) {
      action.onClick()
      return
    }
    if (action.actionType === 'openTemple' && alert.templeId) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('openTempleId', alert.templeId)
      }
      router.push('/dashboard?tab=temples')
      return
    }
    if (action.href) {
      const path = action.href.startsWith('/') ? action.href : `/dashboard${action.href}`
      router.push(path)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Action Center</h2>
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!alerts.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Action Center</h2>
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  const critical = alerts.filter((a) => a.severity === 'critical')
  const warning = alerts.filter((a) => a.severity === 'warning')
  const info = alerts.filter((a) => a.severity === 'info')
  const ordered = [...critical, ...warning, ...info]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Action Center</h2>
        <span className="text-sm text-gray-500">{alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention</span>
      </div>
      <div className="grid gap-3">
        {ordered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onAction={handleAction} />
        ))}
      </div>
    </div>
  )
}
