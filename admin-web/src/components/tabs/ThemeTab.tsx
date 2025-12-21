'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'

// Helper to get API base URL for proxy
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  }
  return 'http://localhost:3000/api'
}

export default function ThemeTab() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTempleId, setSelectedTempleId] = useState<string | null>(null)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [backgroundUrlInput, setBackgroundUrlInput] = useState('')
  const [useUrlInstead, setUseUrlInstead] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      tapToDonateButtonColor: '#D4AF37',
      categorySelectedColor: '#3366CC',
      categoryUnselectedColor: '#3366CC',
      amountSelectedColor: '#3366CC',
      amountUnselectedColor: '#3366CC',
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
      customAmountKeypadX: 0,
      customAmountKeypadY: 0,
      customAmountKeypadWidth: 320,
      customAmountKeypadButtonHeight: 70,
      customAmountKeypadButtonSpacing: 12,
      customAmountKeypadButtonCornerRadius: 12,
      customAmountKeypadBackgroundColor: '#87512B',
      customAmountKeypadBorderColor: '#F4A44E',
      customAmountKeypadBorderWidth: 3,
      customAmountKeypadGlowColor: '#F4A44E',
      customAmountKeypadGlowRadius: 15,
      customAmountKeypadButtonColor: '#F8D8A1',
      customAmountKeypadButtonTextColor: '#333355',
      customAmountKeypadNumberFontSize: 32,
      customAmountKeypadLetterFontSize: 10,
      customAmountKeypadPadding: 16,
      customAmountKeypadCornerRadius: 16,
      backgroundImageUrl: '',
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
          tapToDonateButtonColor: temple.kioskTheme.colors?.tapToDonateButtonColor || '#D4AF37',
          categorySelectedColor: temple.kioskTheme.colors?.categorySelectedColor || temple.homeScreenConfig?.buttonColors?.categorySelected || '#3366CC',
          categoryUnselectedColor: temple.kioskTheme.colors?.categoryUnselectedColor || temple.homeScreenConfig?.buttonColors?.categoryUnselected || '#3366CC',
          amountSelectedColor: temple.kioskTheme.colors?.amountSelectedColor || temple.homeScreenConfig?.buttonColors?.amountSelected || '#3366CC',
          amountUnselectedColor: temple.kioskTheme.colors?.amountUnselectedColor || temple.homeScreenConfig?.buttonColors?.amountUnselected || '#3366CC',
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
          customAmountKeypadX: temple.kioskTheme.layout?.customAmountKeypadX || 0,
          customAmountKeypadY: temple.kioskTheme.layout?.customAmountKeypadY || 0,
          customAmountKeypadWidth: temple.kioskTheme.layout?.customAmountKeypadWidth || 320,
          customAmountKeypadButtonHeight: temple.kioskTheme.layout?.customAmountKeypadButtonHeight || 70,
          customAmountKeypadButtonSpacing: temple.kioskTheme.layout?.customAmountKeypadButtonSpacing || 12,
          customAmountKeypadButtonCornerRadius: temple.kioskTheme.layout?.customAmountKeypadButtonCornerRadius || 12,
          customAmountKeypadBackgroundColor: temple.kioskTheme.layout?.customAmountKeypadBackgroundColor || '#87512B',
          customAmountKeypadBorderColor: temple.kioskTheme.layout?.customAmountKeypadBorderColor || '#F4A44E',
          customAmountKeypadBorderWidth: temple.kioskTheme.layout?.customAmountKeypadBorderWidth || 3,
          customAmountKeypadGlowColor: temple.kioskTheme.layout?.customAmountKeypadGlowColor || '#F4A44E',
          customAmountKeypadGlowRadius: temple.kioskTheme.layout?.customAmountKeypadGlowRadius || 15,
          customAmountKeypadButtonColor: temple.kioskTheme.layout?.customAmountKeypadButtonColor || '#F8D8A1',
          customAmountKeypadButtonTextColor: temple.kioskTheme.layout?.customAmountKeypadButtonTextColor || '#333355',
          customAmountKeypadNumberFontSize: temple.kioskTheme.layout?.customAmountKeypadNumberFontSize || 32,
          customAmountKeypadLetterFontSize: temple.kioskTheme.layout?.customAmountKeypadLetterFontSize || 10,
          customAmountKeypadPadding: temple.kioskTheme.layout?.customAmountKeypadPadding || 16,
          customAmountKeypadCornerRadius: temple.kioskTheme.layout?.customAmountKeypadCornerRadius || 16,
          backgroundImageUrl: temple.kioskTheme.layout?.backgroundImageUrl || temple.homeScreenConfig?.backgroundImageUrl || '',
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
                      tapToDonateButtonColor: temple.kioskTheme.colors?.tapToDonateButtonColor || '#D4AF37',
                      categorySelectedColor: temple.kioskTheme.colors?.categorySelectedColor || temple.homeScreenConfig?.buttonColors?.categorySelected || '#3366CC',
                      categoryUnselectedColor: temple.kioskTheme.colors?.categoryUnselectedColor || temple.homeScreenConfig?.buttonColors?.categoryUnselected || '#3366CC',
                      amountSelectedColor: temple.kioskTheme.colors?.amountSelectedColor || temple.homeScreenConfig?.buttonColors?.amountSelected || '#3366CC',
                      amountUnselectedColor: temple.kioskTheme.colors?.amountUnselectedColor || temple.homeScreenConfig?.buttonColors?.amountUnselected || '#3366CC',
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
                      customAmountKeypadX: temple.kioskTheme.layout?.customAmountKeypadX || 0,
                      customAmountKeypadY: temple.kioskTheme.layout?.customAmountKeypadY || 0,
                      customAmountKeypadWidth: temple.kioskTheme.layout?.customAmountKeypadWidth || 320,
                      customAmountKeypadButtonHeight: temple.kioskTheme.layout?.customAmountKeypadButtonHeight || 70,
                      customAmountKeypadButtonSpacing: temple.kioskTheme.layout?.customAmountKeypadButtonSpacing || 12,
                      customAmountKeypadButtonCornerRadius: temple.kioskTheme.layout?.customAmountKeypadButtonCornerRadius || 12,
                      customAmountKeypadBackgroundColor: temple.kioskTheme.layout?.customAmountKeypadBackgroundColor || '#87512B',
                      customAmountKeypadBorderColor: temple.kioskTheme.layout?.customAmountKeypadBorderColor || '#F4A44E',
                      customAmountKeypadBorderWidth: temple.kioskTheme.layout?.customAmountKeypadBorderWidth || 3,
                      customAmountKeypadGlowColor: temple.kioskTheme.layout?.customAmountKeypadGlowColor || '#F4A44E',
                      customAmountKeypadGlowRadius: temple.kioskTheme.layout?.customAmountKeypadGlowRadius || 15,
                      customAmountKeypadButtonColor: temple.kioskTheme.layout?.customAmountKeypadButtonColor || '#F8D8A1',
                      customAmountKeypadButtonTextColor: temple.kioskTheme.layout?.customAmountKeypadButtonTextColor || '#333355',
                      customAmountKeypadNumberFontSize: temple.kioskTheme.layout?.customAmountKeypadNumberFontSize || 32,
                      customAmountKeypadLetterFontSize: temple.kioskTheme.layout?.customAmountKeypadLetterFontSize || 10,
                      customAmountKeypadPadding: temple.kioskTheme.layout?.customAmountKeypadPadding || 16,
                      customAmountKeypadCornerRadius: temple.kioskTheme.layout?.customAmountKeypadCornerRadius || 16,
                      backgroundImageUrl: temple.kioskTheme.layout?.backgroundImageUrl || temple.homeScreenConfig?.backgroundImageUrl || '',
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

          {/* Background Image */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Kiosk Home Screen Background Image</h4>
            <p className="text-xs text-gray-500 mb-3">
              Upload a custom background image or provide a direct image URL (supports Google Drive links). Recommended size: 1920x1080 or larger. Max file size: 10MB.
            </p>
            
            {formData.layout.backgroundImageUrl && (
              <div className="mb-3">
                {imageLoadError ? (
                  <div className="w-full max-w-md h-48 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-sm text-red-600 font-medium">Failed to load image</p>
                      <p className="text-xs text-red-500 mt-1 break-all">URL: {formData.layout.backgroundImageUrl}</p>
                      <button
                        onClick={() => setImageLoadError(false)}
                        className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={
                      formData.layout.backgroundImageUrl?.includes('drive.google.com')
                        ? `${getApiBaseUrl()}/temples/proxy-image?url=${encodeURIComponent(formData.layout.backgroundImageUrl)}`
                        : formData.layout.backgroundImageUrl
                    }
                    alt="Background preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('Failed to load background image:', formData.layout.backgroundImageUrl)
                      console.error('Image load error details:', e)
                      setImageLoadError(true)
                    }}
                    onLoad={() => {
                      setImageLoadError(false)
                      console.log('Background image loaded successfully')
                    }}
                  />
                )}
              </div>
            )}
            
            {isEditing && (
              <div className="mb-3">
                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useUrlInstead}
                      onChange={() => {
                        setUseUrlInstead(false)
                        setBackgroundUrlInput('')
                      }}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Upload Image File</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useUrlInstead}
                      onChange={() => {
                        setUseUrlInstead(true)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Use Image URL</span>
                  </label>
                </div>
              </div>
            )}
            
            {isEditing && !useUrlInstead && (
              <div className="flex items-center space-x-3 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !selectedTempleId) return
                    
                    setUploadingBackground(true)
                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append('file', file)
                      
                      const response = await api.post(`/temples/${selectedTempleId}/upload-background`, uploadFormData, {
                        headers: {
                          'Content-Type': 'multipart/form-data',
                        },
                      })
                      
                      setFormData(prev => ({
                        ...prev,
                        layout: { ...prev.layout, backgroundImageUrl: response.data.url },
                      }))
                      
                      setImageLoadError(false)
                      queryClient.invalidateQueries({ queryKey: ['temple', selectedTempleId] })
                    } catch (error: any) {
                      console.error('Upload error:', error)
                      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload background image. Please try again.'
                      alert(errorMessage)
                    } finally {
                      setUploadingBackground(false)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }
                  }}
                  disabled={!isEditing || uploadingBackground}
                  className="hidden"
                />
                <div
                  onClick={() => {
                    if (isEditing && !uploadingBackground && fileInputRef.current) {
                      fileInputRef.current.click()
                    }
                  }}
                  className={`flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center transition-colors ${
                    isEditing && !uploadingBackground
                      ? 'cursor-pointer hover:border-purple-500 hover:bg-purple-50'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {uploadingBackground ? (
                    <span className="text-sm text-gray-600">Uploading...</span>
                  ) : (
                    <span className="text-sm text-purple-600 font-medium">
                      {formData.layout.backgroundImageUrl ? 'Change Background Image' : 'Upload Background Image'}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {isEditing && useUrlInstead && (
              <div className="mb-3 space-y-2">
                <input
                  type="url"
                  value={backgroundUrlInput}
                  onChange={(e) => setBackgroundUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-gray-500">
                  Enter a direct image URL or Google Drive share link. Google Drive links will be automatically converted to direct download links.
                </p>
                <button
                  onClick={async () => {
                    if (!backgroundUrlInput.trim() || !selectedTempleId) {
                      alert('Please enter an image URL')
                      return
                    }
                    
                    setUploadingBackground(true)
                    try {
                      const response = await api.post(`/temples/${selectedTempleId}/set-background-url`, {
                        url: backgroundUrlInput.trim(),
                      })
                      
                      setFormData(prev => ({
                        ...prev,
                        layout: { ...prev.layout, backgroundImageUrl: response.data.url },
                      }))
                      
                      setBackgroundUrlInput('')
                      setImageLoadError(false)
                      queryClient.invalidateQueries({ queryKey: ['temple', selectedTempleId] })
                    } catch (error: any) {
                      console.error('Set URL error:', error)
                      const errorMessage = error.response?.data?.message || error.message || 'Failed to set background image URL. Please try again.'
                      alert(errorMessage)
                    } finally {
                      setUploadingBackground(false)
                    }
                  }}
                  disabled={!backgroundUrlInput.trim() || uploadingBackground}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {uploadingBackground ? 'Setting URL...' : 'Set Background URL'}
                </button>
              </div>
            )}
            
            {formData.layout.backgroundImageUrl && isEditing && (
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    layout: { ...prev.layout, backgroundImageUrl: '' },
                  }))
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                Remove Background
              </button>
            )}
          </div>

          {/* Custom Amount Keypad Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Custom Amount Keypad</h4>
            <p className="text-xs text-gray-500 mb-4">Customize the appearance and position of the numeric keypad that appears when users enter a custom donation amount</p>
            
            <div className="space-y-6">
              {/* Position */}
              <div>
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Position</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Position (0 = use default alignment)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Horizontal position in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadX}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadX: parseInt(e.target.value) || 0 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Position (0 = use default alignment)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Vertical position in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadY}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadY: parseInt(e.target.value) || 0 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div>
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Size</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keypad Width
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Overall width of the keypad in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadWidth}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadWidth: parseInt(e.target.value) || 320 }
                      })}
                      disabled={!isEditing}
                      min="200"
                      max="600"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Height
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Height of each keypad button in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadButtonHeight}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadButtonHeight: parseInt(e.target.value) || 70 }
                      })}
                      disabled={!isEditing}
                      min="40"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Spacing
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Space between buttons in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadButtonSpacing}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadButtonSpacing: parseInt(e.target.value) || 12 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keypad Padding
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Internal padding inside keypad container</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadPadding}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadPadding: parseInt(e.target.value) || 16 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div>
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Colors</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.customAmountKeypadBackgroundColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadBackgroundColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.customAmountKeypadBackgroundColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadBackgroundColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Border Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.customAmountKeypadBorderColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadBorderColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.customAmountKeypadBorderColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadBorderColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Background Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.customAmountKeypadButtonColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadButtonColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.customAmountKeypadButtonColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadButtonColor: e.target.value }
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.customAmountKeypadButtonTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadButtonTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.customAmountKeypadButtonTextColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadButtonTextColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Glow Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.layout.customAmountKeypadGlowColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadGlowColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.layout.customAmountKeypadGlowColor}
                        onChange={(e) => setFormData({
                          ...formData,
                          layout: { ...formData.layout, customAmountKeypadGlowColor: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Border Width
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Width of keypad border in pixels</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadBorderWidth}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadBorderWidth: parseInt(e.target.value) || 3 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Glow Radius
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Radius of glow effect around keypad</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadGlowRadius}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadGlowRadius: parseInt(e.target.value) || 15 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Styling */}
              <div>
                <h5 className="text-sm font-semibold text-gray-800 mb-3">Styling</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Corner Radius
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Roundness of button corners</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadButtonCornerRadius}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadButtonCornerRadius: parseInt(e.target.value) || 12 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keypad Corner Radius
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Roundness of keypad container corners</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadCornerRadius}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadCornerRadius: parseInt(e.target.value) || 16 }
                      })}
                      disabled={!isEditing}
                      min="0"
                      max="40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number Font Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Font size of numbers on buttons</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadNumberFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadNumberFontSize: parseInt(e.target.value) || 32 }
                      })}
                      disabled={!isEditing}
                      min="16"
                      max="60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Letter Font Size
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Font size of letters on buttons</p>
                    <input
                      type="number"
                      value={formData.layout.customAmountKeypadLetterFontSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, customAmountKeypadLetterFontSize: parseInt(e.target.value) || 10 }
                      })}
                      disabled={!isEditing}
                      min="6"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
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

