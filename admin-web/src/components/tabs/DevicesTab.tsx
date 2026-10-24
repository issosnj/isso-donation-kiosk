'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import PageHeader, { headerPrimaryButtonClass, headerSecondaryButtonClass } from '@/components/layout/PageHeader'
import { DeviceStatusBadge, DeviceSummaryCards } from '@/components/devices'
import { useDevices } from '@/hooks/useDevices'
import type { DeviceListItem } from '@/types/device'

interface DevicesTabProps {
  templeId: string
  embedded?: boolean
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DevicesTab({ templeId, embedded = false }: DevicesTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [newDeviceLabel, setNewDeviceLabel] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: temple } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data as { name?: string }
    },
    enabled: !embedded,
  })

  const { devices, summary, isLoading, deactivate, reactivate, isDeactivating, isReactivating } =
    useDevices({ templeId })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['devices-all'] })
    queryClient.invalidateQueries({ queryKey: ['devices', templeId] })
    queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
  }

  const createDeviceMutation = useMutation({
    mutationFn: async (label: string) => {
      const response = await api.post('/devices', { templeId, label })
      return response.data
    },
    onSuccess: () => {
      refresh()
      setNewDeviceLabel('')
      setShowCreate(false)
    },
  })

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/devices/${id}`)
    },
    onSuccess: refresh,
  })

  const addButton = (
    <button
      type="button"
      onClick={() => setShowCreate((open) => !open)}
      className={showCreate ? headerSecondaryButtonClass : headerPrimaryButtonClass}
    >
      {showCreate ? 'Close' : 'Add device'}
    </button>
  )

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          eyebrow={temple?.name}
          title="Devices"
          description="Register kiosks, check heartbeat status, and open a device for setup."
          actions={addButton}
        />
      ) : (
        <div className="flex justify-end">{addButton}</div>
      )}

      <DeviceSummaryCards summary={summary} isLoading={isLoading} />

      {showCreate && (
        <form
          className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!newDeviceLabel.trim() || createDeviceMutation.isPending) return
            createDeviceMutation.mutate(newDeviceLabel.trim())
          }}
        >
          <h2 className="text-sm font-semibold text-gray-900">Register a kiosk</h2>
          <p className="mt-1 text-sm text-gray-500">
            Give the tablet a name you will recognize in the temple, such as Front Lobby.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newDeviceLabel}
              onChange={(e) => setNewDeviceLabel(e.target.value)}
              placeholder="Device label"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={!newDeviceLabel.trim() || createDeviceMutation.isPending}
              className={headerPrimaryButtonClass}
            >
              {createDeviceMutation.isPending ? 'Creating...' : 'Create device'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Kiosks</h2>
            <p className="text-xs text-gray-500 mt-0.5">Open a device to review setup, heartbeat, and logs.</p>
          </div>
          <span className="text-xs font-medium text-gray-500 tabular-nums">
            {isLoading ? '' : `${devices.length} registered`}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-16 rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">No devices yet</p>
            <p className="mt-1 text-sm text-gray-500">Add a kiosk to generate a device code for the tablet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                onOpen={() => router.push(`/devices/status?id=${device.id}`)}
                onDeactivate={() => {
                  if (confirm(`Deactivate device "${device.label}"? The device code can be reused on a new tablet.`)) {
                    deactivate(device.id)
                  }
                }}
                onReactivate={() => reactivate(device.id)}
                onDelete={() => {
                  if (confirm(`Delete device "${device.label}"? This action cannot be undone.`)) {
                    deleteDeviceMutation.mutate(device.id)
                  }
                }}
                busy={
                  isDeactivating ||
                  isReactivating ||
                  deleteDeviceMutation.isPending
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DeviceRow({
  device,
  onOpen,
  onDeactivate,
  onReactivate,
  onDelete,
  busy,
}: {
  device: DeviceListItem
  onOpen: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <li
      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-orange-50/40 lg:flex-row lg:items-center cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{device.label}</p>
          <p className="mt-0.5 font-mono text-xs text-gray-500">{device.deviceCode}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <DeviceStatusBadge status={device.operationalStatus} />
        <div className="min-w-[7rem] text-sm text-gray-600">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Last seen</p>
          <p className="font-medium text-gray-800">{formatRelativeTime(device.lastSeenAt)}</p>
        </div>
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
          >
            Open
          </button>
          {device.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={onReactivate}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}
