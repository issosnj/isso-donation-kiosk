'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import ReceiptTab from './ReceiptTab'

export default function MasterReceiptsTab() {
  const [selectedTempleId, setSelectedTempleId] = useState<string | null>(null)

  const { data: temples, isLoading, error } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      const data = response.data
      if (Array.isArray(data)) {
        return data
      } else if (data && typeof data === 'object') {
        return [data]
      }
      return []
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load temples. Please try again.
      </div>
    )
  }

  // If a temple is selected, show the receipt configuration for that temple
  if (selectedTempleId) {
    return (
      <div>
        <button
          onClick={() => setSelectedTempleId(null)}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors flex items-center space-x-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Temples</span>
        </button>
        <ReceiptTab templeId={selectedTempleId} isMasterAdmin={true} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Receipt Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">Manage receipt settings and Gmail connections for all temples</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Temple</h3>
          {temples && temples.length === 0 ? (
            <p className="text-gray-500">No temples found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {temples?.map((temple: any) => (
                <button
                  key={temple.id}
                  onClick={() => setSelectedTempleId(temple.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{temple.name}</h4>
                    {temple.gmailEmail && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Gmail Connected
                      </span>
                    )}
                  </div>
                  {temple.address && (
                    <p className="text-sm text-gray-600 truncate">{temple.address}</p>
                  )}
                  {temple.gmailEmail && (
                    <p className="text-xs text-gray-500 mt-1">Email: {temple.gmailEmail}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

