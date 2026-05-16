'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow, isValid } from 'date-fns'
import LivePulse from './LivePulse'
import { WidgetHeader, WidgetSkeleton, WidgetEmptyState } from './WidgetShell'
import type { DeviceListItem, DeviceOperationalStatus } from '@/types/device'

type FleetStatusLabel = 'Online' | 'Offline' | 'Warning' | 'Needs Attention' | 'Pending' | 'Disabled'

const statusConfig: Record<
  DeviceOperationalStatus,
  { label: FleetStatusLabel; dot: string; badge: string }
> = {
  online: { label: 'Online', dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50' },
  warning: { label: 'Needs Attention', dot: 'bg-amber-500', badge: 'text-amber-700 bg-amber-50' },
  offline: { label: 'Offline', dot: 'bg-red-500', badge: 'text-red-700 bg-red-50' },
  pending: { label: 'Pending', dot: 'bg-gray-400', badge: 'text-gray-600 bg-gray-100' },
  deactivated: { label: 'Disabled', dot: 'bg-gray-300', badge: 'text-gray-500 bg-gray-100' },
}

function formatHeartbeat(date: string | null): string {
  if (!date) return 'Never'
  const d = new Date(date)
  if (!isValid(d)) return 'Never'
  return formatDistanceToNow(d, { addSuffix: true })
}

function DeviceCard({
  device: d,
  onDetails,
}: {
  device: DeviceListItem
  onDetails: (id: string) => void
}) {
  const cfg = statusConfig[d.operationalStatus]
  return (
    <div className="dashboard-card p-4 space-y-3 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{d.label}</p>
          <p className="text-xs text-gray-500 truncate">{d.templeName}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Heartbeat</dt>
          <dd className="text-gray-700 font-medium">{formatHeartbeat(d.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Last donation</dt>
          <dd className="text-gray-700 font-medium">{formatHeartbeat(d.lastActivityAt ?? null)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Reader</dt>
          <dd className="font-medium">
            {d.readerConnected === true ? (
              <span className="text-emerald-600">Connected</span>
            ) : d.readerConnected === false ? (
              <span className="text-red-600">Offline</span>
            ) : (
              <span className="text-gray-400">Unknown</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-400">App</dt>
          <dd className="text-gray-500 font-medium">—</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onDetails(d.id)}
        className="w-full py-2 text-xs font-semibold text-[#7C3AED] bg-violet-50 rounded-lg hover:bg-violet-100"
      >
        View details
      </button>
    </div>
  )
}

interface KioskFleetPanelProps {
  devices: DeviceListItem[]
  isLoading?: boolean
  isError?: boolean
}

export default function KioskFleetPanel({ devices, isLoading, isError }: KioskFleetPanelProps) {
  const router = useRouter()

  const needsAttention = devices.filter(
    (d) =>
      d.operationalStatus === 'warning' ||
      d.operationalStatus === 'offline' ||
      d.operationalStatus === 'pending',
  )
  const display = [...needsAttention, ...devices.filter((d) => d.operationalStatus === 'online')].slice(
    0,
    8,
  )

  const goDetails = (id: string) => {
    if (id) router.push(`/devices/status?id=${encodeURIComponent(id)}`)
  }

  if (isLoading) {
    return <WidgetSkeleton lines={4} height="min-h-[280px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card">
        <WidgetEmptyState title="Unable to load fleet" description="Check your connection and try again." icon="alert" />
      </div>
    )
  }

  return (
    <div className="dashboard-card overflow-hidden">
      <WidgetHeader
        title="Kiosk fleet health"
        subtitle={`${devices.length} devices · ${needsAttention.length} need attention`}
        action={
          <div className="flex items-center gap-2">
            <LivePulse />
            <button
              type="button"
              onClick={() => router.push('/dashboard?tab=devices')}
              className="text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
            >
              Fleet center →
            </button>
          </div>
        }
      />

      {display.length === 0 ? (
        <WidgetEmptyState
          title="No kiosks registered"
          description="Register a kiosk from Devices to start monitoring your fleet."
          icon="inbox"
        />
      ) : (
        <>
          <div className="md:hidden p-3 space-y-3">
            {display.map((d) => (
              <DeviceCard key={d.id} device={d} onDetails={goDetails} />
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2.5 font-semibold">Device</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Heartbeat</th>
                  <th className="px-3 py-2.5 font-semibold">Reader</th>
                  <th className="px-3 py-2.5 font-semibold">Last donation</th>
                  <th className="px-3 py-2.5 font-semibold">App version</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {display.map((d) => {
                  const cfg = statusConfig[d.operationalStatus]
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{d.label}</p>
                        <p className="text-xs text-gray-500">{d.templeName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 tabular-nums">
                        {formatHeartbeat(d.lastSeenAt)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {d.readerConnected === true ? (
                          <span className="text-emerald-600 font-medium">Connected</span>
                        ) : d.readerConnected === false ? (
                          <span className="text-red-600 font-medium">Offline</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {formatHeartbeat(d.lastActivityAt ?? null)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">—</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => goDetails(d.id)}
                          className="text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
