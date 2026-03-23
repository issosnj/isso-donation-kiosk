'use client'

import type { Alert, AlertSummary } from '@/components/alerts/types'

const EMPTY_SUMMARY: AlertSummary = {
  critical: 0,
  warning: 0,
  info: 0,
  total: 0,
}

/**
 * Returns operational alerts. No backend endpoint exists yet — returns empty.
 * Wire to GET /api/alerts when backend is ready.
 */
export function useAlerts() {
  return {
    alerts: [] as Alert[],
    summary: EMPTY_SUMMARY,
    isLoading: false,
  }
}
