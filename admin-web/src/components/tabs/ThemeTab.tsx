'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { themeFromApi, themeToApi } from '@/lib/theme-utils'
import type { KioskTheme } from '@/types/theme'
import ThemeVersionHistory from './ThemeVersionHistory'
import DefaultPositionsManager from './DefaultPositionsManager'
import ThemeStudioPage from '@/components/theme-studio/ThemeStudioPage'

export default function ThemeTab() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'theme' | 'behavior' | 'versions' | 'positions'>('theme')

  // Fetch global settings (kiosk theme is now global, master-admin controlled)
  const { data: globalSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      const response = await api.get('/global-settings')
      return response.data
    },
  })

  const publishedTheme = themeFromApi(globalSettings?.kioskTheme) as KioskTheme
  const [draftTheme, setDraftTheme] = useState<KioskTheme>(() =>
    themeFromApi(globalSettings?.kioskTheme) as KioskTheme
  )

  useEffect(() => {
    if (globalSettings?.kioskTheme) {
      setDraftTheme(themeFromApi(globalSettings.kioskTheme) as KioskTheme)
    }
  }, [globalSettings])

  const updateMutation = useMutation({
    mutationFn: async (data: { kioskTheme: any; description?: string }) => {
      const response = await api.patch('/global-settings/kiosk-theme', {
        kioskTheme: data.kioskTheme,
        description: data.description || 'Theme update',
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] })
      queryClient.invalidateQueries({ queryKey: ['theme-versions'] })
      queryClient.invalidateQueries({ queryKey: ['temple'] })
      alert('Theme settings saved successfully! This theme will apply to all temples.')
    },
    onError: (error: any) => {
      alert(`Failed to save theme: ${error.response?.data?.message || error.message}`)
    },
  })

  const handleSave = (theme: KioskTheme, description?: string) => {
    updateMutation.mutate({
      kioskTheme: themeToApi(theme),
      description: (description?.trim()) || 'Theme update',
    })
  }

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
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('theme')}
            className={`${
              activeTab === 'theme'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Theme Studio
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`${
              activeTab === 'behavior'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Kiosk Behavior
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`${
              activeTab === 'versions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Version History
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`${
              activeTab === 'positions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Default Positions
          </button>
        </nav>
      </div>

      {/* Kiosk Behavior Tab */}
      {activeTab === 'behavior' && (
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
      )}

      {/* Version History Tab */}
      {activeTab === 'versions' && <ThemeVersionHistory />}

      {/* Default Positions Tab */}
      {activeTab === 'positions' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Default UI Element Positions</h4>
            <p className="text-sm text-gray-600 mt-1">
              Set default positions for UI elements. When an element's position is set, it becomes
              the default for all new themes.
            </p>
          </div>
          <DefaultPositionsManager />
        </div>
      )}

      {/* Theme Studio Tab */}
      {activeTab === 'theme' && (
        <ThemeStudioPage
          publishedTheme={publishedTheme}
          draftTheme={draftTheme}
          onDraftChange={setDraftTheme}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
          lastEditedBy={globalSettings?.updatedBy?.name ?? globalSettings?.updatedBy?.email}
          lastPublishedAt={globalSettings?.updatedAt}
          onOpenVersionHistory={() => setActiveTab('versions')}
        />
      )}
    </div>
  )
}

