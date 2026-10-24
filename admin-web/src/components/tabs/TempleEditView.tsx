'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader, {
  headerDangerButtonClass,
  headerPrimaryButtonClass,
  headerSecondaryButtonClass,
} from '@/components/layout/PageHeader'
import { KpiGrid, KpiStatCard } from '@/components/ui/KpiStatCard'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import DevicesTab from './DevicesTab'
import CategoriesTab from './CategoriesTab'
import StripeTab from './StripeTab'
import KioskHomeTab from './KioskHomeTab'

interface TempleEditViewProps {
  templeId: string
  onBack: () => void
}

export default function TempleEditView({ templeId, onBack }: TempleEditViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'devices' | 'categories' | 'stripe' | 'events' | 'kiosk'>('info')
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isMasterAdmin = user?.role === 'MASTER_ADMIN'

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const { data: donationStats } = useQuery({
    queryKey: ['donation-stats', templeId, 'all-succeeded'],
    queryFn: async () => {
      const response = await api.get('/donations/stats', { params: { templeId } })
      return response.data as { count?: number }
    },
    enabled: !!templeId,
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    templeCode: '',
    address: '',
    timezone: '',
    defaultCurrency: 'USD',
    yajmanOpportunitiesEnabled: false,
  })

  // Initialize form data when temple loads
  useEffect(() => {
    if (temple) {
      setFormData({
        name: temple.name || '',
        templeCode: temple.templeCode || '',
        address: temple.address || '',
        timezone: temple.timezone || '',
        defaultCurrency: temple.defaultCurrency || 'USD',
        yajmanOpportunitiesEnabled: temple.yajmanOpportunitiesEnabled || false,
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
    { id: 'info', label: 'Basic Info' },
    { id: 'devices', label: 'Devices' },
    { id: 'categories', label: 'Categories' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'kiosk', label: 'Kiosk Home' },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          ← Temples
        </button>
        <PageHeader
          title={temple.name}
          description="Manage temple settings, devices, categories, and Stripe."
          actions={
            isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      name: temple.name || '',
                      templeCode: temple.templeCode || '',
                      address: temple.address || '',
                      timezone: temple.timezone || '',
                      defaultCurrency: temple.defaultCurrency || 'USD',
                      yajmanOpportunitiesEnabled: temple.yajmanOpportunitiesEnabled || false,
                    })
                  }}
                  className={headerSecondaryButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateTempleMutation.isPending}
                  className={headerPrimaryButtonClass}
                >
                  {updateTempleMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setIsEditing(true)} className={headerPrimaryButtonClass}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteTempleMutation.isPending}
                  className={headerDangerButtonClass}
                >
                  {deleteTempleMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )
          }
        />
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
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temple Code
              </label>
              <input
                type="text"
                value={formData.templeCode}
                onChange={(e) => setFormData({ ...formData, templeCode: e.target.value.toUpperCase() })}
                disabled={!isEditing}
                placeholder="e.g., ISSO, NJ01"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">Used in receipt numbers (e.g., ISSO - K - 0001)</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>


            {isMasterAdmin && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yajman Opportunities (Sponsorship Tiers)
                    </label>
                    <p className="text-xs text-gray-500">
                      Enable yajman sponsorship tiers (Platinum, Gold, Silver) for this temple
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.yajmanOpportunitiesEnabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        yajmanOpportunitiesEnabled: e.target.checked
                      })}
                      disabled={!isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Temple statistics</h3>
              <KpiGrid count={3}>
                <KpiStatCard
                  label="Devices"
                  value={String(temple.devices?.length || 0)}
                  insight="Registered kiosks"
                  iconPath="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  gradient="from-orange-500 to-orange-600"
                />
                <KpiStatCard
                  label="Categories"
                  value={String(temple.categories?.length || 0)}
                  insight="Donation categories"
                  iconPath="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  gradient="from-sky-500 to-blue-600"
                />
                <KpiStatCard
                  label="Donations"
                  value={donationStats ? String(donationStats.count ?? 0) : '—'}
                  insight="Succeeded gifts"
                  iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  gradient="from-emerald-500 to-teal-600"
                />
              </KpiGrid>
            </div>
          </div>
        )}

              {activeTab === 'devices' && <DevicesTab templeId={templeId} embedded />}
              {activeTab === 'categories' && <CategoriesTab templeId={templeId} embedded />}
              {activeTab === 'stripe' && <StripeTab templeId={templeId} embedded />}
              {activeTab === 'kiosk' && <KioskHomeTab templeId={templeId} />}
      </div>
    </div>
  )
}

