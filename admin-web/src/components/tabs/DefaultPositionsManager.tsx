'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface DefaultPosition {
  id: string
  elementType: string
  screenType: string
  position: {
    x?: number
    y?: number
    width?: number
    height?: number
    [key: string]: any
  }
  metadata?: {
    alignment?: string
    visibility?: boolean
    [key: string]: any
  }
  isDefault: boolean
  createdBy?: string
  creator?: {
    name: string
    email: string
  }
  updatedBy?: string
  updater?: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

const SCREEN_TYPES = [
  { value: 'donationSelection', label: 'Donation Selection' },
  { value: 'home', label: 'Home Screen' },
  { value: 'details', label: 'Donation Details' },
]

const ELEMENT_TYPES = {
  donationSelection: [
    { value: 'categorySection', label: 'Category Section' },
    { value: 'amountSection', label: 'Amount Section' },
    { value: 'customAmountField', label: 'Custom Amount Field' },
  ],
  home: [
    { value: 'welcomeText', label: 'Welcome Text' },
    { value: 'header1', label: 'Header 1' },
    { value: 'timeStatus', label: 'Time & Status' },
    { value: 'tapToDonate', label: 'Tap to Donate' },
    { value: 'whatsAppButtons', label: 'WhatsApp Buttons' },
    { value: 'languageSelector', label: 'Language Selector' },
  ],
  details: [
    { value: 'amountDisplay', label: 'Amount Display' },
    { value: 'donorForm', label: 'Donor Form' },
    { value: 'paymentButton', label: 'Payment Button' },
  ],
}

