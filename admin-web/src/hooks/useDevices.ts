'use client'

/**
 * useDevices - Master Admin device list with filters and mutations.
 *
 * Backend: GET /devices (no templeId = all devices for Master Admin)
 * Optional: templeId query param to filter by temple.
 *
 * Future backend enhancements to consider:
 * - lastActivityAt: last donation timestamp (join/aggregate from donations)
 * - readerConnected: from latest device_telemetry.squareHardwareConnected (batch endpoint)
 * - tokenStatus: derived from deviceToken + expiry if stored
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DeviceListItem, DeviceOperationalStatus, DeviceSummary } from '@/types/device'

const HEARTBEAT_WARN_MINUTES = 30
const HEARTBEAT_OFFLINE_MINUTES = 1440 // 24h

function deriveOperationalStatus(
  status: string,
  lastSeenAt: string | null
): DeviceOperationalStatus {
  if (status === 'INACTIVE') return 'deactivated'
  if (status === 'PENDING') return 'pending'

  if (!lastSeenAt) return 'offline'

  const last = new Date(lastSeenAt).getTime()
  const now = Date.now()
  const minutesAgo = (now - last) / (60 * 1000)

  if (minutesAgo <= HEARTBEAT_WARN_MINUTES) return 'online'
  if (minutesAgo <= HEARTBEAT_OFFLINE_MINUTES) return 'warning'
  return 'offline'
}

function mapApiDevice(d: any): DeviceListItem {
  const operationalStatus = deriveOperationalStatus(d.status, d.lastSeenAt)
  return {
    id: d.id,
    label: d.label || 'Unnamed',
    deviceCode: d.deviceCode,
    templeId: d.templeId,
    templeName: d.temple?.name || 'Unknown',
    status: d.status,
    operationalStatus,
    lastSeenAt: d.lastSeenAt || null,
    lastActivityAt: d.lastActivityAt ?? d.lastSeenAt ?? null,
    tokenStatus: d.status === 'ACTIVE' && d.deviceToken ? 'valid' : d.status === 'PENDING' ? 'none' : 'none',
    readerConnected: d.readerConnected ?? null,
    activatedAt: d.activatedAt ?? null,
    createdAt: d.createdAt,
  }
}

function computeSummary(devices: DeviceListItem[]): DeviceSummary {
  const online = devices.filter((d) => d.operationalStatus === 'online').length
  const offline = devices.filter((d) => d.operationalStatus === 'offline').length
  const needingAttention = devices.filter(
    (d) =>
      d.operationalStatus === 'warning' ||
      d.operationalStatus === 'offline' ||
      d.operationalStatus === 'pending'
  ).length
  return {
    total: devices.length,
    online,
    offline,
    needingAttention,
  }
}

// ============================================================================
// MOCK DATA - Set window.__DEVICES_USE_MOCK__ = true to use mock (e.g. when API unavailable)
// ============================================================================
const USE_MOCK =
  typeof window !== 'undefined' &&
  (window as any).__DEVICES_USE_MOCK__ === true

const MOCK_DEVICES: DeviceListItem[] = [
  {
    id: 'mock-1',
    label: 'Front Lobby Kiosk',
    deviceCode: 'ABC123',
    templeId: 't1',
    templeName: 'ISSO NJ Temple',
    status: 'ACTIVE',
    operationalStatus: 'online',
    lastSeenAt: new Date().toISOString(),
    lastActivityAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    tokenStatus: 'valid',
    readerConnected: true,
    activatedAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'mock-2',
    label: 'Back Hall Kiosk',
    deviceCode: 'DEF456',
    templeId: 't1',
    templeName: 'ISSO NJ Temple',
    status: 'ACTIVE',
    operationalStatus: 'warning',
    lastSeenAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    tokenStatus: 'valid',
    readerConnected: false,
    activatedAt: '2024-01-20T12:00:00Z',
    createdAt: '2024-01-18T09:00:00Z',
  },
  {
    id: 'mock-3',
    label: 'Main Kiosk',
    deviceCode: 'GHI789',
    templeId: 't2',
    templeName: 'ISSO Houston',
    status: 'ACTIVE',
    operationalStatus: 'offline',
    lastSeenAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    lastActivityAt: null,
    tokenStatus: 'valid',
    readerConnected: null,
    activatedAt: '2024-02-01T09:00:00Z',
    createdAt: '2024-01-28T14:00:00Z',
  },
  {
    id: 'mock-4',
    label: 'Lobby Tablet',
    deviceCode: 'JKL012',
    templeId: 't2',
    templeName: 'ISSO Houston',
    status: 'PENDING',
    operationalStatus: 'pending',
    lastSeenAt: null,
    lastActivityAt: null,
    tokenStatus: 'none',
    readerConnected: null,
    activatedAt: null,
    createdAt: '2024-03-01T11:00:00Z',
  },
  {
    id: 'mock-5',
    label: 'Donation Kiosk',
    deviceCode: 'MNO345',
    templeId: 't3',
    templeName: 'ISSO Chicago',
    status: 'INACTIVE',
    operationalStatus: 'deactivated',
    lastSeenAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivityAt: null,
    tokenStatus: 'none',
    readerConnected: null,
    activatedAt: null,
    createdAt: '2024-02-15T10:00:00Z',
  },
]

export function useDevices(filters?: { templeId?: string; status?: string; operationalStatus?: string }) {
  const queryClient = useQueryClient()

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices-all', filters?.templeId, filters?.status, filters?.operationalStatus],
    queryFn: async (): Promise<DeviceListItem[]> => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 400))
        return [...MOCK_DEVICES]
      }
      const response = await api.get('/devices', {
        params: {
          ...(filters?.templeId && { templeId: filters.templeId }),
        },
      })
      const raw = Array.isArray(response.data) ? response.data : []
      return raw.map(mapApiDevice)
    },
    staleTime: 30 * 1000,
  })

  const filtered = devices.filter((d) => {
    if (filters?.templeId && d.templeId !== filters.templeId) return false
    if (filters?.status && d.status !== filters.status) return false
    if (filters?.operationalStatus && d.operationalStatus !== filters.operationalStatus) return false
    return true
  })

  const summary = computeSummary(filtered)

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/devices/${id}/deactivate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices-all'] })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/devices/${id}/reactivate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices-all'] })
    },
  })

  return {
    devices: filtered,
    summary,
    isLoading,
    deactivate: deactivateMutation.mutate,
    reactivate: reactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,
    isReactivating: reactivateMutation.isPending,
  }
}
