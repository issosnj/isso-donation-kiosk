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
      donationSelectionPageLeftPadding: 40,
      donationSelectionPageRightPadding: 40,
      // Donation Details Page Layout
      detailsPageHorizontalSpacing: 40,
      detailsPageSidePadding: 60,
      detailsPageTopPadding: 80,
      detailsPageBottomPadding: 40,
      detailsCardMaxWidth: 420,
      donorFormMaxWidth: 420,
      detailsCardPadding: 24,
      detailsCardSpacing: 16,
      // Donation Details Page Fonts
      detailsAmountFontSize: 56,
      detailsLabelFontSize: 18,
      detailsInputFontSize: 18,
      detailsButtonFontSize: 22,
      // Donation Details Page Colors
      detailsAmountColor: '#423232',
      detailsTextColor: '#423232',
      detailsInputBorderColor: '#CCCCCC',
      detailsInputFocusColor: '#3366CC',
      detailsButtonColor: '#3366CC',
      detailsButtonTextColor: '#FFFFFF',
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
          categoryAmountSectionSpacing: temple.kioskTheme.layout?.categoryAmountSectionSpacing || 40,
          buttonSpacing: temple.kioskTheme.layout?.buttonSpacing || 12,
          cornerRadius: temple.kioskTheme.layout?.cornerRadius || 12,
          quantityTotalSpacing: temple.kioskTheme.layout?.quantityTotalSpacing || 24,
          donationSelectionPageLeftPadding: temple.kioskTheme.layout?.donationSelectionPageLeftPadding || 40,
          donationSelectionPageRightPadding: temple.kioskTheme.layout?.donationSelectionPageRightPadding || 40,
          // Donation Details Page Layout
          detailsPageHorizontalSpacing: temple.kioskTheme.layout?.detailsPageHorizontalSpacing || 40,
          detailsPageSidePadding: temple.kioskTheme.layout?.detailsPageSidePadding || 60,
          detailsPageTopPadding: temple.kioskTheme.layout?.detailsPageTopPadding || 80,
          detailsPageBottomPadding: temple.kioskTheme.layout?.detailsPageBottomPadding || 40,
          detailsCardMaxWidth: temple.kioskTheme.layout?.detailsCardMaxWidth || 420,
          donorFormMaxWidth: temple.kioskTheme.layout?.donorFormMaxWidth || 420,
          detailsCardPadding: temple.kioskTheme.layout?.detailsCardPadding || 24,
          detailsCardSpacing: temple.kioskTheme.layout?.detailsCardSpacing || 16,
          // Donation Details Page Fonts
          detailsAmountFontSize: temple.kioskTheme.layout?.detailsAmountFontSize || 56,
          detailsLabelFontSize: temple.kioskTheme.layout?.detailsLabelFontSize || 18,
          detailsInputFontSize: temple.kioskTheme.layout?.detailsInputFontSize || 18,
          detailsButtonFontSize: temple.kioskTheme.layout?.detailsButtonFontSize || 22,
          // Donation Details Page Colors
          detailsAmountColor: temple.kioskTheme.layout?.detailsAmountColor || '#423232',
          detailsTextColor: temple.kioskTheme.layout?.detailsTextColor || '#423232',
          detailsInputBorderColor: temple.kioskTheme.layout?.detailsInputBorderColor || '#CCCCCC',
          detailsInputFocusColor: temple.kioskTheme.layout?.detailsInputFocusColor || '#3366CC',
          detailsButtonColor: temple.kioskTheme.layout?.detailsButtonColor || '#3366CC',
          detailsButtonTextColor: temple.kioskTheme.layout?.detailsButtonTextColor || '#FFFFFF',
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
                      categoryAmountSectionSpacing: temple.kioskTheme.layout?.categoryAmountSectionSpacing || 40,
                      buttonSpacing: temple.kioskTheme.layout?.buttonSpacing || 12,
                      cornerRadius: temple.kioskTheme.layout?.cornerRadius || 12,
                      quantityTotalSpacing: temple.kioskTheme.layout?.quantityTotalSpacing || 24,
                      // Donation Details Page Layout
                      detailsPageHorizontalSpacing: temple.kioskTheme.layout?.detailsPageHorizontalSpacing || 40,
                      detailsPageSidePadding: temple.kioskTheme.layout?.detailsPageSidePadding || 60,
                      detailsPageTopPadding: temple.kioskTheme.layout?.detailsPageTopPadding || 80,
                      detailsPageBottomPadding: temple.kioskTheme.layout?.detailsPageBottomPadding || 40,
                      detailsCardMaxWidth: temple.kioskTheme.layout?.detailsCardMaxWidth || 420,
                      donorFormMaxWidth: temple.kioskTheme.layout?.donorFormMaxWidth || 420,
                      detailsCardPadding: temple.kioskTheme.layout?.detailsCardPadding || 24,
                      detailsCardSpacing: temple.kioskTheme.layout?.detailsCardSpacing || 16,
                      // Donation Details Page Fonts
                      detailsAmountFontSize: temple.kioskTheme.layout?.detailsAmountFontSize || 56,
                      detailsLabelFontSize: temple.kioskTheme.layout?.detailsLabelFontSize || 18,
                      detailsInputFontSize: temple.kioskTheme.layout?.detailsInputFontSize || 18,
                      detailsButtonFontSize: temple.kioskTheme.layout?.detailsButtonFontSize || 22,
                      // Donation Details Page Colors
                      detailsAmountColor: temple.kioskTheme.layout?.detailsAmountColor || '#423232',
                      detailsTextColor: temple.kioskTheme.layout?.detailsTextColor || '#423232',
                      detailsInputBorderColor: temple.kioskTheme.layout?.detailsInputBorderColor || '#CCCCCC',
                      detailsInputFocusColor: temple.kioskTheme.layout?.detailsInputFocusColor || '#3366CC',
                      detailsButtonColor: temple.kioskTheme.layout?.detailsButtonColor || '#3366CC',
                      detailsButtonTextColor: temple.kioskTheme.layout?.detailsButtonTextColor || '#FFFFFF',
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
          <div className="space-y-6">
            {/* Donation Selection Page Layout */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Donation Selection Page</h4>
              <p className="text-xs text-gray-500 mb-4">Customize the layout of the page where users select categories and amounts</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Box Width
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Maximum width of category buttons</p>
                  <input
                    type="number"
                    value={formData.layout.categoryBoxMaxWidth}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, categoryBoxMaxWidth: parseInt(e.target.value) || 400 }
                    })}
                    disabled={!isEditing}
                    min="200"
                    max="600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Button Width
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Width of preset amount buttons</p>
                  <input
                    type="number"
                    value={formData.layout.amountButtonWidth}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, amountButtonWidth: parseInt(e.target.value) || 120 }
                    })}
                    disabled={!isEditing}
                    min="80"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Button Height
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Height of preset amount buttons</p>
                  <input
                    type="number"
                    value={formData.layout.amountButtonHeight}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, amountButtonHeight: parseInt(e.target.value) || 70 }
                    })}
                    disabled={!isEditing}
                    min="40"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Button Height
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Height of category selection buttons</p>
                  <input
                    type="number"
                    value={formData.layout.categoryButtonHeight}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, categoryButtonHeight: parseInt(e.target.value) || 70 }
                    })}
                    disabled={!isEditing}
                    min="40"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from top of screen to content</p>
                  <input
                    type="number"
                    value={formData.layout.headerTopPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, headerTopPadding: parseInt(e.target.value) || 120 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space between category and amount sections</p>
                  <input
                    type="number"
                    value={formData.layout.categoryAmountSectionSpacing}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, categoryAmountSectionSpacing: parseInt(e.target.value) || 40 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space between buttons in the same section</p>
                  <input
                    type="number"
                    value={formData.layout.buttonSpacing}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, buttonSpacing: parseInt(e.target.value) || 12 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corner Radius
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Roundness of button corners</p>
                  <input
                    type="number"
                    value={formData.layout.cornerRadius}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, cornerRadius: parseInt(e.target.value) || 12 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Left Side Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Padding on the left side of the page (0-200)</p>
                  <input
                    type="number"
                    value={formData.layout.donationSelectionPageLeftPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, donationSelectionPageLeftPadding: parseInt(e.target.value) || 40 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Right Side Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Padding on the right side of the page (0-200)</p>
                  <input
                    type="number"
                    value={formData.layout.donationSelectionPageRightPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, donationSelectionPageRightPadding: parseInt(e.target.value) || 40 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Donation Details Page Layout */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Donation Details Page</h4>
              <p className="text-xs text-gray-500 mb-4">Customize the layout of the page where users enter their information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Between Sections
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Horizontal space between donation summary and donor form</p>
                  <input
                    type="number"
                    value={formData.layout.detailsPageHorizontalSpacing}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsPageHorizontalSpacing: parseInt(e.target.value) || 40 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Side Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from screen edges to content</p>
                  <input
                    type="number"
                    value={formData.layout.detailsPageSidePadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsPageSidePadding: parseInt(e.target.value) || 60 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from top of screen to content</p>
                  <input
                    type="number"
                    value={formData.layout.detailsPageTopPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsPageTopPadding: parseInt(e.target.value) || 80 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from bottom of screen to payment button</p>
                  <input
                    type="number"
                    value={formData.layout.detailsPageBottomPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsPageBottomPadding: parseInt(e.target.value) || 40 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Donation Summary Width
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Maximum width of the donation summary card</p>
                  <input
                    type="number"
                    value={formData.layout.detailsCardMaxWidth}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsCardMaxWidth: parseInt(e.target.value) || 420 }
                    })}
                    disabled={!isEditing}
                    min="200"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Donor Form Width
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Maximum width of the donor information form</p>
                  <input
                    type="number"
                    value={formData.layout.donorFormMaxWidth}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, donorFormMaxWidth: parseInt(e.target.value) || 420 }
                    })}
                    disabled={!isEditing}
                    min="200"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Internal padding inside the donation summary card</p>
                  <input
                    type="number"
                    value={formData.layout.detailsCardPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsCardPadding: parseInt(e.target.value) || 24 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Item Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space between items inside the donation summary card</p>
                  <input
                    type="number"
                    value={formData.layout.detailsCardSpacing}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, detailsCardSpacing: parseInt(e.target.value) || 16 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
              
              {/* Donation Details Page Fonts */}
              <div className="mt-6">
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Font Sizes</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Display Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Size of the large donation amount</p>
                    <input
                      type="number"
                      value={formData.layout.detailsAmountFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, detailsAmountFontSize: parseInt(e.target.value) || 56 }
                      })}
                      disabled={!isEditing}
                      min="24"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Size of labels and text</p>
                    <input
                      type="number"
                      value={formData.layout.detailsLabelFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, detailsLabelFontSize: parseInt(e.target.value) || 18 }
                      })}
                      disabled={!isEditing}
                      min="12"
                      max="32"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Field Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Size of text in input fields</p>
                    <input
                      type="number"
                      value={formData.layout.detailsInputFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, detailsInputFontSize: parseInt(e.target.value) || 18 }
                      })}
                      disabled={!isEditing}
                      min="12"
                      max="32"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Text Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Size of button text</p>
                    <input
                      type="number"
                      value={formData.layout.detailsButtonFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, detailsButtonFontSize: parseInt(e.target.value) || 22 }
                      })}
                      disabled={!isEditing}
                      min="14"
                      max="36"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Donation Details Page Colors */}
              <div className="mt-6">
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Colors</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Color of the large donation amount</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsAmountColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsAmountColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsAmountColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsAmountColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Color of labels and text</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Border Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Color of input field borders</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsInputBorderColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsInputBorderColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsInputBorderColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsInputBorderColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Focus Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Color when input field is focused</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsInputFocusColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsInputFocusColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsInputFocusColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsInputFocusColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Background color of payment button</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsButtonColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsButtonColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsButtonColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsButtonColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Text Color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Color of text on payment button</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.detailsButtonTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsButtonTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.detailsButtonTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, detailsButtonTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

