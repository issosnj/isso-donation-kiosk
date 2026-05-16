'use client'

import { ReactNode } from 'react'

interface WidgetHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function WidgetHeader({ title, subtitle, action }: WidgetHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-100/90 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function WidgetSkeleton({
  className = '',
  lines = 4,
  height = 'min-h-[220px]',
}: {
  className?: string
  lines?: number
  height?: string
}) {
  return (
    <div className={`dashboard-card p-5 animate-pulse ${height} ${className}`}>
      <div className="h-4 bg-gray-200/80 rounded-lg w-36 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100/90 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function WidgetEmptyState({
  title,
  description,
  icon = 'check',
}: {
  title: string
  description?: string
  icon?: 'check' | 'inbox' | 'alert'
}) {
  const iconBg =
    icon === 'alert'
      ? 'bg-amber-100 text-amber-600'
      : icon === 'inbox'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-emerald-100 text-emerald-600'

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${iconBg}`}>
        {icon === 'check' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : icon === 'alert' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
