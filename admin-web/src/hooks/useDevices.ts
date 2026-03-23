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

export function useDevices(filters?: { templeId?: string; status?: string; operationalStatus?: string }) {
  const queryClient = useQueryClient()

  const { data: devices = [], isLoading, isError: devicesError } = useQuery({
    queryKey: ['devices-all', filters?.templeId, filters?.status, filters?.operationalStatus],
    queryFn: async (): Promise<DeviceListItem[]> => {
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
    isError: devicesError,
    deactivate: deactivateMutation.mutate,
    reactivate: reactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,
    isReactivating: reactivateMutation.isPending,
  }
}
