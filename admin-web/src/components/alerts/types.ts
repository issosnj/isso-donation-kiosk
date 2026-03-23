export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AlertAction {
  label: string
  href?: string
  onClick?: () => void
  /** Special navigation handled by AlertCenter: opens temples tab and temple edit */
  actionType?: 'openTemple'
  variant?: 'primary' | 'secondary'
}

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  templeId?: string
  templeName?: string
  count?: number
  actions: AlertAction[]
  timestamp?: string
}

export interface AlertSummary {
  critical: number
  warning: number
  info: number
  total: number
}
