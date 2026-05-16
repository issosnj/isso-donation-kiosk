'use client'

import { ReactNode } from 'react'

interface DashboardCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function DashboardCard({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
}: DashboardCardProps) {
  const base = `dashboard-card ${paddingMap[padding]} ${hover || onClick ? 'dashboard-card-hover' : ''} ${className}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} text-left w-full`}>
        {children}
      </button>
    )
  }

  return <div className={base}>{children}</div>
}
