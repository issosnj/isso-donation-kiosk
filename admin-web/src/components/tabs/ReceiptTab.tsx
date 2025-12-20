'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface ReceiptTabProps {
  templeId: string
  isMasterAdmin?: boolean
}

export default function ReceiptTab({ templeId, isMasterAdmin = false }: ReceiptTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [gmailSuccessMessage, setGmailSuccessMessage] = useState<string | null>(null)
  const [gmailErrorMessage, setGmailErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // Email settings
    fromEmail: '',
    fromName: '',
    subject: '',
    // Receipt header
    organizationName: '',
    organizationSubtitle: '',
    headerTitle: '',
    logoUrl: '',
    // Contact information
    showContactInfo: true,
    phone: '',
    email: '',
    website: '',
    // Receipt content
    headerText: '',
    footerText: '',
    customMessage: '',
    thankYouMessage: '',
    // Tax information
    includeTaxId: false,
    taxId: '',
    taxExemptMessage: '',
    // Additional fields
    showPreparedBy: false,
    preparedBy: '',
    showPaymentMethod: true,
    showAmountInWords: true,
  })

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  // Check for Gmail OAuth callback success/error from URL params
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    const gmailConnected = urlParams.get('gmailConnected')
    const gmailError = urlParams.get('gmailError')
    const connectedTempleId = urlParams.get('templeId')
    
    if (gmailConnected === 'true' && connectedTempleId === templeId) {
      setGmailSuccessMessage('Gmail account connected successfully!')
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      
      urlParams.delete('gmailConnected')
      urlParams.delete('templeId')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
      
      setTimeout(() => setGmailSuccessMessage(null), 5000)
    }
    
    if (gmailError) {
      setGmailErrorMessage(decodeURIComponent(gmailError))
      urlParams.delete('gmailError')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
      setTimeout(() => setGmailErrorMessage(null), 10000)
    }
  }, [templeId, queryClient, router])

  const handleConnectGmail = async () => {
    try {
      const response = await api.get('/gmail/connect', {
        params: { templeId },
      })
      window.location.href = response.data.oauthUrl
    } catch (error: any) {
      console.error('Failed to connect Gmail:', error)
      setGmailErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Gmail connection')
    }
  }

  const handleDisconnectGmail = async () => {
    if (confirm('Are you sure you want to disconnect Gmail? Receipt emails will not be sent until Gmail is reconnected.')) {
      try {
        await api.get('/gmail/disconnect', {
          params: { templeId },
        })
        queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
        alert('Gmail account disconnected successfully')
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to disconnect Gmail')
      }
    }
  }

  useEffect(() => {
    if (temple?.receiptConfig) {
      const config = temple.receiptConfig
      setFormData({
        fromEmail: config.fromEmail || '',
        fromName: config.fromName || '',
        subject: config.subject || 'Donation Receipt - {{templeName}}',
        organizationName: config.organizationName || '',
        organizationSubtitle: config.organizationSubtitle || '',
        headerTitle: config.headerTitle || '',
        logoUrl: config.logoUrl || '',
        showContactInfo: config.showContactInfo !== false,
        phone: config.phone || '',
        email: config.email || '',
        website: config.website || '',
        headerText: config.headerText || 'Thank You for Your Donation',
        footerText: config.footerText || 'Your donation helps support our temple',
        customMessage: config.customMessage || '',
        thankYouMessage: config.thankYouMessage || '',
        includeTaxId: config.includeTaxId || false,
        taxId: config.taxId || '',
        taxExemptMessage: config.taxExemptMessage || '',
        showPreparedBy: config.showPreparedBy || false,
        preparedBy: config.preparedBy || '',
        showPaymentMethod: config.showPaymentMethod !== false,
        showAmountInWords: config.showAmountInWords !== false,
      })
    }
  }, [temple])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/temples/${templeId}`, {
        receiptConfig: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      setIsEditing(false)
      alert('Receipt configuration saved successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to save receipt configuration')
    },
  })

  const handleSave = () => {
    if (isMasterAdmin) {
      // Master admin can save all fields
      updateMutation.mutate(formData)
    } else {
      // Temple admin can only save contact information - merge with existing config
      const existingConfig = temple?.receiptConfig || {}
      updateMutation.mutate({
        ...existingConfig,
        showContactInfo: formData.showContactInfo,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
      })
    }
  }

  const handleCancel = () => {
    if (temple?.receiptConfig) {
      const config = temple.receiptConfig
      setFormData({
        fromEmail: config.fromEmail || '',
        fromName: config.fromName || '',
        subject: config.subject || 'Donation Receipt - {{templeName}}',
        organizationName: config.organizationName || '',
        organizationSubtitle: config.organizationSubtitle || '',
        headerTitle: config.headerTitle || '',
        logoUrl: config.logoUrl || '',
        showContactInfo: config.showContactInfo !== false,
        phone: config.phone || '',
        email: config.email || '',
        website: config.website || '',
        headerText: config.headerText || 'Thank You for Your Donation',
        footerText: config.footerText || 'Your donation helps support our temple',
        customMessage: config.customMessage || '',
        thankYouMessage: config.thankYouMessage || '',
        includeTaxId: config.includeTaxId || false,
        taxId: config.taxId || '',
        taxExemptMessage: config.taxExemptMessage || '',
        showPreparedBy: config.showPreparedBy || false,
        preparedBy: config.preparedBy || '',
        showPaymentMethod: config.showPaymentMethod !== false,
        showAmountInWords: config.showAmountInWords !== false,
      })
    }
    setIsEditing(false)
  }

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
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receipt Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize how donation receipts are sent to donors
          </p>
        </div>
        {isMasterAdmin && (
          !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Edit Configuration
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        )}
        {!isMasterAdmin && (
          !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Edit Contact Information
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        )}
      </div>

      {/* Gmail Connection Status */}
      {(gmailSuccessMessage || gmailErrorMessage) && (
        <div className={`mb-4 p-4 rounded-lg ${
          gmailSuccessMessage ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {gmailSuccessMessage || gmailErrorMessage}
        </div>
      )}

      {/* Gmail Connection */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Gmail Account</h3>
            <p className="text-sm text-gray-600">
              {temple?.gmailEmail 
                ? `Connected: ${temple.gmailEmail}` 
                : 'Connect your Gmail account to send receipt emails'}
            </p>
          </div>
          {temple?.gmailEmail ? (
            <button
              onClick={handleDisconnectGmail}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect Gmail
            </button>
          ) : (
            <button
              onClick={handleConnectGmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Email Settings - Master Admin Only */}
        {isMasterAdmin && (
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
            <p className="text-sm text-gray-600 mb-4">
              {temple?.gmailEmail 
                ? `Emails will be sent from your connected Gmail account (${temple.gmailEmail}). The "From Email" and "From Name" below will be used as the display name.`
                : 'Connect Gmail above to enable email sending. Until then, these settings are for display purposes only.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  disabled={!isEditing}
                  placeholder="donations@temple.org"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email address receipts will be sent from</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  disabled={!isEditing}
                  placeholder={temple?.name || 'Temple Name'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Display name for email sender</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Donation Receipt - {{templeName}}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Use {'{{templeName}}'} to insert temple name</p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Header - Master Admin Only */}
        {isMasterAdmin && (
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Header</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  disabled={!isEditing}
                  placeholder="International Swaminarayan Satsang Organization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Subtitle
                </label>
                <input
                  type="text"
                  value={formData.organizationSubtitle}
                  onChange={(e) => setFormData({ ...formData, organizationSubtitle: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Under Shree NarNarayandev Gadi - The Original Swaminarayan Sampradaya"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Header Title (Top Center)
                </label>
                <input
                  type="text"
                  value={formData.headerTitle}
                  onChange={(e) => setFormData({ ...formData, headerTitle: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Shree Swaminarayan Vijaytetram"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Information - Visible to both Temple Admin and Master Admin */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showContactInfo"
                checked={formData.showContactInfo}
                onChange={(e) => setFormData({ ...formData, showContactInfo: e.target.checked })}
                disabled={!isEditing || !isMasterAdmin}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:bg-gray-100"
              />
              <label htmlFor="showContactInfo" className="ml-2 text-sm font-medium text-gray-700">
                Show contact information on receipt
              </label>
              {!isMasterAdmin && (
                <span className="ml-2 text-xs text-gray-500">(Master Admin only)</span>
              )}
            </div>
            {formData.showContactInfo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="(856) 829-4776"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    placeholder="snj@issousa.org"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={!isEditing}
                    placeholder="www.issousa.org"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Content - Master Admin Only */}
        {isMasterAdmin && (
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Header Text
                </label>
                <input
                  type="text"
                  value={formData.headerText}
                  onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Thank You for Your Donation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thank You Message
                </label>
                <input
                  type="text"
                  value={formData.thankYouMessage}
                  onChange={(e) => setFormData({ ...formData, thankYouMessage: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Thank you for your kind donation, your donation may be tax deductible."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Message
                </label>
                <textarea
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Optional custom message to include in receipt"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your donation helps support our temple"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Display Options - Master Admin Only */}
        {isMasterAdmin && (
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showAmountInWords"
                  checked={formData.showAmountInWords}
                  onChange={(e) => setFormData({ ...formData, showAmountInWords: e.target.checked })}
                  disabled={!isEditing}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:bg-gray-100"
                />
                <label htmlFor="showAmountInWords" className="ml-2 text-sm font-medium text-gray-700">
                  Show amount in words
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showPaymentMethod"
                  checked={formData.showPaymentMethod}
                  onChange={(e) => setFormData({ ...formData, showPaymentMethod: e.target.checked })}
                  disabled={!isEditing}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:bg-gray-100"
                />
                <label htmlFor="showPaymentMethod" className="ml-2 text-sm font-medium text-gray-700">
                  Show payment method
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showPreparedBy"
                  checked={formData.showPreparedBy}
                  onChange={(e) => setFormData({ ...formData, showPreparedBy: e.target.checked })}
                  disabled={!isEditing}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:bg-gray-100"
                />
                <label htmlFor="showPreparedBy" className="ml-2 text-sm font-medium text-gray-700">
                  Show "Prepared by" field
                </label>
              </div>
              {formData.showPreparedBy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prepared By Name
                  </label>
                  <input
                    type="text"
                    value={formData.preparedBy}
                    onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Vijay Patel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tax Information - Master Admin Only */}
        {isMasterAdmin && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeTaxId"
                  checked={formData.includeTaxId}
                  onChange={(e) => setFormData({ ...formData, includeTaxId: e.target.checked })}
                  disabled={!isEditing}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:bg-gray-100"
                />
                <label htmlFor="includeTaxId" className="ml-2 text-sm font-medium text-gray-700">
                  Include Tax ID (EIN) in receipts
                </label>
              </div>
              {formData.includeTaxId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID (EIN)
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      disabled={!isEditing}
                      placeholder="22-2290410"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Exempt Message
                    </label>
                    <textarea
                      value={formData.taxExemptMessage}
                      onChange={(e) => setFormData({ ...formData, taxExemptMessage: e.target.value })}
                      disabled={!isEditing}
                      placeholder="ISSO (EIN#22-2290410) is recognized by IRS as 501(c)(3) tax exempt organization, please visit us at www.issousa.org"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

