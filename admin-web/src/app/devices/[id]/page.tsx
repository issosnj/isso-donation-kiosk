'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'

export default function DevicePage() {
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
              <h1 className="text-2xl font-bold text-gray-900">Device Overview</h1>
              <p className="text-sm text-gray-600 mt-1">
                {device?.label || 'Loading...'} - {device?.deviceCode}
              </p>
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
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Device Status Card */}
          <div 
            onClick={() => router.push(`/devices/${deviceId}/status`)}
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Device Status</h3>
                <p className="text-sm text-gray-600">View battery, network, hardware status, and system information</p>
              </div>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Device Logs Card */}
          <div 
            onClick={() => router.push(`/devices/${deviceId}/logs`)}
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Device Logs</h3>
                <p className="text-sm text-gray-600">View real-time logs, errors, and debug information</p>
              </div>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Device Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Device Code</div>
              <div className="text-sm font-medium text-gray-900 font-mono">{device?.deviceCode || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className="text-sm font-medium text-gray-900">{device?.status || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Last Seen</div>
              <div className="text-sm font-medium text-gray-900">
                {device?.lastSeenAt 
                  ? new Date(device.lastSeenAt).toLocaleString() 
                  : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Created</div>
              <div className="text-sm font-medium text-gray-900">
                {device?.createdAt 
                  ? new Date(device.createdAt).toLocaleString() 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

