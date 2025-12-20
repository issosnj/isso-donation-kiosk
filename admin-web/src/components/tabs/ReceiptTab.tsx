'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface ReceiptTabProps {
  templeId: string
}

export default function ReceiptTab({ templeId }: ReceiptTabProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fromEmail: '',
    fromName: '',
    subject: '',
    headerText: '',
    footerText: '',
    includeTaxId: false,
    taxId: '',
    customMessage: '',
  })

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  useEffect(() => {
    if (temple?.receiptConfig) {
      setFormData({
        fromEmail: temple.receiptConfig.fromEmail || '',
        fromName: temple.receiptConfig.fromName || '',
        subject: temple.receiptConfig.subject || 'Donation Receipt - {{templeName}}',
        headerText: temple.receiptConfig.headerText || 'Thank You for Your Donation',
        footerText: temple.receiptConfig.footerText || 'Your donation helps support our temple',
        includeTaxId: temple.receiptConfig.includeTaxId || false,
        taxId: temple.receiptConfig.taxId || '',
        customMessage: temple.receiptConfig.customMessage || '',
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
    updateMutation.mutate(formData)
  }

  const handleCancel = () => {
    if (temple?.receiptConfig) {
      setFormData({
        fromEmail: temple.receiptConfig.fromEmail || '',
        fromName: temple.receiptConfig.fromName || '',
        subject: temple.receiptConfig.subject || 'Donation Receipt - {{templeName}}',
        headerText: temple.receiptConfig.headerText || 'Thank You for Your Donation',
        footerText: temple.receiptConfig.footerText || 'Your donation helps support our temple',
        includeTaxId: temple.receiptConfig.includeTaxId || false,
        taxId: temple.receiptConfig.taxId || '',
        customMessage: temple.receiptConfig.customMessage || '',
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
        {!isEditing ? (
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
        )}
      </div>

      <div className="space-y-6">
        {/* Email Settings */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
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

        {/* Receipt Content */}
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

        {/* Tax Information */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID (EIN)
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  disabled={!isEditing}
                  placeholder="12-3456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

