'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import ThemeVersionHistory from './ThemeVersionHistory'
import DefaultPositionsManager from './DefaultPositionsManager'

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

  // Fetch global settings (kiosk theme is now global, master-admin controlled)
  const { data: globalSettings, isLoading } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      const response = await api.get('/global-settings')
      return response.data
    },
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
      doneButtonColor: '#007AFF', // Default iOS blue for Done button
      returnToHomeButtonColor: '#D9C080', // Default gold color for Return to Home button
      proceedToPaymentButtonColor: '#FF9500', // Default orange color for Proceed to Payment button
      continueButtonColor: '#D9C080', // Default gold color for Continue button in keypad popups
      // Button gradient preferences
      tapToDonateButtonGradient: false,
      returnToHomeButtonGradient: true,
      proceedToPaymentButtonGradient: true,
      doneButtonGradient: false,
      continueButtonGradient: true,
    },
    layout: {
      categoryBoxMaxWidth: 400,
      amountButtonWidth: 120,
      amountButtonHeight: 70,
      categoryButtonHeight: 70,
      headerTopPadding: 80,
      categoryHeaderTopPadding: 80,
      categoryAmountSectionSpacing: 40,
      buttonSpacing: 12,
      cornerRadius: 12,
      quantityTotalSpacing: 24,
      donationSelectionPageLeftPadding: 40,
      donationSelectionPageRightPadding: 40,
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
      // Home Screen Layout Positioning (Legacy)
      homeScreenHeaderTopPadding: 60,
      homeScreenSpacerMaxHeight: 100,
      homeScreenContentSpacing: 20,
      homeScreenBottomButtonsPadding: 50,
      homeScreenBottomButtonsLeftPadding: 20,
      // Home Screen Element Visibility (hide/unhide)
      homeScreenWelcomeTextVisible: true,
      homeScreenHeader1Visible: true,
      homeScreenTimeStatusVisible: true,
      homeScreenTapToDonateVisible: true,
      homeScreenWhatsAppButtonsVisible: true,
      homeScreenLanguageSelectorVisible: true,
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
    if (globalSettings?.kioskTheme) {
      setFormData({
        fonts: {
          headingFamily: globalSettings.kioskTheme.fonts?.headingFamily || 'Inter-SemiBold',
          headingSize: globalSettings.kioskTheme.fonts?.headingSize || 32,
          buttonFamily: globalSettings.kioskTheme.fonts?.buttonFamily || 'Inter-Medium',
          buttonSize: globalSettings.kioskTheme.fonts?.buttonSize || 18,
          bodyFamily: globalSettings.kioskTheme.fonts?.bodyFamily || 'Inter-Regular',
          bodySize: globalSettings.kioskTheme.fonts?.bodySize || 14,
        },
        colors: {
          headingColor: globalSettings.kioskTheme.colors?.headingColor || '#423232',
          buttonTextColor: globalSettings.kioskTheme.colors?.buttonTextColor || '#FFFFFF',
          bodyTextColor: globalSettings.kioskTheme.colors?.bodyTextColor || '#808080',
          subtitleColor: globalSettings.kioskTheme.colors?.subtitleColor || '#808080',
          quantityTotalColor: globalSettings.kioskTheme.colors?.quantityTotalColor || '#423232',
          tapToDonateButtonColor: globalSettings.kioskTheme.colors?.tapToDonateButtonColor || '#D4AF37',
          categorySelectedColor: globalSettings.kioskTheme.colors?.categorySelectedColor || '#3366CC',
          categoryUnselectedColor: globalSettings.kioskTheme.colors?.categoryUnselectedColor || '#3366CC',
          amountSelectedColor: globalSettings.kioskTheme.colors?.amountSelectedColor || '#3366CC',
          amountUnselectedColor: globalSettings.kioskTheme.colors?.amountUnselectedColor || '#3366CC',
          doneButtonColor: globalSettings.kioskTheme.colors?.doneButtonColor || '#007AFF',
          returnToHomeButtonColor: globalSettings.kioskTheme.colors?.returnToHomeButtonColor || '#D9C080',
          proceedToPaymentButtonColor: globalSettings.kioskTheme.colors?.proceedToPaymentButtonColor || '#FF9500',
          continueButtonColor: globalSettings.kioskTheme.colors?.continueButtonColor || '#D9C080',
          tapToDonateButtonGradient: globalSettings.kioskTheme.colors?.tapToDonateButtonGradient ?? false,
          returnToHomeButtonGradient: globalSettings.kioskTheme.colors?.returnToHomeButtonGradient ?? true,
          proceedToPaymentButtonGradient: globalSettings.kioskTheme.colors?.proceedToPaymentButtonGradient ?? true,
          doneButtonGradient: globalSettings.kioskTheme.colors?.doneButtonGradient ?? false,
          continueButtonGradient: globalSettings.kioskTheme.colors?.continueButtonGradient ?? true,
        },
        layout: {
          categoryBoxMaxWidth: globalSettings.kioskTheme.layout?.categoryBoxMaxWidth || 400,
          amountButtonWidth: globalSettings.kioskTheme.layout?.amountButtonWidth || 120,
          amountButtonHeight: globalSettings.kioskTheme.layout?.amountButtonHeight || 70,
          categoryButtonHeight: globalSettings.kioskTheme.layout?.categoryButtonHeight || 70,
          headerTopPadding: globalSettings.kioskTheme.layout?.headerTopPadding || 80,
          categoryHeaderTopPadding: globalSettings.kioskTheme.layout?.categoryHeaderTopPadding || 80,
          categoryAmountSectionSpacing: globalSettings.kioskTheme.layout?.categoryAmountSectionSpacing || 40,
          buttonSpacing: globalSettings.kioskTheme.layout?.buttonSpacing || 12,
          cornerRadius: globalSettings.kioskTheme.layout?.cornerRadius || 12,
          quantityTotalSpacing: globalSettings.kioskTheme.layout?.quantityTotalSpacing || 24,
          donationSelectionPageLeftPadding: globalSettings.kioskTheme.layout?.donationSelectionPageLeftPadding || 40,
          donationSelectionPageRightPadding: globalSettings.kioskTheme.layout?.donationSelectionPageRightPadding || 40,
          customAmountKeypadWidth: globalSettings.kioskTheme.layout?.customAmountKeypadWidth || 320,
          customAmountKeypadButtonHeight: globalSettings.kioskTheme.layout?.customAmountKeypadButtonHeight || 70,
          customAmountKeypadButtonSpacing: globalSettings.kioskTheme.layout?.customAmountKeypadButtonSpacing || 12,
          customAmountKeypadButtonCornerRadius: globalSettings.kioskTheme.layout?.customAmountKeypadButtonCornerRadius || 12,
          customAmountKeypadBackgroundColor: globalSettings.kioskTheme.layout?.customAmountKeypadBackgroundColor || '#87512B',
          customAmountKeypadBorderColor: globalSettings.kioskTheme.layout?.customAmountKeypadBorderColor || '#F4A44E',
          customAmountKeypadBorderWidth: globalSettings.kioskTheme.layout?.customAmountKeypadBorderWidth || 3,
          customAmountKeypadGlowColor: globalSettings.kioskTheme.layout?.customAmountKeypadGlowColor || '#F4A44E',
          customAmountKeypadGlowRadius: globalSettings.kioskTheme.layout?.customAmountKeypadGlowRadius || 15,
          customAmountKeypadButtonColor: globalSettings.kioskTheme.layout?.customAmountKeypadButtonColor || '#F8D8A1',
          customAmountKeypadButtonTextColor: globalSettings.kioskTheme.layout?.customAmountKeypadButtonTextColor || '#333355',
          customAmountKeypadNumberFontSize: globalSettings.kioskTheme.layout?.customAmountKeypadNumberFontSize || 32,
          customAmountKeypadLetterFontSize: globalSettings.kioskTheme.layout?.customAmountKeypadLetterFontSize || 10,
          customAmountKeypadPadding: globalSettings.kioskTheme.layout?.customAmountKeypadPadding || 16,
          customAmountKeypadCornerRadius: globalSettings.kioskTheme.layout?.customAmountKeypadCornerRadius || 16,
          // Home Screen Layout Positioning (Legacy)
          homeScreenHeaderTopPadding: globalSettings.kioskTheme.layout?.homeScreenHeaderTopPadding || 60,
          homeScreenSpacerMaxHeight: globalSettings.kioskTheme.layout?.homeScreenSpacerMaxHeight || 100,
          homeScreenContentSpacing: globalSettings.kioskTheme.layout?.homeScreenContentSpacing || 20,
          homeScreenBottomButtonsPadding: globalSettings.kioskTheme.layout?.homeScreenBottomButtonsPadding || 50,
          homeScreenBottomButtonsLeftPadding: globalSettings.kioskTheme.layout?.homeScreenBottomButtonsLeftPadding || 20,
          // Home Screen Element Visibility
                      homeScreenWelcomeTextVisible: globalSettings.kioskTheme.layout?.homeScreenWelcomeTextVisible ?? true,
                      homeScreenHeader1Visible: globalSettings.kioskTheme.layout?.homeScreenHeader1Visible ?? true,
                      homeScreenTimeStatusVisible: globalSettings.kioskTheme.layout?.homeScreenTimeStatusVisible ?? true,
                      homeScreenTapToDonateVisible: globalSettings.kioskTheme.layout?.homeScreenTapToDonateVisible ?? true,
                      homeScreenWhatsAppButtonsVisible: globalSettings.kioskTheme.layout?.homeScreenWhatsAppButtonsVisible ?? true,
                      homeScreenLanguageSelectorVisible: globalSettings.kioskTheme.layout?.homeScreenLanguageSelectorVisible ?? true,
          // Donation Details Page Layout
          detailsPageHorizontalSpacing: globalSettings.kioskTheme.layout?.detailsPageHorizontalSpacing || 40,
          detailsPageSidePadding: globalSettings.kioskTheme.layout?.detailsPageSidePadding || 60,
          detailsPageTopPadding: globalSettings.kioskTheme.layout?.detailsPageTopPadding || 80,
          detailsPageBottomPadding: globalSettings.kioskTheme.layout?.detailsPageBottomPadding || 40,
          detailsCardMaxWidth: globalSettings.kioskTheme.layout?.detailsCardMaxWidth || 420,
          donorFormMaxWidth: globalSettings.kioskTheme.layout?.donorFormMaxWidth || 420,
          detailsCardPadding: globalSettings.kioskTheme.layout?.detailsCardPadding || 24,
          detailsCardSpacing: globalSettings.kioskTheme.layout?.detailsCardSpacing || 16,
          // Donation Details Page Fonts
          detailsAmountFontSize: globalSettings.kioskTheme.layout?.detailsAmountFontSize || 56,
          detailsLabelFontSize: globalSettings.kioskTheme.layout?.detailsLabelFontSize || 18,
          detailsInputFontSize: globalSettings.kioskTheme.layout?.detailsInputFontSize || 18,
          detailsButtonFontSize: globalSettings.kioskTheme.layout?.detailsButtonFontSize || 22,
          // Donation Details Page Colors
          detailsAmountColor: globalSettings.kioskTheme.layout?.detailsAmountColor || '#423232',
          detailsTextColor: globalSettings.kioskTheme.layout?.detailsTextColor || '#423232',
          detailsInputBorderColor: globalSettings.kioskTheme.layout?.detailsInputBorderColor || '#CCCCCC',
          detailsInputFocusColor: globalSettings.kioskTheme.layout?.detailsInputFocusColor || '#3366CC',
          detailsButtonColor: globalSettings.kioskTheme.layout?.detailsButtonColor || '#3366CC',
          detailsButtonTextColor: globalSettings.kioskTheme.layout?.detailsButtonTextColor || '#FFFFFF',
        },
      })
    }
  }, [globalSettings])

  const [description, setDescription] = useState('')
  const [activeTab, setActiveTab] = useState<'theme' | 'versions' | 'positions'>('theme')

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
      // Also invalidate all temple queries since they include global theme
      queryClient.invalidateQueries({ queryKey: ['temple'] })
      setIsEditing(false)
      setDescription('')
      alert('Theme settings saved successfully! This theme will apply to all temples.')
    },
    onError: (error: any) => {
      alert(`Failed to save theme: ${error.response?.data?.message || error.message}`)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      kioskTheme: formData,
      description: description.trim() || 'Theme update',
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
            Theme Settings
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

      {/* Theme Settings Tab */}
      {activeTab === 'theme' && (
        <>
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
              <div className="flex space-x-2 items-center">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    if (globalSettings?.kioskTheme) {
                  setFormData({
                    fonts: {
                      headingFamily: globalSettings.kioskTheme.fonts?.headingFamily || 'Inter-SemiBold',
                      headingSize: globalSettings.kioskTheme.fonts?.headingSize || 32,
                      buttonFamily: globalSettings.kioskTheme.fonts?.buttonFamily || 'Inter-Medium',
                      buttonSize: globalSettings.kioskTheme.fonts?.buttonSize || 18,
                      bodyFamily: globalSettings.kioskTheme.fonts?.bodyFamily || 'Inter-Regular',
                      bodySize: globalSettings.kioskTheme.fonts?.bodySize || 14,
                    },
                    colors: {
                      headingColor: globalSettings.kioskTheme.colors?.headingColor || '#423232',
                      buttonTextColor: globalSettings.kioskTheme.colors?.buttonTextColor || '#FFFFFF',
                      bodyTextColor: globalSettings.kioskTheme.colors?.bodyTextColor || '#808080',
                      subtitleColor: globalSettings.kioskTheme.colors?.subtitleColor || '#808080',
                      quantityTotalColor: globalSettings.kioskTheme.colors?.quantityTotalColor || '#423232',
                      tapToDonateButtonColor: globalSettings.kioskTheme.colors?.tapToDonateButtonColor || '#D4AF37',
                      categorySelectedColor: globalSettings.kioskTheme.colors?.categorySelectedColor || '#3366CC',
                      categoryUnselectedColor: globalSettings.kioskTheme.colors?.categoryUnselectedColor || '#3366CC',
                      amountSelectedColor: globalSettings.kioskTheme.colors?.amountSelectedColor || '#3366CC',
                      amountUnselectedColor: globalSettings.kioskTheme.colors?.amountUnselectedColor || '#3366CC',
                      doneButtonColor: globalSettings.kioskTheme.colors?.doneButtonColor || '#007AFF',
                      returnToHomeButtonColor: globalSettings.kioskTheme.colors?.returnToHomeButtonColor || '#D9C080',
                      proceedToPaymentButtonColor: globalSettings.kioskTheme.colors?.proceedToPaymentButtonColor || '#FF9500',
                      continueButtonColor: globalSettings.kioskTheme.colors?.continueButtonColor || '#D9C080',
                      tapToDonateButtonGradient: globalSettings.kioskTheme.colors?.tapToDonateButtonGradient ?? false,
                      returnToHomeButtonGradient: globalSettings.kioskTheme.colors?.returnToHomeButtonGradient ?? true,
                      proceedToPaymentButtonGradient: globalSettings.kioskTheme.colors?.proceedToPaymentButtonGradient ?? true,
                      doneButtonGradient: globalSettings.kioskTheme.colors?.doneButtonGradient ?? false,
                      continueButtonGradient: globalSettings.kioskTheme.colors?.continueButtonGradient ?? true,
                    },
                    layout: {
                      categoryBoxMaxWidth: globalSettings.kioskTheme.layout?.categoryBoxMaxWidth || 400,
                      amountButtonWidth: globalSettings.kioskTheme.layout?.amountButtonWidth || 120,
                      amountButtonHeight: globalSettings.kioskTheme.layout?.amountButtonHeight || 70,
                      categoryButtonHeight: globalSettings.kioskTheme.layout?.categoryButtonHeight || 70,
                      headerTopPadding: globalSettings.kioskTheme.layout?.headerTopPadding || 80,
                      categoryHeaderTopPadding: globalSettings.kioskTheme.layout?.categoryHeaderTopPadding || 80,
                      categoryAmountSectionSpacing: globalSettings.kioskTheme.layout?.categoryAmountSectionSpacing || 40,
                      buttonSpacing: globalSettings.kioskTheme.layout?.buttonSpacing || 12,
                      cornerRadius: globalSettings.kioskTheme.layout?.cornerRadius || 12,
                      quantityTotalSpacing: globalSettings.kioskTheme.layout?.quantityTotalSpacing || 24,
                      donationSelectionPageLeftPadding: globalSettings.kioskTheme.layout?.donationSelectionPageLeftPadding || 40,
                      donationSelectionPageRightPadding: globalSettings.kioskTheme.layout?.donationSelectionPageRightPadding || 40,
                      customAmountKeypadWidth: globalSettings.kioskTheme.layout?.customAmountKeypadWidth || 320,
                      customAmountKeypadButtonHeight: globalSettings.kioskTheme.layout?.customAmountKeypadButtonHeight || 70,
                      customAmountKeypadButtonSpacing: globalSettings.kioskTheme.layout?.customAmountKeypadButtonSpacing || 12,
                      customAmountKeypadButtonCornerRadius: globalSettings.kioskTheme.layout?.customAmountKeypadButtonCornerRadius || 12,
                      customAmountKeypadBackgroundColor: globalSettings.kioskTheme.layout?.customAmountKeypadBackgroundColor || '#87512B',
                      customAmountKeypadBorderColor: globalSettings.kioskTheme.layout?.customAmountKeypadBorderColor || '#F4A44E',
                      customAmountKeypadBorderWidth: globalSettings.kioskTheme.layout?.customAmountKeypadBorderWidth || 3,
                      customAmountKeypadGlowColor: globalSettings.kioskTheme.layout?.customAmountKeypadGlowColor || '#F4A44E',
                      customAmountKeypadGlowRadius: globalSettings.kioskTheme.layout?.customAmountKeypadGlowRadius || 15,
                      customAmountKeypadButtonColor: globalSettings.kioskTheme.layout?.customAmountKeypadButtonColor || '#F8D8A1',
                      customAmountKeypadButtonTextColor: globalSettings.kioskTheme.layout?.customAmountKeypadButtonTextColor || '#333355',
                      customAmountKeypadNumberFontSize: globalSettings.kioskTheme.layout?.customAmountKeypadNumberFontSize || 32,
                      customAmountKeypadLetterFontSize: globalSettings.kioskTheme.layout?.customAmountKeypadLetterFontSize || 10,
                      customAmountKeypadPadding: globalSettings.kioskTheme.layout?.customAmountKeypadPadding || 16,
                      customAmountKeypadCornerRadius: globalSettings.kioskTheme.layout?.customAmountKeypadCornerRadius || 16,
                      // Home Screen Layout Positioning (Legacy)
                      homeScreenHeaderTopPadding: globalSettings.kioskTheme.layout?.homeScreenHeaderTopPadding || 60,
                      homeScreenSpacerMaxHeight: globalSettings.kioskTheme.layout?.homeScreenSpacerMaxHeight || 100,
                      homeScreenContentSpacing: globalSettings.kioskTheme.layout?.homeScreenContentSpacing || 20,
                      homeScreenBottomButtonsPadding: globalSettings.kioskTheme.layout?.homeScreenBottomButtonsPadding || 50,
                      homeScreenBottomButtonsLeftPadding: globalSettings.kioskTheme.layout?.homeScreenBottomButtonsLeftPadding || 20,
                      // Home Screen Element Visibility
                      homeScreenWelcomeTextVisible: globalSettings.kioskTheme.layout?.homeScreenWelcomeTextVisible ?? true,
                      homeScreenHeader1Visible: globalSettings.kioskTheme.layout?.homeScreenHeader1Visible ?? true,
                      homeScreenTimeStatusVisible: globalSettings.kioskTheme.layout?.homeScreenTimeStatusVisible ?? true,
                      homeScreenTapToDonateVisible: globalSettings.kioskTheme.layout?.homeScreenTapToDonateVisible ?? true,
                      homeScreenWhatsAppButtonsVisible: globalSettings.kioskTheme.layout?.homeScreenWhatsAppButtonsVisible ?? true,
                      homeScreenLanguageSelectorVisible: globalSettings.kioskTheme.layout?.homeScreenLanguageSelectorVisible ?? true,
                      // Donation Details Page Layout
                      detailsPageHorizontalSpacing: globalSettings.kioskTheme.layout?.detailsPageHorizontalSpacing || 40,
                      detailsPageSidePadding: globalSettings.kioskTheme.layout?.detailsPageSidePadding || 60,
                      detailsPageTopPadding: globalSettings.kioskTheme.layout?.detailsPageTopPadding || 80,
                      detailsPageBottomPadding: globalSettings.kioskTheme.layout?.detailsPageBottomPadding || 40,
                      detailsCardMaxWidth: globalSettings.kioskTheme.layout?.detailsCardMaxWidth || 420,
                      donorFormMaxWidth: globalSettings.kioskTheme.layout?.donorFormMaxWidth || 420,
                      detailsCardPadding: globalSettings.kioskTheme.layout?.detailsCardPadding || 24,
                      detailsCardSpacing: globalSettings.kioskTheme.layout?.detailsCardSpacing || 16,
                      // Donation Details Page Fonts
                      detailsAmountFontSize: globalSettings.kioskTheme.layout?.detailsAmountFontSize || 56,
                      detailsLabelFontSize: globalSettings.kioskTheme.layout?.detailsLabelFontSize || 18,
                      detailsInputFontSize: globalSettings.kioskTheme.layout?.detailsInputFontSize || 18,
                      detailsButtonFontSize: globalSettings.kioskTheme.layout?.detailsButtonFontSize || 22,
                      // Donation Details Page Colors
                      detailsAmountColor: globalSettings.kioskTheme.layout?.detailsAmountColor || '#423232',
                      detailsTextColor: globalSettings.kioskTheme.layout?.detailsTextColor || '#423232',
                      detailsInputBorderColor: globalSettings.kioskTheme.layout?.detailsInputBorderColor || '#CCCCCC',
                      detailsInputFocusColor: globalSettings.kioskTheme.layout?.detailsInputFocusColor || '#3366CC',
                      detailsButtonColor: globalSettings.kioskTheme.layout?.detailsButtonColor || '#3366CC',
                      detailsButtonTextColor: globalSettings.kioskTheme.layout?.detailsButtonTextColor || '#FFFFFF',
                    },
                  })
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Change description (optional)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
          </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Kiosk theme is now global and applies to all temples. Changes made here will affect all kiosk devices across all temples.
        </p>
      </div>

      {globalSettings && (
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

          {/* Color Settings - Organized */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-6">Color Settings</h4>
            
            {/* Text Colors */}
            <div className="mb-8">
              <h5 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Text Colors</h5>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'headingColor', label: 'Heading Color' },
                  { key: 'bodyTextColor', label: 'Body Text Color' },
                  { key: 'subtitleColor', label: 'Subtitle Color' },
                  { key: 'quantityTotalColor', label: 'Quantity Total Color' },
                  { key: 'buttonTextColor', label: 'Button Text Color' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.colors[key as keyof typeof formData.colors] as string}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, [key]: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.colors[key as keyof typeof formData.colors] as string}
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

            {/* Category & Amount Button Colors */}
            <div className="mb-8">
              <h5 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Category & Amount Buttons</h5>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'categorySelectedColor', label: 'Category Selected' },
                  { key: 'categoryUnselectedColor', label: 'Category Unselected' },
                  { key: 'amountSelectedColor', label: 'Amount Selected' },
                  { key: 'amountUnselectedColor', label: 'Amount Unselected' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.colors[key as keyof typeof formData.colors] as string}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, [key]: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={formData.colors[key as keyof typeof formData.colors] as string}
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

            {/* Action Buttons */}
            <div className="mb-8">
              <h5 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Action Buttons</h5>
              <div className="space-y-4">

                {/* Donation Selection Page Buttons Section */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-2">Donation Selection Page Buttons</h3>
                  <p className="text-xs text-gray-500 mb-3">Controls the "Home" and "Select Amount to Continue" buttons at the bottom of the donation selection page</p>
                </div>

                {/* Return to Home Button */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Home Button (Donation Selection Page)</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-xs text-gray-600">Gradient</span>
                      <input
                        type="checkbox"
                        checked={formData.colors.returnToHomeButtonGradient}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, returnToHomeButtonGradient: e.target.checked }
                        })}
                        disabled={!isEditing}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.returnToHomeButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, returnToHomeButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={formData.colors.returnToHomeButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, returnToHomeButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Proceed to Payment Button */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Select Amount to Continue Button</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-xs text-gray-600">Gradient</span>
                      <input
                        type="checkbox"
                        checked={formData.colors.proceedToPaymentButtonGradient}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, proceedToPaymentButtonGradient: e.target.checked }
                        })}
                        disabled={!isEditing}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.proceedToPaymentButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, proceedToPaymentButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={formData.colors.proceedToPaymentButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, proceedToPaymentButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Done Button */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Done Button</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-xs text-gray-600">Gradient</span>
                      <input
                        type="checkbox"
                        checked={formData.colors.doneButtonGradient}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, doneButtonGradient: e.target.checked }
                        })}
                        disabled={!isEditing}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.doneButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, doneButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={formData.colors.doneButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, doneButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Continue Button (Keypad Popups) */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Continue Button (Donor Info Keypads)</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-xs text-gray-600">Gradient</span>
                      <input
                        type="checkbox"
                        checked={formData.colors.continueButtonGradient}
                        onChange={(e) => setFormData({
                          ...formData,
                          colors: { ...formData.colors, continueButtonGradient: e.target.checked }
                        })}
                        disabled={!isEditing}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.continueButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, continueButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={formData.colors.continueButtonColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, continueButtonColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Custom Amount Keypad Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Custom Amount Keypad</h4>
            <p className="text-xs text-gray-500 mb-4">Customize the appearance and position of the numeric keypad that appears when users enter a custom donation amount</p>
            
            <div className="space-y-6">
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

            {/* Home Screen Element Positioning (X/Y Coordinates) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Home Screen Element Positioning (X/Y Coordinates)</h4>
              <p className="text-xs text-gray-500 mb-4">
                Control exact position of each element using X and Y coordinates (in pixels from top-left corner).
                Leave empty to use default layout positioning. iPad 11-inch screen is 2388 × 1668 pixels.
              </p>
              
            {/* Home Screen Element Visibility (Hide/Unhide) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Home Screen Element Visibility</h4>
              <p className="text-xs text-gray-500 mb-4">
                Toggle visibility of elements on the home screen. Uncheck to hide an element.
              </p>
              
              <div className="space-y-4">
                {/* Welcome Text */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Welcome Text</label>
                    <p className="text-xs text-gray-500">"Welcome to Shree Swaminarayan Hindu Temple"</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenWelcomeTextVisible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenWelcomeTextVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>

                {/* Header 1 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Header 1 (ISSO Text)</label>
                    <p className="text-xs text-gray-500">"International Swaminarayan Satsang Organization (ISSO)"</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenHeader1Visible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenHeader1Visible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>

                {/* Time and Network Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Time and Network Status</label>
                    <p className="text-xs text-gray-500">Top right corner indicator</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenTimeStatusVisible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenTimeStatusVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>

                {/* Tap to Donate Button */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tap to Donate Button</label>
                    <p className="text-xs text-gray-500">Main donation button</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenTapToDonateVisible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenTapToDonateVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>

                {/* WhatsApp/Observances Buttons */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">WhatsApp/Observances Buttons</label>
                    <p className="text-xs text-gray-500">Bottom left corner buttons</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenWhatsAppButtonsVisible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenWhatsAppButtonsVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>

                {/* Language Selector */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Language Selector</label>
                    <p className="text-xs text-gray-500">Language selection (English | Gujarati | हिंदी)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.layout.homeScreenLanguageSelectorVisible ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenLanguageSelectorVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:bg-gray-200"
                  />
                </div>
              </div>
            </div>

          {/* Layout Settings */}
          <div className="space-y-6">
            {/* Home Screen Layout Positioning */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Home Screen Layout Positioning</h4>
              <p className="text-xs text-gray-500 mb-4">Control the positioning of elements on the home screen</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Top Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Distance from top of screen to headers (default: 60)</p>
                  <input
                    type="number"
                    value={formData.layout.homeScreenHeaderTopPadding ?? 60}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenHeaderTopPadding: parseInt(e.target.value) || 60 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spacer Above Button
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Max height of space above "Tap to Donate" button (default: 100)</p>
                  <input
                    type="number"
                    value={formData.layout.homeScreenSpacerMaxHeight ?? 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenSpacerMaxHeight: parseInt(e.target.value) || 100 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Spacing
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Spacing between content elements (default: 20)</p>
                  <input
                    type="number"
                    value={formData.layout.homeScreenContentSpacing ?? 20}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenContentSpacing: parseInt(e.target.value) || 20 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Buttons Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Distance from bottom for WhatsApp/Observances buttons (default: 50)</p>
                  <input
                    type="number"
                    value={formData.layout.homeScreenBottomButtonsPadding ?? 50}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenBottomButtonsPadding: parseInt(e.target.value) || 50 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Buttons Left Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Distance from left edge for bottom buttons (default: 20)</p>
                  <input
                    type="number"
                    value={formData.layout.homeScreenBottomButtonsLeftPadding ?? 20}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, homeScreenBottomButtonsLeftPadding: parseInt(e.target.value) || 20 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

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
                    Select Amount Top Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from top of screen to "Select Amount" section</p>
                  <input
                    type="number"
                    value={formData.layout.headerTopPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, headerTopPadding: parseInt(e.target.value) || 80 }
                    })}
                    disabled={!isEditing}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Category Top Padding
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Space from top of screen to "Select Category" section</p>
                  <input
                    type="number"
                    value={formData.layout.categoryHeaderTopPadding}
                    onChange={(e) => setFormData({
                      ...formData,
                      layout: { ...formData.layout, categoryHeaderTopPadding: parseInt(e.target.value) || 80 }
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
        </>
      )}
    </div>
  )
}

