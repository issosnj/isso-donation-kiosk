'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import api from '@/lib/api'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/20/solid'

interface EventsCalendarTabProps {
  templeId: string
}

interface LocalEvent {
  id: string
  title: string
  description?: string
  date: string // ISO date string (YYYY-MM-DD)
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  isAllDay?: boolean
}

export default function EventsCalendarTab({ templeId }: EventsCalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    isAllDay: true,
  })
  const queryClient = useQueryClient()

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const localEvents: LocalEvent[] = temple?.homeScreenConfig?.localEvents || []
  const googleCalendarLink = temple?.homeScreenConfig?.googleCalendarLink || ''

  const updateEventsMutation = useMutation({
    mutationFn: async (events: LocalEvent[]) => {
      const response = await api.patch(`/temples/${templeId}`, {
        homeScreenConfig: {
          ...temple?.homeScreenConfig,
          localEvents: events,
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      setShowEventForm(false)
      setEditingEvent(null)
      resetForm()
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const updatedEvents = localEvents.filter(e => e.id !== eventId)
      const response = await api.patch(`/temples/${templeId}`, {
        homeScreenConfig: {
          ...temple?.homeScreenConfig,
          localEvents: updatedEvents,
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
    },
  })

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      isAllDay: true,
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setEventForm(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }))
    setShowEventForm(true)
    setEditingEvent(null)
  }

  const handleEditEvent = (event: LocalEvent) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      isAllDay: event.isAllDay ?? true,
    })
    setSelectedDate(parseISO(event.date))
    setShowEventForm(true)
  }

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) return

    const event: LocalEvent = {
      id: editingEvent?.id || `event-${Date.now()}`,
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || undefined,
      date: eventForm.date,
      startTime: eventForm.isAllDay ? undefined : eventForm.startTime || undefined,
      endTime: eventForm.isAllDay ? undefined : eventForm.endTime || undefined,
      isAllDay: eventForm.isAllDay,
    }

    let updatedEvents: LocalEvent[]
    if (editingEvent) {
      updatedEvents = localEvents.map(e => e.id === editingEvent.id ? event : e)
    } else {
      updatedEvents = [...localEvents, event]
    }

    updateEventsMutation.mutate(updatedEvents)
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const calendarStart = startOfMonth(currentDate)
  const calendarEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Get first day of week for the month
  const firstDayOfWeek = calendarStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  const getEventsForDate = (date: Date) => {
    return localEvents.filter(event => {
      try {
        const eventDate = parseISO(event.date)
        return isSameDay(eventDate, date)
      } catch {
        return false
      }
    })
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading calendar...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Events Calendar</h3>
          <p className="text-sm text-gray-600">
            Manage temple events. Events from Google Calendar are automatically synced.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {googleCalendarLink && (
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              Google Calendar Connected
            </div>
          )}
          <button
            onClick={() => {
              setSelectedDate(new Date())
              setShowEventForm(true)
              setEditingEvent(null)
              resetForm()
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors text-sm flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Link Section */}
      {!googleCalendarLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Connect your Google Calendar in the "Kiosk Home" tab to automatically sync events.
            You can also add events manually below.
          </p>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          {calendarDays.map(day => {
            const dayEvents = getEventsForDate(day)
            const isToday = isSameDay(day, new Date())
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentMonth = isSameMonth(day, currentDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`aspect-square p-1 border rounded-lg transition-colors text-left ${
                  isToday
                    ? 'bg-purple-100 border-purple-300'
                    : isSelected
                    ? 'bg-purple-50 border-purple-200'
                    : 'border-gray-200 hover:bg-gray-50'
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-700' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs bg-purple-600 text-white px-1 py-0.5 rounded truncate"
                        title={event.title}
                      >
                        {event.isAllDay || !event.startTime ? event.title : `${format(parseISO(`${event.date}T${event.startTime}`), 'h:mm a')} ${event.title}`}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Events List for Selected Date */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Events on {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500">No events scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {getEventsForDate(selectedDate).map(event => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      {event.isAllDay ? (
                        <span>All Day</span>
                      ) : (
                        <span>
                          {event.startTime && format(parseISO(`${event.date}T${event.startTime}`), 'h:mm a')}
                          {event.endTime && ` - ${format(parseISO(`${event.date}T${event.endTime}`), 'h:mm a')}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={eventForm.isAllDay}
                    onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked, startTime: '', endTime: '' })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">All Day Event</span>
                </label>
              </div>

              {!eventForm.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter event description (optional)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEventForm(false)
                  setEditingEvent(null)
                  resetForm()
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventForm.title.trim() || updateEventsMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateEventsMutation.isPending ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

