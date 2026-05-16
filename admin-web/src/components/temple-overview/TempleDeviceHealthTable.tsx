'use client'

import { useRouter } from 'next/navigation'
import { WidgetEmptyState, WidgetSkeleton } from '@/components/ops-dashboard/WidgetShell'
import type { DeviceHealthRow } from '@/types/templeOverview'

interface TempleDeviceHealthTableProps {
  rows: DeviceHealthRow[]
  isLoading?: boolean
  isError?: boolean
}

function statusBadge(label: DeviceHealthRow['statusLabel']) {
  const map: Record<DeviceHealthRow['statusLabel'], string> = {
    Online: 'bg-emerald-50 text-emerald-700',
    Offline: 'bg-gray-100 text-gray-600',
    'Needs setup': 'bg-amber-50 text-amber-800',
    Warning: 'bg-orange-50 text-orange-700',
  }
  return map[label] ?? 'bg-gray-100 text-gray-600'
}

function readerLabel(status: DeviceHealthRow['readerStatus']) {
  if (status === 'connected') return 'Reader connected'
  if (status === 'disconnected') return 'Reader offline'
  if (status === 'unknown') return 'Reader unknown'
  return 'N/A'
}

export default function TempleDeviceHealthTable({
  rows,
  isLoading,
  isError,
}: TempleDeviceHealthTableProps) {
  const router = useRouter()

  if (isLoading) {
    return <WidgetSkeleton lines={5} height="min-h-[280px]" />
  }

  if (isError) {
    return (
      <div className="dashboard-card p-8 text-center text-sm text-gray-500">
        Unable to load kiosk health.
      </div>
    )
  }

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100/90 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Kiosk & device health</h3>
          <p className="text-xs text-gray-500 mt-0.5">Heartbeat and reader status</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard?tab=devices')}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          Devices tab
        </button>
      </div>
      {rows.length === 0 ? (
        <WidgetEmptyState
          title="No devices registered"
          description="Add a kiosk from the Devices tab to start accepting donations."
          icon="inbox"
        />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-3">Device</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Last heartbeat</th>
                  <th className="px-3 py-3">Last donation</th>
                  <th className="px-5 py-3">Stripe reader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-violet-50/30">
                    <td className="px-5 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${statusBadge(row.statusLabel)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{row.lastHeartbeatLabel}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{row.lastDonationLabel}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{readerLabel(row.readerStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{row.name}</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${statusBadge(row.statusLabel)}`}
                  >
                    {row.statusLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400 block">Heartbeat</span>
                    {row.lastHeartbeatLabel}
                  </div>
                  <div>
                    <span className="text-gray-400 block">Last gift</span>
                    {row.lastDonationLabel}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block">Reader</span>
                    {readerLabel(row.readerStatus)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
