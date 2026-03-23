'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface KioskHomeTabProps {
  templeId: string
}

export default function KioskHomeTab({ templeId }: KioskHomeTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const [formData, setFormData] = useState({
    idleTimeoutSeconds: 60,
    whatsAppLink: '',
    observanceCalendarUrl: '',
    googleCalendarLink: '',
    presetAmounts: [5, 10, 25, 50, 100] as number[],
  })

  useEffect(() => {
    if (temple?.homeScreenConfig) {
      setFormData({
        idleTimeoutSeconds: temple.homeScreenConfig.idleTimeoutSeconds || 60,
        whatsAppLink: temple.homeScreenConfig.whatsAppLink || '',
        observanceCalendarUrl: temple.homeScreenConfig.observanceCalendarUrl || '',
        googleCalendarLink: temple.homeScreenConfig.googleCalendarLink || '',
        presetAmounts: temple.homeScreenConfig.presetAmounts || [5, 10, 25, 50, 100],
      })
    }
  }, [temple])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/temples/${templeId}`, {
        homeScreenConfig: { ...temple?.homeScreenConfig, ...data },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      setIsEditing(false)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      idleTimeoutSeconds: formData.idleTimeoutSeconds,
      whatsAppLink: formData.whatsAppLink || undefined,
      observanceCalendarUrl: formData.observanceCalendarUrl || undefined,
      googleCalendarLink: formData.googleCalendarLink || undefined,
      presetAmounts: formData.presetAmounts,
    })
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Kiosk Home Screen Configuration</h3>
          <p className="text-sm text-gray-600">Configure what donors see on the kiosk home screen</p>
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
                if (temple?.homeScreenConfig) {
                  setFormData({
                    idleTimeoutSeconds: temple.homeScreenConfig.idleTimeoutSeconds || 60,
                    whatsAppLink: temple.homeScreenConfig.whatsAppLink || '',
                    observanceCalendarUrl: temple.homeScreenConfig.observanceCalendarUrl || '',
                    googleCalendarLink: temple.homeScreenConfig.googleCalendarLink || '',
                    presetAmounts: temple.homeScreenConfig.presetAmounts || [5, 10, 25, 50, 100],
                  })
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
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

      <div className="space-y-6">
        {/* Idle Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Auto-return to Home (seconds)
          </label>
          <input
            type="number"
            value={formData.idleTimeoutSeconds}
            onChange={(e) => setFormData({ ...formData, idleTimeoutSeconds: parseInt(e.target.value) || 60 })}
            disabled={!isEditing}
            min="10"
            max="300"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Time in seconds before kiosk returns to home screen after inactivity (10-300)</p>
        </div>

        {/* WhatsApp Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Group Link
          </label>
          <input
            type="url"
            value={formData.whatsAppLink}
            onChange={(e) => setFormData({ ...formData, whatsAppLink: e.target.value })}
            disabled={!isEditing}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">QR code will be generated automatically on the kiosk</p>
        </div>

        {/* Observance Calendar URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observance Calendar URL
          </label>
          <input
            type="url"
            value={formData.observanceCalendarUrl}
            onChange={(e) => setFormData({ ...formData, observanceCalendarUrl: e.target.value })}
            disabled={!isEditing}
            placeholder="https://calendar.google.com/calendar/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Google Calendar public URL for religious observances. When set, kiosk will use this instead of global events.</p>
        </div>

        {/* Events Calendar Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Events Calendar Link
          </label>
          <input
            type="url"
            value={formData.googleCalendarLink}
            onChange={(e) => setFormData({ ...formData, googleCalendarLink: e.target.value })}
            disabled={!isEditing}
            placeholder="https://calendar.google.com/calendar/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Link to temple events calendar (displayed on kiosk)</p>
        </div>

        {/* Preset Donation Amounts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preset Donation Amounts
          </label>
          <div className="space-y-3">
            {formData.presetAmounts.map((amount, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 w-12">${amount}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const newAmounts = [...formData.presetAmounts]
                    newAmounts[index] = parseFloat(e.target.value) || 0
                    setFormData({ ...formData, presetAmounts: newAmounts })
                  }}
                  disabled={!isEditing}
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
                {isEditing && (
                  <button
                    onClick={() => {
                      const newAmounts = formData.presetAmounts.filter((_, i) => i !== index)
                      setFormData({ ...formData, presetAmounts: newAmounts })
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    presetAmounts: [...formData.presetAmounts, 0],
                  })
                }}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-purple-500 hover:text-purple-600 transition-colors font-medium"
              >
                + Add Preset Amount
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            These amounts will appear as quick-select buttons on the donation screen. Donors can also enter a custom amount.
          </p>
        </div>


      </div>
    </div>
  )
}

