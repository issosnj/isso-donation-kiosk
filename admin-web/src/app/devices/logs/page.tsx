'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'

function DeviceLogsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuthStore()
  const deviceId = searchParams.get('id')
  const [logFilter, setLogFilter] = useState<string>('all')
  const [logSearch, setLogSearch] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('No device ID provided')
      const response = await api.get(`/devices/${deviceId}`)
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
  })

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs, isFetching } = useQuery({
    queryKey: ['device-logs', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('No device ID provided')
      const response = await api.get(`/devices/${deviceId}/logs`, {
        params: { limit: 1000 },
      })
      return response.data
    },
    enabled: !!deviceId && isAuthenticated,
    refetchInterval: 2000, // Refresh every 2 seconds for live updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const filteredLogs = logs?.filter((log: any) => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter
    const matchesSearch = !logSearch || 
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.category.toLowerCase().includes(logSearch.toLowerCase())
    return matchesFilter && matchesSearch
  }) || []

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current && filteredLogs.length > 0) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  // Check if user has scrolled up (disable auto-scroll)
  useEffect(() => {
    const container = logsContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50
      setAutoScroll(isAtBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

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
                    onClick={async () => {
                      await refetchLogs()
                    }}
                    disabled={isFetching}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isFetching ? (
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
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className={`h-2 w-2 rounded-full ${isFetching ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`}></div>
                      <span className="text-xs text-gray-600">Live</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/devices/status?id=${deviceId}`)}
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
                <div 
                  ref={logsContainerRef}
                  className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded max-h-[600px] overflow-y-auto"
                >
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
                  <div ref={logsEndRef} />
                  {!autoScroll && (
                    <div className="sticky bottom-0 flex justify-end pt-2">
                      <button
                        onClick={() => {
                          setAutoScroll(true)
                          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        ↓ Scroll to Bottom
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No logs available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeviceLogsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading device logs...</p>
        </div>
      </div>
    }>
      <DeviceLogsContent />
    </Suspense>
  )
}

