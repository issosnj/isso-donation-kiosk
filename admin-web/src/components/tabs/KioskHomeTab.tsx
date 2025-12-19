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
    customMessage: '',
    whatsAppLink: '',
    eventsText: '',
    googleCalendarLink: '',
    socialMedia: [] as Array<{ platform: string; url: string }>,
  })

  useEffect(() => {
    if (temple?.homeScreenConfig) {
      setFormData({
        idleTimeoutSeconds: temple.homeScreenConfig.idleTimeoutSeconds || 60,
        customMessage: temple.homeScreenConfig.customMessage || '',
        whatsAppLink: temple.homeScreenConfig.whatsAppLink || '',
        eventsText: temple.homeScreenConfig.eventsText || '',
        googleCalendarLink: temple.homeScreenConfig.googleCalendarLink || '',
        socialMedia: temple.homeScreenConfig.socialMedia || [],
      })
    }
  }, [temple])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/temples/${templeId}`, {
        homeScreenConfig: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      setIsEditing(false)
    },
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const addSocialMedia = () => {
    setFormData({
      ...formData,
      socialMedia: [...formData.socialMedia, { platform: '', url: '' }],
    })
  }

  const removeSocialMedia = (index: number) => {
    setFormData({
      ...formData,
      socialMedia: formData.socialMedia.filter((_, i) => i !== index),
    })
  }

  const updateSocialMedia = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...formData.socialMedia]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, socialMedia: updated })
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
                    customMessage: temple.homeScreenConfig.customMessage || '',
                    whatsAppLink: temple.homeScreenConfig.whatsAppLink || '',
                    eventsText: temple.homeScreenConfig.eventsText || '',
                    googleCalendarLink: temple.homeScreenConfig.googleCalendarLink || '',
                    socialMedia: temple.homeScreenConfig.socialMedia || [],
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

        {/* Custom Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message (Bottom of Screen)
          </label>
          <textarea
            value={formData.customMessage}
            onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
            disabled={!isEditing}
            rows={3}
            placeholder="e.g., Thank you for your support!"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
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
          <p className="mt-1 text-xs text-gray-500">QR code will be generated automatically</p>
        </div>

        {/* Google Calendar Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Google Calendar Public Link
          </label>
          <input
            type="url"
            value={formData.googleCalendarLink}
            onChange={(e) => setFormData({ ...formData, googleCalendarLink: e.target.value })}
            disabled={!isEditing}
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Get your public calendar link from Google Calendar settings. The kiosk will display upcoming events from this calendar.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            To get your public link: Google Calendar → Settings → Calendar → Access permissions → Make available to public → Copy the public URL
          </p>
        </div>

        {/* Note about Events Calendar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Events Management:</strong> Use the "Events Calendar" tab to add and manage events.
            Events from Google Calendar are automatically synced when a calendar link is provided above.
          </p>
        </div>

        {/* Social Media */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Social Media Links
            </label>
            {isEditing && (
              <button
                onClick={addSocialMedia}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Social Media
              </button>
            )}
          </div>
          <div className="space-y-3">
            {formData.socialMedia.map((item, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  value={item.platform}
                  onChange={(e) => updateSocialMedia(index, 'platform', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Platform (e.g., Facebook, Instagram)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => updateSocialMedia(index, 'url', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
                {isEditing && (
                  <button
                    onClick={() => removeSocialMedia(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {formData.socialMedia.length === 0 && !isEditing && (
              <p className="text-sm text-gray-500">No social media links configured</p>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">QR codes will be generated automatically for each link</p>
        </div>
      </div>
    </div>
  )
}

