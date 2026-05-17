'use client'

import { useMemo } from 'react'
import { formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { formatCurrency, safeNumber } from '@/lib/formatters'
import type { Donation } from '@/types/donation'
import type { DeviceListItem } from '@/types/device'

export const IDLE_EVENT_ID = 'idle'

export type ActivitySeverity = 'success' | 'warning' | 'error' | 'info'

export interface ActivityEvent {
  id: string
  type: string
  title: string
  actor: string
  temple?: string
  severity: ActivitySeverity
  timestamp: Date
}

const severityStyles: Record<ActivitySeverity, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-violet-50 text-violet-700 border-violet-100',
}

export function activitySeverityClass(s: ActivitySeverity) {
  return severityStyles[s]
}

function parseEventDate(iso: string): Date {
  try {
    const d = parseISO(iso)
    return isValid(d) ? d : new Date()
  } catch {
    return new Date()
  }
}

export function activityTypeIcon(type: string): 'donation' | 'device' | 'payment' | 'system' {
  if (type === 'donation') return 'donation'
  if (type.startsWith('kiosk') || type === 'device') return 'device'
  if (type === 'payment_failed') return 'payment'
  return 'system'
}

const SUCCESS_STATUSES = new Set(['SUCCEEDED', 'COMPLETED'])

export function useLiveActivity(
  devices: DeviceListItem[],
  recentDonations: Donation[],
  options?: { failedCount?: number },
) {
  return useMemo(() => {
    const events: ActivityEvent[] = []
    const seen = new Set<string>()
    const now = new Date()

    const add = (event: ActivityEvent) => {
      if (seen.has(event.id)) return
      seen.add(event.id)
      events.push(event)
    }

    const donations = [...(recentDonations ?? [])]
      .filter((d) => SUCCESS_STATUSES.has(String(d.status).toUpperCase()))
      .sort((a, b) => parseEventDate(b.createdAt).getTime() - parseEventDate(a.createdAt).getTime())
      .slice(0, 10)

    donations.forEach((d) => {
      const anonymous = d.submittedAsAnonymous || !d.donorName?.trim()
      add({
        id: `donation-${d.id}`,
        type: 'donation',
        title: `Donation · ${formatCurrency(d.amount)}`,
        actor: anonymous ? 'Anonymous donor' : (d.donorName?.trim() ?? 'Donor'),
        temple: d.temple?.name,
        severity: 'success',
        timestamp: parseEventDate(d.createdAt),
      })
    })

    devices
      .filter((d) => d.operationalStatus === 'offline' || d.operationalStatus === 'warning')
      .slice(0, 5)
      .forEach((d) => {
        add({
          id: `device-${d.id}-${d.operationalStatus}`,
          type: d.operationalStatus === 'offline' ? 'kiosk_offline' : 'kiosk_warning',
          title:
            d.operationalStatus === 'offline'
              ? `Kiosk offline · ${d.label}`
              : `Needs attention · ${d.label}`,
          actor: 'Fleet monitor',
          temple: d.templeName,
          severity: d.operationalStatus === 'offline' ? 'error' : 'warning',
          timestamp: d.lastSeenAt ? parseEventDate(d.lastSeenAt) : now,
        })
      })

    const failed = safeNumber(options?.failedCount)
    if (failed > 0) {
      add({
        id: 'failed-tx-summary',
        type: 'payment_failed',
        title: `${failed} failed transaction${failed !== 1 ? 's' : ''} (last 30 days)`,
        actor: 'Payments',
        severity: 'error',
        timestamp: now,
      })
    }

    if (events.length === 0) {
      add({
        id: IDLE_EVENT_ID,
        type: 'system',
        title: 'No recent activity',
        actor: 'Platform',
        severity: 'info',
        timestamp: now,
      })
    }

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 12)
      .map((e) => ({
        ...e,
        timeAgo: formatDistanceToNow(e.timestamp, { addSuffix: true }),
      }))
  }, [devices, recentDonations, options?.failedCount])
}
