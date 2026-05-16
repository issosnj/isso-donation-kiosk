'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import type { Alert } from '@/components/alerts/types'
import type { DeviceListItem } from '@/types/device'

const DISMISSED_KEY = 'isso-alerts-dismissed'
const SNOOZED_KEY = 'isso-alerts-snoozed'
const SNOOZE_MS = 60 * 60 * 1000

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function readSnoozed(): Map<string, number> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = sessionStorage.getItem(SNOOZED_KEY)
    const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const now = Date.now()
    const map = new Map<string, number>()
    for (const [id, until] of Object.entries(obj)) {
      if (until > now) map.set(id, until)
    }
    return map
  } catch {
    return new Map()
  }
}

function persistDismissed(set: Set<string>) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)))
}

function persistSnoozed(map: Map<string, number>) {
  const obj: Record<string, number> = {}
  map.forEach((until, id) => {
    obj[id] = until
  })
  sessionStorage.setItem(SNOOZED_KEY, JSON.stringify(obj))
}

export function usePlatformAlerts(devices: DeviceListItem[]) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())
  const [snoozedUntil, setSnoozedUntil] = useState<Map<string, number>>(() => readSnoozed())

  useEffect(() => {
    const interval = setInterval(() => {
      setSnoozedUntil((prev) => {
        const now = Date.now()
        let changed = false
        const next = new Map(prev)
        prev.forEach((until, id) => {
          if (until <= now) {
            next.delete(id)
            changed = true
          }
        })
        if (changed) persistSnoozed(next)
        return changed ? next : prev
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const generated = useMemo((): Alert[] => {
    const alerts: Alert[] = []

    const offline = devices.filter((d) => d.operationalStatus === 'offline')
    if (offline.length > 0) {
      alerts.push({
        id: 'offline-kiosks',
        severity: 'critical',
        title: 'Kiosks offline',
        description: `${offline.length} device(s) have not reported in over 24 hours.`,
        count: offline.length,
        actions: [{ label: 'View devices', href: '?tab=devices', variant: 'primary' }],
        timestamp: new Date().toISOString(),
      })
    }

    const warning = devices.filter((d) => d.operationalStatus === 'warning')
    if (warning.length > 0) {
      alerts.push({
        id: 'stale-heartbeat',
        severity: 'warning',
        title: 'Needs attention',
        description: `${warning.length} kiosk(s) missed recent check-ins.`,
        count: warning.length,
        actions: [{ label: 'Review fleet', href: '?tab=devices', variant: 'secondary' }],
        timestamp: new Date().toISOString(),
      })
    }

    const pending = devices.filter((d) => d.operationalStatus === 'pending')
    if (pending.length > 0) {
      alerts.push({
        id: 'pending-setup',
        severity: 'info',
        title: 'Pending activation',
        description: `${pending.length} device(s) awaiting setup.`,
        count: pending.length,
        actions: [{ label: 'Complete setup', href: '?tab=devices', variant: 'secondary' }],
      })
    }

    const readerIssues = devices.filter((d) => d.readerConnected === false)
    if (readerIssues.length > 0) {
      alerts.push({
        id: 'reader-disconnected',
        severity: 'warning',
        title: 'Payment reader disconnected',
        description: `${readerIssues.length} terminal(s) report reader offline.`,
        count: readerIssues.length,
        templeName: readerIssues[0]?.templeName,
        actions: [{ label: 'Troubleshoot', href: '?tab=devices', variant: 'primary' }],
      })
    }

    return alerts
  }, [devices])

  const visible = useMemo(
    () =>
      generated.filter((a) => {
        if (dismissed.has(a.id)) return false
        const until = snoozedUntil.get(a.id)
        if (until != null && until > Date.now()) return false
        return true
      }),
    [generated, dismissed, snoozedUntil],
  )

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id)
      persistDismissed(next)
      return next
    })
  }, [])

  const snooze = useCallback((id: string) => {
    const until = Date.now() + SNOOZE_MS
    setSnoozedUntil((prev) => {
      const next = new Map(prev).set(id, until)
      persistSnoozed(next)
      return next
    })
  }, [])

  return { alerts: visible, allAlerts: generated, dismiss, snooze }
}
