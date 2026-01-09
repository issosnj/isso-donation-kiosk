'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface ThemeVersion {
  id: string
  version: number
  kioskTheme: any
  createdBy?: string
  user?: {
    name: string
    email: string
  }
  description?: string
  isAutomatic: boolean
  createdAt: string
}

export default function ThemeVersionHistory() {
  const queryClient = useQueryClient()
  const [selectedVersion, setSelectedVersion] = useState<ThemeVersion | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  // Fetch theme versions
  const { data: versions, isLoading } = useQuery({
    queryKey: ['theme-versions'],
    queryFn: async () => {
      const response = await api.get('/theme-versions?limit=50')
      return response.data
    },
  })

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await api.post(`/theme-versions/${versionId}/restore`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] })
      queryClient.invalidateQueries({ queryKey: ['theme-versions'] })
      setShowRestoreModal(false)
      setSelectedVersion(null)
      alert('Theme version restored successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to restore theme: ${error.response?.data?.message || error.message}`)
      setIsRestoring(false)
    },
  })

  const handleRestore = async () => {
    if (!selectedVersion) return
    setIsRestoring(true)
    restoreMutation.mutate(selectedVersion.id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVersionLabel = (version: ThemeVersion) => {
    if (version.description) {
      return version.description
    }
    if (version.isAutomatic) {
      return `Automatic backup - Version ${version.version}`
    }
    return `Version ${version.version}`
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading version history...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Theme Version History</h4>
            <p className="text-sm text-gray-600 mt-1">
              View and restore previous theme versions. Automatic backups are created before each update.
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {versions?.length || 0} version{versions?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {!versions || versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No version history available yet.</p>
            <p className="text-sm mt-2">Versions will be created automatically when you update the theme.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {versions.map((version: ThemeVersion) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedVersion?.id === version.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
                onClick={() => {
                  setSelectedVersion(version)
                  setShowRestoreModal(true)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {getVersionLabel(version)}
                      </span>
                      {version.isAutomatic && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          Auto
                        </span>
                      )}
                      {!version.isAutomatic && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <p>
                        Created: {formatDate(version.createdAt)}
                        {version.user && (
                          <span> by {version.user.name || version.user.email}</span>
                        )}
                      </p>
                      {version.kioskTheme && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Object.keys(version.kioskTheme).length} section
                          {Object.keys(version.kioskTheme).length !== 1 ? 's' : ''} •{' '}
                          {version.kioskTheme.layout
                            ? Object.keys(version.kioskTheme.layout).length
                            : 0}{' '}
                          layout properties
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVersion(version)
                      setShowRestoreModal(true)
                    }}
                    className="ml-4 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restore Theme Version?</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-700">Version:</p>
                <p className="text-sm text-gray-900">{getVersionLabel(selectedVersion)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Created:</p>
                <p className="text-sm text-gray-900">{formatDate(selectedVersion.createdAt)}</p>
              </div>
              {selectedVersion.user && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Created by:</p>
                  <p className="text-sm text-gray-900">
                    {selectedVersion.user.name || selectedVersion.user.email}
                  </p>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will restore the theme to this version and create a
                  new backup of the current theme.
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false)
                  setSelectedVersion(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRestoring ? 'Restoring...' : 'Restore Theme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

