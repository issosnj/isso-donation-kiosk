'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'

export default function DeviceStatusPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const deviceId = params.id as string

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}`)
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
  })

  const { data: latestTelemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ['device-telemetry-latest', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}/telemetry/latest`)
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: telemetryHistory } = useQuery({
    queryKey: ['device-telemetry-history', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}/telemetry`, {
        params: { limit: 100 },
      })
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
  }

  if (deviceLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          user={user}
          activeTab="devices"
          setActiveTab={(tab) => router.push(`/dashboard?tab=${tab}`)}
          onLogout={() => {
            router.push('/')
          }}
        />
        <div className="ml-64 min-h-screen">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        activeTab="devices"
        setActiveTab={(tab) => router.push(`/dashboard?tab=${tab}`)}
        onLogout={() => {
          router.push('/')
        }}
      />
      <div className="ml-64 min-h-screen">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(`/dashboard?tab=devices`)}
                className="text-purple-600 hover:text-purple-700 mb-2 text-sm font-medium"
              >
                ← Back to Devices
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Device Status</h1>
              <p className="text-sm text-gray-600 mt-1">
                {device?.label || 'Loading...'} - {device?.deviceCode}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/devices/${deviceId}/logs`)}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50"
              >
                View Logs
              </button>
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
            </div>

            {/* Status Cards */}
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

            {/* Telemetry History */}
            {telemetryHistory && telemetryHistory.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Telemetry History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Battery</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Square Hardware</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {telemetryHistory.slice(0, 20).map((telemetry: any) => (
                    <tr key={telemetry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(telemetry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {telemetry.batteryLevel ? Math.round(telemetry.batteryLevel) : 'N/A'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {telemetry.isConnected ? 'Connected' : 'Disconnected'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {telemetry.squareHardwareConnected ? 'Connected' : 'Not Connected'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

