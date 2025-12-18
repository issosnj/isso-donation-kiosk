'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface DevicesTabProps {
  templeId: string
}

export default function DevicesTab({ templeId }: DevicesTabProps) {
  const [newDeviceLabel, setNewDeviceLabel] = useState('')
  const queryClient = useQueryClient()

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices', templeId],
    queryFn: async () => {
      const response = await api.get('/devices', {
        params: { templeId },
      })
      return response.data
    },
  })

  const createDeviceMutation = useMutation({
    mutationFn: async (label: string) => {
      const response = await api.post('/devices', {
        templeId,
        label,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      setNewDeviceLabel('')
    },
  })

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/devices/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Device</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={newDeviceLabel}
            onChange={(e) => setNewDeviceLabel(e.target.value)}
            placeholder="Device label (e.g., Front Lobby Kiosk)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => createDeviceMutation.mutate(newDeviceLabel)}
            disabled={!newDeviceLabel || createDeviceMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {createDeviceMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Device Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices?.map((device: any) => (
                  <tr key={device.id} className="hover:bg-purple-50/30 transition-colors border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{device.label}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono bg-gray-50 px-3 py-1 rounded border border-gray-200 text-gray-700">
                        {device.deviceCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${
                        device.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : device.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm(`Delete device "${device.label}"? This action cannot be undone.`)) {
                            deleteDeviceMutation.mutate(device.id)
                          }
                        }}
                        disabled={deleteDeviceMutation.isPending}
                        className="px-3 py-1 text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                      >
                        {deleteDeviceMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

