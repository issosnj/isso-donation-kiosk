'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import DevicesTab from './DevicesTab'
import CategoriesTab from './CategoriesTab'
import SquareTab from './SquareTab'
import KioskHomeTab from './KioskHomeTab'

interface TempleEditViewProps {
  templeId: string
  onBack: () => void
}

export default function TempleEditView({ templeId, onBack }: TempleEditViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'devices' | 'categories' | 'square' | 'kiosk'>('info')
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timezone: '',
    defaultCurrency: 'USD',
    logoUrl: '',
    branding: {
      primaryColor: '',
      secondaryColor: '',
    },
  })

  // Initialize form data when temple loads
  useEffect(() => {
    if (temple) {
      setFormData({
        name: temple.name || '',
        address: temple.address || '',
        timezone: temple.timezone || '',
        defaultCurrency: temple.defaultCurrency || 'USD',
        logoUrl: temple.logoUrl || '',
        branding: {
          primaryColor: temple.branding?.primaryColor || '',
          secondaryColor: temple.branding?.secondaryColor || '',
        },
      })
    }
  }, [temple])

  const updateTempleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/temples/${templeId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      setIsEditing(false)
    },
  })

  const deleteTempleMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/temples/${templeId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      onBack()
    },
  })

  const handleSave = () => {
    updateTempleMutation.mutate(formData)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${temple?.name}"? This action cannot be undone.`)) {
      deleteTempleMutation.mutate()
    }
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

  if (!temple) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Temple not found
      </div>
    )
  }

  const tabs = [
    { id: 'info', label: 'Basic Info', icon: '📝' },
    { id: 'devices', label: 'Devices', icon: '📱' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'square', label: 'Square', icon: '💳' },
    { id: 'kiosk', label: 'Kiosk Home', icon: '🏠' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{temple.name}</h2>
            <p className="text-sm text-gray-600">Manage temple settings and related data</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  // Reset form data
                  setFormData({
                    name: temple.name || '',
                    address: temple.address || '',
                    timezone: temple.timezone || '',
                    defaultCurrency: temple.defaultCurrency || 'USD',
                    logoUrl: temple.logoUrl || '',
                    branding: {
                      primaryColor: temple.branding?.primaryColor || '',
                      secondaryColor: temple.branding?.secondaryColor || '',
                    },
                  })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateTempleMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {updateTempleMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTempleMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {deleteTempleMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temple Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g., America/New_York"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                disabled={!isEditing}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
              {formData.logoUrl && (
                <div className="mt-2">
                  <img src={formData.logoUrl} alt="Logo preview" className="h-20 w-20 object-contain border border-gray-200 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Branding Colors
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Primary Color</label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={formData.branding.primaryColor || '#9333ea'}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding, primaryColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formData.branding.primaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding, primaryColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#9333ea"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Secondary Color</label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={formData.branding.secondaryColor || '#a855f7'}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding, secondaryColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formData.branding.secondaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding, secondaryColor: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="#a855f7"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Temple Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{temple.devices?.length || 0}</div>
                  <div className="text-sm text-gray-600">Devices</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{temple.categories?.length || 0}</div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{temple.donations?.length || 0}</div>
                  <div className="text-sm text-gray-600">Donations</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'devices' && <DevicesTab templeId={templeId} />}
        {activeTab === 'categories' && <CategoriesTab templeId={templeId} />}
        {activeTab === 'square' && <SquareTab templeId={templeId} />}
        {activeTab === 'kiosk' && <KioskHomeTab templeId={templeId} />}
      </div>
    </div>
  )
}

