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
      setNewDeviceLabel('')
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Create New Device</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={newDeviceLabel}
            onChange={(e) => setNewDeviceLabel(e.target.value)}
            placeholder="Device label (e.g., Front Lobby Kiosk)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={() => createDeviceMutation.mutate(newDeviceLabel)}
            disabled={!newDeviceLabel || createDeviceMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {devices?.map((device: any) => (
              <tr key={device.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{device.label}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono bg-gray-50">
                  {device.deviceCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    device.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    device.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

