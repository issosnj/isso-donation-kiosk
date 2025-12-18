'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

export default function TemplesTab() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTempleName, setNewTempleName] = useState('')
  const [newTempleAddress, setNewTempleAddress] = useState('')
  const queryClient = useQueryClient()

  const { data: temples, isLoading, error } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      console.log('[Temples Query] Fetching temples...')
      const response = await api.get('/temples')
      console.log('[Temples Query] Response:', response)
      console.log('[Temples Query] Data:', response.data)
      console.log('[Temples Query] Data type:', typeof response.data)
      console.log('[Temples Query] Is array:', Array.isArray(response.data))
      return response.data
    },
  })

  const createTempleMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      console.log('[Temple Creation] Starting mutation with data:', data)
      try {
        const response = await api.post('/temples', data)
        console.log('[Temple Creation] Success:', response.data)
        return response.data
      } catch (error: any) {
        console.error('[Temple Creation] Error:', error)
        console.error('[Temple Creation] Error response:', error.response)
        console.error('[Temple Creation] Error message:', error.message)
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate and refetch temples list to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['temples'] })

      setShowCreateForm(false)
      setNewTempleName('')
      setNewTempleAddress('')
    },
    onError: (error: any) => {
      console.error('[Temple Creation] onError called:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create temple'
      alert(`Error creating temple: ${errorMessage}`)
    },
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Temples</h2>
          <p className="text-sm text-gray-600 mt-1">Manage all temples in the system</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center space-x-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{showCreateForm ? 'Cancel' : 'Add Temple'}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Temple</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temple Name *
              </label>
              <input
                type="text"
                value={newTempleName}
                onChange={(e) => setNewTempleName(e.target.value)}
                placeholder="Enter temple name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={newTempleAddress}
                onChange={(e) => setNewTempleAddress(e.target.value)}
                placeholder="Enter temple address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={() => createTempleMutation.mutate({
                name: newTempleName,
                address: newTempleAddress || undefined
              })}
              disabled={!newTempleName || createTempleMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {createTempleMutation.isPending ? 'Creating...' : 'Create Temple'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {temples?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No temples found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first temple to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Square Connected</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Devices</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {temples?.map((temple: any) => (
                  <tr key={temple.id} className="hover:bg-purple-50/30 transition-colors border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{temple.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{temple.address || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${temple.squareMerchantId
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                        {temple.squareMerchantId ? 'Connected' : 'Not Connected'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{temple.devices?.length || 0}</div>
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