export default function DefaultPositionsManager() {
  const queryClient = useQueryClient()
  const [selectedScreen, setSelectedScreen] = useState<string>('donationSelection')
  const [editingPosition, setEditingPosition] = useState<DefaultPosition | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Fetch default positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ['default-positions', selectedScreen],
    queryFn: async () => {
      const response = await api.get(`/default-positions?screenType=${selectedScreen}`)
      return response.data
    },
  })

  // Create/Update position mutation
  const savePositionMutation = useMutation({
    mutationFn: async (data: {
      elementType: string
      screenType: string
      position: any
      metadata?: any
    }) => {
      const existing = positions?.find(
        (p: DefaultPosition) =>
          p.elementType === data.elementType && p.screenType === data.screenType,
      )
      if (existing) {
        const response = await api.put(
          `/default-positions/${data.elementType}/${data.screenType}`,
          {
            position: data.position,
            metadata: data.metadata,
          },
        )
        return response.data
      } else {
        const response = await api.post('/default-positions', data)
        return response.data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] })
      setEditingPosition(null)
      setIsCreating(false)
      alert('Default position saved successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to save position: ${error.response?.data?.message || error.message}`)
    },
  })

  // Delete position mutation
  const deletePositionMutation = useMutation({
    mutationFn: async (data: { elementType: string; screenType: string }) => {
      await api.delete(`/default-positions/${data.elementType}/${data.screenType}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] })
      alert('Default position deleted successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to delete position: ${error.response?.data?.message || error.message}`)
    },
  })

  const handleSavePosition = (elementType: string, position: any, metadata?: any) => {
    savePositionMutation.mutate({
      elementType,
      screenType: selectedScreen,
      position,
      metadata,
    })
  }

  const handleDeletePosition = (elementType: string) => {
    if (confirm(`Are you sure you want to delete the default position for ${elementType}?`)) {
      deletePositionMutation.mutate({
        elementType,
        screenType: selectedScreen,
      })
    }
  }

  const getElementLabel = (elementType: string) => {
    const allElements = [
      ...ELEMENT_TYPES.donationSelection,
      ...ELEMENT_TYPES.home,
      ...ELEMENT_TYPES.details,
    ]
    return allElements.find((e) => e.value === elementType)?.label || elementType
  }

  const getPositionForElement = (elementType: string): DefaultPosition | undefined => {
    return positions?.find(
      (p: DefaultPosition) => p.elementType === elementType && p.screenType === selectedScreen,
    )
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Loading default positions...</div>
  }

  return (
    <div className="space-y-6">
      {/* Screen Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Screen Type</label>
        <select
          value={selectedScreen}
          onChange={(e) => setSelectedScreen(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        >
          {SCREEN_TYPES.map((screen) => (
            <option key={screen.value} value={screen.value}>
              {screen.label}
            </option>
          ))}
        </select>
      </div>

      {/* Position List */}
      <div className="space-y-4">
        {(ELEMENT_TYPES[selectedScreen as keyof typeof ELEMENT_TYPES] || []).map((element) => {
          const position = getPositionForElement(element.value)
          return (
            <div
              key={element.value}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{element.label}</h5>
                  {position ? (
                    <div className="mt-2 space-y-1">
                      {position.position.x !== undefined && (
                        <p className="text-sm text-gray-600">
                          X: {position.position.x}
                          {position.position.y !== undefined && `, Y: ${position.position.y}`}
                        </p>
                      )}
                      {position.position.width !== undefined && (
                        <p className="text-sm text-gray-600">
                          Width: {position.position.width}
                          {position.position.height !== undefined &&
                            `, Height: ${position.position.height}`}
                        </p>
                      )}
                      {position.metadata && (
                        <p className="text-xs text-gray-500 mt-1">
                          {position.metadata.visibility !== undefined &&
                            `Visible: ${position.metadata.visibility}`}
                          {position.metadata.alignment && ` • Align: ${position.metadata.alignment}`}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Updated: {new Date(position.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">No default position set</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingPosition(
                        position || {
                          id: '',
                          elementType: element.value,
                          screenType: selectedScreen,
                          position: {},
                          isDefault: true,
                          createdAt: '',
                          updatedAt: '',
                        },
                      )
                      setIsCreating(!position)
                    }}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {position ? 'Edit' : 'Set Default'}
                  </button>
                  {position && (
                    <button
                      onClick={() => handleDeletePosition(element.value)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit/Create Modal */}
      {editingPosition && (
        <PositionEditor
          position={editingPosition}
          onSave={(position, metadata) => {
            handleSavePosition(editingPosition.elementType, position, metadata)
            setEditingPosition(null)
            setIsCreating(false)
          }}
          onCancel={() => {
            setEditingPosition(null)
            setIsCreating(false)
          }}
          isCreating={isCreating}
        />
      )}
    </div>
  )
}

function PositionEditor({
  position,
  onSave,
  onCancel,
  isCreating,
}: {
  position: DefaultPosition
  onSave: (position: any, metadata?: any) => void
  onCancel: () => void
  isCreating: boolean
}) {
  const [x, setX] = useState<number | undefined>(position.position.x)
  const [y, setY] = useState<number | undefined>(position.position.y)
  const [width, setWidth] = useState<number | undefined>(position.position.width)
  const [height, setHeight] = useState<number | undefined>(position.position.height)
  const [visibility, setVisibility] = useState<boolean | undefined>(
    position.metadata?.visibility,
  )
  const [alignment, setAlignment] = useState<string | undefined>(position.metadata?.alignment)

  const handleSave = () => {
    const positionData: any = {}
    if (x !== undefined) positionData.x = x
    if (y !== undefined) positionData.y = y
    if (width !== undefined) positionData.width = width
    if (height !== undefined) positionData.height = height

    const metadataData: any = {}
    if (visibility !== undefined) metadataData.visibility = visibility
    if (alignment) metadataData.alignment = alignment

    onSave(positionData, Object.keys(metadataData).length > 0 ? metadataData : undefined)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isCreating ? 'Set Default Position' : 'Edit Default Position'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Element Type</label>
            <p className="text-sm text-gray-900">{position.elementType}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Screen Type</label>
            <p className="text-sm text-gray-900">{position.screenType}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
              <input
                type="number"
                value={x ?? ''}
                onChange={(e) => setX(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
              <input
                type="number"
                value={y ?? ''}
                onChange={(e) => setY(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
              <input
                type="number"
                value={width ?? ''}
                onChange={(e) =>
                  setWidth(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
              <input
                type="number"
                value={height ?? ''}
                onChange={(e) =>
                  setHeight(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={visibility === undefined ? '' : visibility.toString()}
                onChange={(e) =>
                  setVisibility(e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Not set</option>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
              <select
                value={alignment || ''}
                onChange={(e) => setAlignment(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Not set</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
          >
            Save Default Position
          </button>
        </div>
      </div>
    </div>
  )
}

