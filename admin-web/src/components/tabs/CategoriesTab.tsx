'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface CategoriesTabProps {
  templeId: string
}

export default function CategoriesTab({ templeId }: CategoriesTabProps) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newDefaultAmount, setNewDefaultAmount] = useState<number | ''>('')
  const [newShowStartDate, setNewShowStartDate] = useState('')
  const [newShowEndDate, setNewShowEndDate] = useState('')
  const [newUseDateRange, setNewUseDateRange] = useState(false)
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editShowOnKiosk, setEditShowOnKiosk] = useState(true)
  const [editDefaultAmount, setEditDefaultAmount] = useState<number | ''>('')
  const [editShowStartDate, setEditShowStartDate] = useState('')
  const [editShowEndDate, setEditShowEndDate] = useState('')
  const [editUseDateRange, setEditUseDateRange] = useState(false)
  
  const queryClient = useQueryClient()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', templeId],
    queryFn: async () => {
      const response = await api.get('/donation-categories', {
        params: { templeId },
      })
      return response.data
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/donation-categories', {
        templeId,
        name: data.name,
        isActive: true,
        showOnKiosk: true,
        defaultAmount: data.defaultAmount || null,
        showStartDate: data.showStartDate || null,
        showEndDate: data.showEndDate || null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', templeId] })
      setNewCategoryName('')
      setNewDefaultAmount('')
      setNewShowStartDate('')
      setNewShowEndDate('')
      setNewUseDateRange(false)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/donation-categories/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', templeId] })
      setEditingCategory(null)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/donation-categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', templeId] })
    },
  })

  const startEdit = (category: any) => {
    setEditingCategory(category.id)
    setEditName(category.name)
    setEditIsActive(category.isActive)
    setEditShowOnKiosk(category.showOnKiosk)
    setEditDefaultAmount(category.defaultAmount || '')
    
    // Parse dates from ISO strings to local datetime-local format
    if (category.showStartDate) {
      const startDate = new Date(category.showStartDate)
      const localStart = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
      setEditShowStartDate(localStart.toISOString().slice(0, 16))
      setEditUseDateRange(true)
    } else {
      setEditShowStartDate('')
    }
    
    if (category.showEndDate) {
      const endDate = new Date(category.showEndDate)
      const localEnd = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
      setEditShowEndDate(localEnd.toISOString().slice(0, 16))
      setEditUseDateRange(true)
    } else {
      setEditShowEndDate('')
    }
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditName('')
    setEditIsActive(true)
    setEditShowOnKiosk(true)
    setEditDefaultAmount('')
    setEditShowStartDate('')
    setEditShowEndDate('')
    setEditUseDateRange(false)
  }

  const saveEdit = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory,
        data: {
          name: editName,
          isActive: editIsActive,
          showOnKiosk: editShowOnKiosk,
          defaultAmount: editDefaultAmount || null,
          showStartDate: editUseDateRange && editShowStartDate ? new Date(editShowStartDate).toISOString() : null,
          showEndDate: editUseDateRange && editShowEndDate ? new Date(editShowEndDate).toISOString() : null,
        },
      })
    }
  }
  
  const handleCreate = () => {
    createCategoryMutation.mutate({
      name: newCategoryName,
      defaultAmount: newDefaultAmount || null,
      showStartDate: newUseDateRange && newShowStartDate ? new Date(newShowStartDate).toISOString() : null,
      showEndDate: newUseDateRange && newShowEndDate ? new Date(newShowEndDate).toISOString() : null,
    })
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Category</h2>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., General, Annakut, Festival)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newDefaultAmount}
              onChange={(e) => setNewDefaultAmount(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="Default amount (optional)"
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="newUseDateRange"
              checked={newUseDateRange}
              onChange={(e) => setNewUseDateRange(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="newUseDateRange" className="text-sm text-gray-700">
              Set date/time range for when this category appears on kiosk
            </label>
          </div>
          
          {newUseDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={newShowStartDate}
                  onChange={(e) => setNewShowStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show End Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={newShowEndDate}
                  onChange={(e) => setNewShowEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}
          
          <button
            onClick={handleCreate}
            disabled={!newCategoryName || createCategoryMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {categories?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No categories found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first category to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Default Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Show on Kiosk</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Range</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories?.map((category: any) => (
                  <tr key={category.id} className="hover:bg-purple-50/30 transition-colors border-b border-gray-100">
                    {editingCategory === category.id ? (
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Default Amount ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editDefaultAmount}
                                onChange={(e) => setEditDefaultAmount(e.target.value ? parseFloat(e.target.value) : '')}
                                placeholder="Optional"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editIsActive}
                                onChange={(e) => setEditIsActive(e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">Active</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editShowOnKiosk}
                                onChange={(e) => setEditShowOnKiosk(e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">Show on Kiosk</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editUseDateRange}
                                onChange={(e) => setEditUseDateRange(e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">Use Date/Time Range</span>
                            </label>
                          </div>
                          
                          {editUseDateRange && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Show Start Date/Time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editShowStartDate}
                                  onChange={(e) => setEditShowStartDate(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Show End Date/Time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editShowEndDate}
                                  onChange={(e) => setEditShowEndDate(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              disabled={!editName || updateCategoryMutation.isPending}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {category.defaultAmount != null ? `$${Number(category.defaultAmount).toFixed(2)}` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            category.isActive 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {category.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            category.showOnKiosk 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {category.showOnKiosk ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-600">
                            {category.showStartDate && category.showEndDate ? (
                              <div>
                                <div>{new Date(category.showStartDate).toLocaleString()}</div>
                                <div className="text-gray-400">to</div>
                                <div>{new Date(category.showEndDate).toLocaleString()}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Always visible</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(category)}
                              className="px-3 py-1 text-purple-600 hover:text-purple-700 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${category.name}"?`)) {
                                  deleteCategoryMutation.mutate(category.id)
                                }
                              }}
                              disabled={deleteCategoryMutation.isPending}
                              className="px-3 py-1 text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

