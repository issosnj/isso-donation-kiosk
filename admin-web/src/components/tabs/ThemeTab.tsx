'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

export default function ThemeTab() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTempleId, setSelectedTempleId] = useState<string | null>(null)

  // Fetch all temples for selection
  const { data: temples } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      return response.data
    },
  })

  // Fetch selected temple
  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', selectedTempleId],
    queryFn: async () => {
      if (!selectedTempleId) return null
      const response = await api.get(`/temples/${selectedTempleId}`)
      return response.data
    },
    enabled: !!selectedTempleId,
  })

  const [formData, setFormData] = useState({
    fonts: {
      headingFamily: 'Inter-SemiBold',
      headingSize: 32,
      buttonFamily: 'Inter-Medium',
      buttonSize: 18,
      bodyFamily: 'Inter-Regular',
      bodySize: 14,
    },
    colors: {
      headingColor: '#423232',
      buttonTextColor: '#FFFFFF',
      bodyTextColor: '#808080',
      subtitleColor: '#808080',
      quantityTotalColor: '#423232',
    },
    layout: {
      categoryBoxMaxWidth: 400,
      amountButtonWidth: 120,
      amountButtonHeight: 70,
      categoryButtonHeight: 70,
      headerTopPadding: 120,
      categoryHeaderTopPadding: 120,
      sectionSpacing: 40,
      categoryAmountSectionSpacing: 40,
      buttonSpacing: 12,
      cornerRadius: 12,
      quantityTotalSpacing: 24,
    },
  })

  useEffect(() => {
    if (temple?.kioskTheme) {
      setFormData({
        fonts: {
          headingFamily: temple.kioskTheme.fonts?.headingFamily || 'Inter-SemiBold',
          headingSize: temple.kioskTheme.fonts?.headingSize || 32,
          buttonFamily: temple.kioskTheme.fonts?.buttonFamily || 'Inter-Medium',
          buttonSize: temple.kioskTheme.fonts?.buttonSize || 18,
          bodyFamily: temple.kioskTheme.fonts?.bodyFamily || 'Inter-Regular',
          bodySize: temple.kioskTheme.fonts?.bodySize || 14,
        },
        colors: {
          headingColor: temple.kioskTheme.colors?.headingColor || '#423232',
          buttonTextColor: temple.kioskTheme.colors?.buttonTextColor || '#FFFFFF',
          bodyTextColor: temple.kioskTheme.colors?.bodyTextColor || '#808080',
          subtitleColor: temple.kioskTheme.colors?.subtitleColor || '#808080',
          quantityTotalColor: temple.kioskTheme.colors?.quantityTotalColor || '#423232',
        },
        layout: {
          categoryBoxMaxWidth: temple.kioskTheme.layout?.categoryBoxMaxWidth || 400,
          amountButtonWidth: temple.kioskTheme.layout?.amountButtonWidth || 120,
          amountButtonHeight: temple.kioskTheme.layout?.amountButtonHeight || 70,
          categoryButtonHeight: temple.kioskTheme.layout?.categoryButtonHeight || 70,
          headerTopPadding: temple.kioskTheme.layout?.headerTopPadding || 120,
          categoryHeaderTopPadding: temple.kioskTheme.layout?.categoryHeaderTopPadding || 120,
          sectionSpacing: temple.kioskTheme.layout?.sectionSpacing || 40,
          buttonSpacing: temple.kioskTheme.layout?.buttonSpacing || 12,
          cornerRadius: temple.kioskTheme.layout?.cornerRadius || 12,
          quantityTotalSpacing: temple.kioskTheme.layout?.quantityTotalSpacing || 24,
        },
      })
    }
  }, [temple])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedTempleId) throw new Error('No temple selected')
      const response = await api.patch(`/temples/${selectedTempleId}`, {
        kioskTheme: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', selectedTempleId] })
      setIsEditing(false)
      alert('Theme settings saved successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to save theme: ${error.response?.data?.message || error.message}`)
    },
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Kiosk Theme & Layout Customization</h3>
          <p className="text-sm text-gray-600">Customize fonts, colors, and layout for the donation kiosk interface</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors text-sm"
          >
            Edit
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsEditing(false)
                if (temple?.kioskTheme) {
                  setFormData({
                    fonts: {
                      headingFamily: temple.kioskTheme.fonts?.headingFamily || 'Inter-SemiBold',
                      headingSize: temple.kioskTheme.fonts?.headingSize || 32,
                      buttonFamily: temple.kioskTheme.fonts?.buttonFamily || 'Inter-Medium',
                      buttonSize: temple.kioskTheme.fonts?.buttonSize || 18,
                      bodyFamily: temple.kioskTheme.fonts?.bodyFamily || 'Inter-Regular',
                      bodySize: temple.kioskTheme.fonts?.bodySize || 14,
                    },
                    colors: {
                      headingColor: temple.kioskTheme.colors?.headingColor || '#423232',
                      buttonTextColor: temple.kioskTheme.colors?.buttonTextColor || '#FFFFFF',
                      bodyTextColor: temple.kioskTheme.colors?.bodyTextColor || '#808080',
                      subtitleColor: temple.kioskTheme.colors?.subtitleColor || '#808080',
                      quantityTotalColor: temple.kioskTheme.colors?.quantityTotalColor || '#423232',
                    },
                    layout: {
                      categoryBoxMaxWidth: temple.kioskTheme.layout?.categoryBoxMaxWidth || 400,
                      amountButtonWidth: temple.kioskTheme.layout?.amountButtonWidth || 120,
                      amountButtonHeight: temple.kioskTheme.layout?.amountButtonHeight || 70,
                      categoryButtonHeight: temple.kioskTheme.layout?.categoryButtonHeight || 70,
                      headerTopPadding: temple.kioskTheme.layout?.headerTopPadding || 120,
                      categoryHeaderTopPadding: temple.kioskTheme.layout?.categoryHeaderTopPadding || 120,
                      sectionSpacing: temple.kioskTheme.layout?.sectionSpacing || 40,
                      buttonSpacing: temple.kioskTheme.layout?.buttonSpacing || 12,
                      cornerRadius: temple.kioskTheme.layout?.cornerRadius || 12,
                      quantityTotalSpacing: temple.kioskTheme.layout?.quantityTotalSpacing || 24,
                    },
                  })
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || !selectedTempleId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Temple Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Temple
        </label>
        <select
          value={selectedTempleId || ''}
          onChange={(e) => {
            setSelectedTempleId(e.target.value || null)
            setIsEditing(false)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">-- Select a temple --</option>
          {temples?.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Select a temple to customize its kiosk theme</p>
      </div>

      {selectedTempleId && (
        <div className="space-y-6">
          {/* Font Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Font Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Font Family
                </label>
                <input
                  type="text"
                  value={formData.fonts.headingFamily}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, headingFamily: e.target.value }
                  })}
                  disabled={!isEditing}
                  placeholder="Inter-SemiBold"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Font Size
                </label>
                <input
                  type="number"
                  value={formData.fonts.headingSize}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, headingSize: parseInt(e.target.value) || 32 }
                  })}
                  disabled={!isEditing}
                  min="12"
                  max="72"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Font Family
                </label>
                <input
                  type="text"
                  value={formData.fonts.buttonFamily}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, buttonFamily: e.target.value }
                  })}
                  disabled={!isEditing}
                  placeholder="Inter-Medium"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Font Size
                </label>
                <input
                  type="number"
                  value={formData.fonts.buttonSize}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, buttonSize: parseInt(e.target.value) || 18 }
                  })}
                  disabled={!isEditing}
                  min="10"
                  max="48"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Font Family
                </label>
                <input
                  type="text"
                  value={formData.fonts.bodyFamily}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, bodyFamily: e.target.value }
                  })}
                  disabled={!isEditing}
                  placeholder="Inter-Regular"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Font Size
                </label>
                <input
                  type="number"
                  value={formData.fonts.bodySize}
                  onChange={(e) => setFormData({
                    ...formData,
                    fonts: { ...formData.fonts, bodySize: parseInt(e.target.value) || 14 }
                  })}
                  disabled={!isEditing}
                  min="10"
                  max="32"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Color Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Color Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, [key]: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, [key]: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Layout Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.layout).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, [key]: parseInt(e.target.value) || 0 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

