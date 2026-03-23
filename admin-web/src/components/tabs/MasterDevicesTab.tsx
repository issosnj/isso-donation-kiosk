'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useDevices } from '@/hooks/useDevices'
import { DeviceStatusBadge, DeviceSummaryCards } from '@/components/devices'
import type { DeviceListItem, DeviceOperationalStatus } from '@/types/device'

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MasterDevicesTab() {
  const router = useRouter()
  const [templeFilter, setTempleFilter] = useState<string>('')
  const [activationFilter, setActivationFilter] = useState<string>('')
  const [healthFilter, setHealthFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const res = await api.get('/temples')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { devices, summary, isLoading, deactivate, reactivate, isDeactivating, isReactivating } =
    useDevices({
      templeId: templeFilter || undefined,
      status: ['PENDING', 'ACTIVE', 'INACTIVE'].includes(activationFilter)
        ? activationFilter
        : undefined,
      operationalStatus: ['online', 'offline', 'warning', 'deactivated', 'pending'].includes(
        healthFilter
      )
        ? (healthFilter as DeviceOperationalStatus)
        : undefined,
    })

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return devices
    const q = searchQuery.toLowerCase()
    return devices.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.deviceCode.toLowerCase().includes(q) ||
        d.templeName.toLowerCase().includes(q)
    )
  }, [devices, searchQuery])

  const handleView = (d: DeviceListItem) => {
    router.push(`/devices/status?id=${d.id}`)
  }

  const handleTroubleshoot = (d: DeviceListItem) => {
    router.push(`/devices/logs?id=${d.id}`)
  }

  const handleDeactivate = (d: DeviceListItem) => {
    if (confirm(`Deactivate "${d.label}"? The device code can be reused on a new tablet.`)) {
      deactivate(d.id)
    }
  }

  const handleReactivate = (d: DeviceListItem) => {
    reactivate(d.id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Device Monitoring</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          Monitor kiosk health across all temples. View status, troubleshoot, and manage devices.
        </p>
      </div>

      <DeviceSummaryCards summary={summary} isLoading={isLoading} />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              placeholder="Search by device name, code, or temple..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <select
              value={templeFilter}
              onChange={(e) => setTempleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[180px]"
            >
              <option value="">All temples</option>
              {temples.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={activationFilter}
              onChange={(e) => setActivationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Activation: All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Health: All</option>
              <option value="online">Online</option>
              <option value="warning">Warning</option>
              <option value="offline">Offline</option>
              <option value="deactivated">Deactivated</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        ) : filteredBySearch.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No devices found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || templeFilter || activationFilter || healthFilter
                ? 'Try adjusting your filters or search.'
                : 'Devices will appear here once temples add kiosks.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Device / Temple
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Heartbeat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Token / Reader
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBySearch.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{d.label}</div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">
                          {d.deviceCode}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{d.templeName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DeviceStatusBadge status={d.operationalStatus} size="lg" />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatRelativeTime(d.lastSeenAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatRelativeTime(d.lastActivityAt ?? null)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <span>
                          {d.tokenStatus === 'valid'
                            ? 'Token: Valid'
                            : d.tokenStatus === 'none'
                              ? 'Token: —'
                              : 'Token: —'}
                        </span>
                        <div>
                          {d.readerConnected === true
                            ? 'Reader: Connected'
                            : d.readerConnected === false
                              ? 'Reader: Disconnected'
                              : 'Reader: —'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => handleView(d)}
                          className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleTroubleshoot(d)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                          Troubleshoot
                        </button>
                        {d.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleDeactivate(d)}
                            disabled={isDeactivating}
                            className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(d)}
                            disabled={isReactivating}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
