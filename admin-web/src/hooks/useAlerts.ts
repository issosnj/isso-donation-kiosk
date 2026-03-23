'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Alert, AlertSummary } from '@/components/alerts/types'

// Mock data for when API is not yet available
const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Pending donations stuck',
    description: '3 donations have been in pending state for over 24 hours and may need manual review.',
    templeName: 'ISSO NJ Temple',
    templeId: 'mock-temple-1',
    count: 3,
    actions: [
      { label: 'Review', href: '/dashboard?tab=donations', variant: 'primary' },
    ],
  },
  {
    id: '2',
    severity: 'critical',
    title: 'Device offline',
    description: 'Kiosk has not sent a heartbeat in over 30 minutes.',
    templeName: 'ISSO Houston',
    templeId: 'mock-temple-2',
    count: 1,
    actions: [
      { label: 'View Device', href: '/devices/status', variant: 'primary' },
      { label: 'Open Temple', actionType: 'openTemple' },
    ],
  },
  {
    id: '3',
    severity: 'warning',
    title: 'Stripe not connected',
    description: 'Temple cannot process payments until Stripe is configured.',
    templeName: 'ISSO Chicago',
    templeId: 'mock-temple-3',
    count: 1,
    actions: [
      { label: 'Fix Now', href: '/dashboard?tab=temples', variant: 'primary' },
    ],
  },
  {
    id: '4',
    severity: 'warning',
    title: 'Gmail not connected for receipts',
    description: 'Email receipts cannot be sent until Gmail OAuth is configured.',
    templeName: 'ISSO NJ Temple',
    templeId: 'mock-temple-1',
    count: 1,
    actions: [
      { label: 'Configure', href: '/dashboard?tab=temples', variant: 'primary' },
    ],
  },
  {
    id: '5',
    severity: 'info',
    title: 'Missing receipt configuration',
    description: '2 temples have incomplete receipt settings. Receipts may not display correctly.',
    count: 2,
    actions: [
      { label: 'Review', href: '/dashboard?tab=receipts', variant: 'primary' },
    ],
  },
]

function computeSummary(alerts: Alert[]): AlertSummary {
  const critical = alerts.filter((a) => a.severity === 'critical').length
  const warning = alerts.filter((a) => a.severity === 'warning').length
  const info = alerts.filter((a) => a.severity === 'info').length
  return {
    critical,
    warning,
    info,
    total: alerts.length,
  }
}

// TODO: Replace with real API when backend endpoint is ready
// const ALERTS_API_ENABLED = false

export function useAlerts() {
  const { data: alerts = MOCK_ALERTS, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async (): Promise<Alert[]> => {
      // When API is ready, uncomment:
      // const response = await api.get('/alerts')
      // return response.data
      await new Promise((r) => setTimeout(r, 300))
      return MOCK_ALERTS
    },
    staleTime: 60 * 1000, // 1 minute
  })

  const summary = computeSummary(alerts)

  return {
    alerts,
    summary,
    isLoading,
  }
}
