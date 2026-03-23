'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export default function KioskBehaviorTab() {
  const queryClient = useQueryClient()

  const { data: globalSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      const response = await api.get('/global-settings')
      return response.data
    },
  })

  const kioskBehaviorMutation = useMutation({
    mutationFn: async (data: { showObservances?: boolean }) => {
      const response = await api.patch('/global-settings/kiosk-behavior', data)
      return response.data
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['global-settings'] })
      const prev = queryClient.getQueryData(['global-settings'])
      queryClient.setQueryData(['global-settings'], (old: any) =>
        old ? { ...old, kioskBehavior: { showObservances: data.showObservances ?? old?.kioskBehavior?.showObservances ?? true } } : old
      )
      return { prev }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] })
      alert('Kiosk behavior settings saved successfully.')
    },
    onError: (error: any, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['global-settings'], context.prev)
      alert(`Failed to save: ${error.response?.data?.message || error.message}`)
    },
  })

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-2">Global Kiosk Behavior</h4>
      <p className="text-sm text-gray-600 mb-6">
        Control whether religious observances are shown on kiosks. This applies to all temples.
      </p>
      <div className="flex items-center justify-between max-w-md p-4 border border-gray-200 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Show observances</p>
          <p className="text-sm text-gray-500">Display the Religious Observances button and events on kiosk home screens</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={globalSettings?.kioskBehavior?.showObservances ?? true}
            onChange={(e) => {
              kioskBehaviorMutation.mutate({ showObservances: e.target.checked })
            }}
            disabled={kioskBehaviorMutation.isPending}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {globalSettings?.kioskBehavior?.showObservances ?? true ? 'On' : 'Off'}
          </span>
        </label>
      </div>
    </div>
  )
}
