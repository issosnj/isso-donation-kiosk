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
      const response = await api.get('/temples')
      return response.data
    },
  })

  const createTempleMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      const response = await api.post('/temples', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      setShowCreateForm(false)
      setNewTempleName('')
      setNewTempleAddress('')
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
        <h2 className="text-2xl font-bold">Temples</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ Add Temple'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Create New Temple</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temple Name *
              </label>
              <input
                type="text"
                value={newTempleName}
                onChange={(e) => setNewTempleName(e.target.value)}
                placeholder="Enter temple name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={newTempleAddress}
                onChange={(e) => setNewTempleAddress(e.target.value)}
                placeholder="Enter temple address"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => createTempleMutation.mutate({ 
                name: newTempleName, 
                address: newTempleAddress || undefined 
              })}
              disabled={!newTempleName || createTempleMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createTempleMutation.isPending ? 'Creating...' : 'Create Temple'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {temples?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No temples found. Create your first temple to get started.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Square Connected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devices</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {temples?.map((temple: any) => (
                <tr key={temple.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{temple.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{temple.address || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      temple.squareMerchantId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {temple.squareMerchantId ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {temple.devices?.length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

