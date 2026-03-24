'use client'

import { Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'

function DeviceStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuthStore()
  const deviceId = searchParams.get('id')

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('No device ID provided')
      const response = await api.get(`/devices/${deviceId}`)
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
  })

  const { data: latestTelemetry, isLoading: telemetryLoading, error: telemetryError, refetch: refetchLatestTelemetry } = useQuery({
    queryKey: ['device-telemetry-latest', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('No device ID provided')
      try {
        const response = await api.get(`/devices/${deviceId}/telemetry/latest`)
        console.log('[DeviceStatus] Latest telemetry response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('[DeviceStatus] Error fetching latest telemetry:', error)
        // If 404 or no data, return null instead of throwing
        if (error.response?.status === 404 || error.response?.status === 204) {
          return null
        }
        throw error
      }
    },
    enabled: !!deviceId && isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1, // Only retry once
  })

  const { data: telemetryHistory, error: telemetryHistoryError, refetch: refetchTelemetryHistory } = useQuery({
    queryKey: ['device-telemetry-history', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('No device ID provided')
      try {
        const response = await api.get(`/devices/${deviceId}/telemetry`, {
          params: { limit: 100 },
        })
        console.log('[DeviceStatus] Telemetry history response:', response.data)
        return response.data || []
      } catch (error: any) {
        console.error('[DeviceStatus] Error fetching telemetry history:', error)
        // If 404 or no data, return empty array instead of throwing
        if (error.response?.status === 404 || error.response?.status === 204) {
          return []
        }
        throw error
      }
    },
    enabled: !!deviceId && isAuthenticated,
    retry: 1, // Only retry once
  })

  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for auth state to be ready before checking
    const timer = setTimeout(() => {
      setIsChecking(false)
      if (!isAuthenticated) {
        router.push('/')
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isAuthenticated, router])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (!deviceId) {
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
                <div className="text-center">
                  <p className="text-red-600">No device ID provided</p>
                  <button
                    onClick={() => router.push('/dashboard?tab=devices')}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Go Back to Devices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
                    onClick={async () => {
                      await Promise.all([
                        refetchLatestTelemetry(),
                        refetchTelemetryHistory()
                      ])
                    }}
                    disabled={telemetryLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {telemetryLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh Telemetry</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/devices/logs?id=${deviceId}`)}
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
                {telemetryLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : telemetryError ? (
                  <p className="text-red-500 text-sm">Error loading data</p>
                ) : latestTelemetry ? (
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
                  <p className="text-gray-500 text-sm">No telemetry data yet. Device will send data every 5 minutes.</p>
                )}
              </div>

              {/* Network Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Network</h3>
                {telemetryLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : telemetryError ? (
                  <p className="text-red-500 text-sm">Error loading data</p>
                ) : latestTelemetry ? (
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
                  <p className="text-gray-500 text-sm">No telemetry data yet. Device will send data every 5 minutes.</p>
                )}
              </div>

              {/* Stripe Terminal */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Stripe Terminal</h3>
                {telemetryLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : telemetryError ? (
                  <p className="text-red-500 text-sm">Error loading data</p>
                ) : latestTelemetry ? (
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
                  <p className="text-gray-500 text-sm">No telemetry data yet. Device will send data every 5 minutes.</p>
                )}
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">System Information</h3>
              {telemetryLoading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : telemetryError ? (
                <p className="text-red-500 text-sm">Error loading data</p>
              ) : latestTelemetry ? (
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
                          {Number(latestTelemetry.diskSpaceUsed || 0).toFixed(1)} / {Number(latestTelemetry.diskSpaceTotal || 0).toFixed(1)} GB
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Memory</div>
                        <div className="text-sm font-medium text-gray-900">
                          {latestTelemetry.memoryUsed ? Number(latestTelemetry.memoryUsed / 1024).toFixed(1) : '0'} / {latestTelemetry.memoryTotal ? Number(latestTelemetry.memoryTotal / 1024).toFixed(1) : '0'} GB
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No telemetry data yet. Device will send data every 5 minutes.</p>
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
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stripe Terminal</th>
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

export default function DeviceStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading device status...</p>
        </div>
      </div>
    }>
      <DeviceStatusContent />
    </Suspense>
  )
}

