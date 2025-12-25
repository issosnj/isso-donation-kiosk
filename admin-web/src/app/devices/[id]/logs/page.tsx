'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'

export default function DeviceLogsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const deviceId = params.id as string
  const [logFilter, setLogFilter] = useState<string>('all')
  const [logSearch, setLogSearch] = useState<string>('')

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}`)
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['device-logs', deviceId],
    queryFn: async () => {
      const response = await api.get(`/devices/${deviceId}/logs`, {
        params: { limit: 1000 },
      })
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const filteredLogs = logs?.filter((log: any) => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter
    const matchesSearch = !logSearch || 
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.category.toLowerCase().includes(logSearch.toLowerCase())
    return matchesFilter && matchesSearch
  }) || []

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
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
              <h1 className="text-2xl font-bold text-gray-900">Device Logs</h1>
              <p className="text-sm text-gray-600 mt-1">
                {device?.label || 'Loading...'} - {device?.deviceCode}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/devices/${deviceId}/status`)}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50"
              >
                View Status
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

        {/* Logs Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Device Logs</h2>
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
            <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded max-h-[600px] overflow-y-auto">
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
      </div>
    </div>
  )
}

