'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface ReligiousEvent {
  id: string
  name: string
  description?: string
  date: string
  startTime?: string
  isRecurring: boolean
  recurrencePattern?: string
  displayOrder: number
  isActive: boolean
  googleCalendarLinks?: string[]
  createdAt: string
  updatedAt: string
}

export default function ReligiousEventsTab() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    isRecurring: true,
    recurrencePattern: '',
    displayOrder: 0,
    isActive: true,
    googleCalendarLinks: [] as string[],
  })
  const [newCalendarLink, setNewCalendarLink] = useState('')

  const { data: events = [], isLoading } = useQuery<ReligiousEvent[]>({
    queryKey: ['religious-events'],
    queryFn: async () => {
      const response = await api.get('/religious-events')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ReligiousEvent>) => {
      const response = await api.post('/religious-events', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religious-events'] })
      setIsCreating(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReligiousEvent> }) => {
      const response = await api.patch(`/religious-events/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religious-events'] })
      setEditingId(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/religious-events/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religious-events'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      date: '',
      startTime: '',
      isRecurring: true,
      recurrencePattern: '',
      displayOrder: 0,
      isActive: true,
      googleCalendarLinks: [],
    })
    setNewCalendarLink('')
  }

  const handleEdit = (event: ReligiousEvent) => {
    setEditingId(event.id)
    setFormData({
      name: event.name,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime || '',
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern || '',
      displayOrder: event.displayOrder,
      isActive: event.isActive,
      googleCalendarLinks: event.googleCalendarLinks || [],
    })
    setNewCalendarLink('')
  }

  const handleAddCalendarLink = () => {
    if (newCalendarLink.trim()) {
      setFormData({
        ...formData,
        googleCalendarLinks: [...(formData.googleCalendarLinks || []), newCalendarLink.trim()],
      })
      setNewCalendarLink('')
    }
  }

  const handleRemoveCalendarLink = (index: number) => {
    setFormData({
      ...formData,
      googleCalendarLinks: formData.googleCalendarLinks?.filter((_, i) => i !== index) || [],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this religious event?')) {
      deleteMutation.mutate(id)
    }
  }

  // Sort events by date, then by display order
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) {
      return dateA - dateB
    }
    return a.displayOrder - b.displayOrder
  })

  // Filter to show upcoming events first, then past events
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingEvents = sortedEvents.filter(
    (event) => new Date(event.date) >= today && event.isActive
  )
  const pastEvents = sortedEvents.filter(
    (event) => new Date(event.date) < today || !event.isActive
  )

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Religious Observances</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage religious events like Poonam, Upvas, Ekadashi, etc. These are visible on all kiosks.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true)
            setEditingId(null)
            resetForm()
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Add Observance
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Observance' : 'New Observance'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Poonam, Upvas, Ekadashi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Optional description of the observance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time (optional)
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Recurring Event</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            {/* Google Calendar Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Calendar Links
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add Google public calendar URLs to automatically fetch events for this observance
              </p>
              <div className="space-y-2">
                {formData.googleCalendarLinks && formData.googleCalendarLinks.length > 0 && (
                  <div className="space-y-2">
                    {formData.googleCalendarLinks.map((link, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-blue-600 hover:text-blue-800 truncate"
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveCalendarLink(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={newCalendarLink}
                    onChange={(e) => setNewCalendarLink(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/embed?src=..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCalendarLink()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCalendarLink}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false)
                  setEditingId(null)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Observances</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.name}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.startTime || 'All Day'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.googleCalendarLinks && event.googleCalendarLinks.length > 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {event.googleCalendarLinks.length} {event.googleCalendarLinks.length === 1 ? 'link' : 'links'}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.displayOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-purple-600 hover:text-purple-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Past / Inactive Observances</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calendar Links
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastEvents.map((event) => (
                    <tr key={event.id} className={!event.isActive ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.name}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.startTime || 'All Day'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.googleCalendarLinks && event.googleCalendarLinks.length > 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {event.googleCalendarLinks.length} {event.googleCalendarLinks.length === 1 ? 'link' : 'links'}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            event.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {event.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-purple-600 hover:text-purple-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No religious observances</h3>
            <p className="text-sm text-gray-500 mb-4">
              Get started by creating your first religious observance
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Add Observance
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

