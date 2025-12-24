'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

interface DeviceDetailsTabProps {
  deviceId: string
  onBack: () => void
}

export default function DeviceDetailsTab({ deviceId, onBack }: DeviceDetailsTabProps) {
  const router = useRouter()
  const [logFilter, setLogFilter] = useState<string>('all')
  const [logSearch, setLogSearch] = useState<string>('')

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}`)
      return response.data
    },
  })

  const { data: latestTelemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ['device-telemetry-latest', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}/telemetry/latest`)
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['device-logs', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}/logs`, {
        params: { limit: 1000 },
      })
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const filteredLogs = logs?.filter((log: any) => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter
    const matchesSearch = !logSearch || 
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.category.toLowerCase().includes(logSearch.toLowerCase())
    return matchesFilter && matchesSearch
  }) || []

  if (deviceLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => {
              // Remove deviceId from URL and reload
              const url = new URL(window.location.href)
              url.searchParams.delete('deviceId')
              window.history.pushState({}, '', url.toString())
              window.location.reload()
            }}
            className="text-purple-600 hover:text-purple-700 mb-2 text-sm font-medium"
          >
            ← Back to Devices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{device?.label || 'Device Details'}</h1>
          <p className="text-sm text-gray-600 mt-1">Device Code: {device?.deviceCode}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            device?.status === 'ACTIVE' 
              ? 'bg-green-100 text-green-700 border-green-200' 
              : device?.status === 'PENDING' 
              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
              : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
            {device?.status}
          </span>
        </div>
      </div>

      {/* Device Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Battery Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Battery</h3>
          {latestTelemetry ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {latestTelemetry.batteryLevel ? Math.round(latestTelemetry.batteryLevel) : 'N/A'}%
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  latestTelemetry.isCharging 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {latestTelemetry.isCharging ? 'Charging' : latestTelemetry.batteryState || 'Unknown'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Network Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Network</h3>
          {latestTelemetry ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  latestTelemetry.isConnected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {latestTelemetry.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {latestTelemetry.networkType ? latestTelemetry.networkType.toUpperCase() : 'Unknown'}
              </div>
              {latestTelemetry.networkSSID && (
                <div className="text-xs text-gray-500">
                  {latestTelemetry.networkSSID}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>

        {/* Square Hardware */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Square Hardware</h3>
          {latestTelemetry ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  latestTelemetry.squareHardwareConnected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {latestTelemetry.squareHardwareConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {latestTelemetry.squareHardwareModel && (
                <div className="text-xs text-gray-600">
                  {latestTelemetry.squareHardwareModel}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">System Information</h3>
        {latestTelemetry ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Device Model</div>
              <div className="text-sm font-medium text-gray-900">{latestTelemetry.deviceModel || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">OS Version</div>
              <div className="text-sm font-medium text-gray-900">{latestTelemetry.osVersion || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">App Version</div>
              <div className="text-sm font-medium text-gray-900">{latestTelemetry.appVersion || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Last Updated</div>
              <div className="text-sm font-medium text-gray-900">
                {latestTelemetry.createdAt 
                  ? new Date(latestTelemetry.createdAt).toLocaleString() 
                  : 'N/A'}
              </div>
            </div>
            {latestTelemetry.diskSpaceTotal && (
              <>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Disk Space</div>
                  <div className="text-sm font-medium text-gray-900">
                    {latestTelemetry.diskSpaceUsed?.toFixed(1) || '0'} / {latestTelemetry.diskSpaceTotal.toFixed(1)} GB
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Memory</div>
                  <div className="text-sm font-medium text-gray-900">
                    {latestTelemetry.memoryUsed ? (latestTelemetry.memoryUsed / 1024).toFixed(1) : '0'} / {latestTelemetry.memoryTotal ? (latestTelemetry.memoryTotal / 1024).toFixed(1) : '0'} GB
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No system information available</p>
        )}
      </div>

      {/* Device Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Device Logs</h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {logsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded max-h-96 overflow-y-auto">
            {filteredLogs.map((log: any, index: number) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={`ml-2 ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warning' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  [{log.category}] {log.message}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No logs available</p>
        )}
      </div>
    </div>
  )
}

