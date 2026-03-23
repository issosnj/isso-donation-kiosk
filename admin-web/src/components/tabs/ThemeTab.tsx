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
  const [activeTab, setActiveTab] = useState<'theme' | 'versions' | 'positions'>('theme')

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

