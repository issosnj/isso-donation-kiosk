'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import PageHeader, { headerPrimaryButtonClass, headerSecondaryButtonClass } from '@/components/layout/PageHeader'
import { KpiGrid, KpiStatCard, KpiStatSkeleton } from '@/components/ui/KpiStatCard'

const fieldClass =
  'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400'

interface CategoriesTabProps {
  templeId: string
  embedded?: boolean
}

export default function CategoriesTab({ templeId, embedded = false }: CategoriesTabProps) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newDefaultAmount, setNewDefaultAmount] = useState<number | ''>('')
  const [newShowStartDate, setNewShowStartDate] = useState('')
  const [newShowEndDate, setNewShowEndDate] = useState('')
  const [newUseDateRange, setNewUseDateRange] = useState(false)
  const [newQuantityEnabled, setNewQuantityEnabled] = useState(false)
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editShowOnKiosk, setEditShowOnKiosk] = useState(true)
  const [editDefaultAmount, setEditDefaultAmount] = useState<number | ''>('')
  const [editShowStartDate, setEditShowStartDate] = useState('')
  const [editShowEndDate, setEditShowEndDate] = useState('')
  const [editUseDateRange, setEditUseDateRange] = useState(false)
  const [editQuantityEnabled, setEditQuantityEnabled] = useState(false)
  const [editYajmanOpportunities, setEditYajmanOpportunities] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [newYajmanOpportunityName, setNewYajmanOpportunityName] = useState('')
  const [newYajmanOpportunityDescription, setNewYajmanOpportunityDescription] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  
  const queryClient = useQueryClient()

  // Fetch temple to check if yajman opportunities are enabled
  const { data: temple } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const yajmanOpportunitiesEnabled = temple?.yajmanOpportunitiesEnabled || false

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
        quantityEnabled: !!data.quantityEnabled,
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
      setNewQuantityEnabled(false)
      setShowCreate(false)
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

  const moveUpMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/donation-categories/${id}/move-up`)
      return response.data
    },
    onSuccess: (data) => {
      const newData = Array.isArray(data) ? [...data] : data
      queryClient.setQueryData(['categories', templeId], newData)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to move category up. Please try again.'
      alert(errorMessage)
    },
  })

  const moveDownMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/donation-categories/${id}/move-down`)
      return response.data
    },
    onSuccess: (data) => {
      const newData = Array.isArray(data) ? [...data] : data
      queryClient.setQueryData(['categories', templeId], newData)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to move category down. Please try again.'
      alert(errorMessage)
    },
  })

  const startEdit = (category: any) => {
    setEditingCategory(category.id)
    setEditName(category.name)
    setEditIsActive(category.isActive)
    setEditShowOnKiosk(category.showOnKiosk)
    setEditQuantityEnabled(!!category.quantityEnabled)
    setEditDefaultAmount(category.defaultAmount || '')
    setEditYajmanOpportunities(category.yajmanOpportunities || [])
    
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
    setEditQuantityEnabled(false)
    setEditYajmanOpportunities([])
    setNewYajmanOpportunityName('')
    setNewYajmanOpportunityDescription('')
  }

  const addYajmanOpportunity = () => {
    if (newYajmanOpportunityName.trim()) {
      const newOpp = {
        id: `opp-${Date.now()}`,
        name: newYajmanOpportunityName.trim(),
        description: newYajmanOpportunityDescription.trim() || undefined,
      }
      setEditYajmanOpportunities([...editYajmanOpportunities, newOpp])
      setNewYajmanOpportunityName('')
      setNewYajmanOpportunityDescription('')
    }
  }

  const removeYajmanOpportunity = (id: string) => {
    setEditYajmanOpportunities(editYajmanOpportunities.filter(opp => opp.id !== id))
  }

  const saveEdit = () => {
    if (editingCategory) {
      // Convert defaultAmount to number or omit if null
      let defaultAmountValue: number | undefined = undefined;
      if (editDefaultAmount !== '' && editDefaultAmount != null) {
        const numValue = typeof editDefaultAmount === 'string' 
          ? parseFloat(editDefaultAmount) 
          : Number(editDefaultAmount);
        if (!isNaN(numValue)) {
          defaultAmountValue = numValue;
        }
      }
      
      // Build data object, omitting null/undefined values
      const updateData: any = {
        name: editName,
        isActive: editIsActive,
        showOnKiosk: editShowOnKiosk,
        quantityEnabled: editQuantityEnabled,
      };
      
      if (defaultAmountValue !== undefined) {
        updateData.defaultAmount = defaultAmountValue;
      }
      
      if (editUseDateRange && editShowStartDate) {
        updateData.showStartDate = new Date(editShowStartDate).toISOString();
      } else {
        updateData.showStartDate = null;
      }
      
      if (editUseDateRange && editShowEndDate) {
        updateData.showEndDate = new Date(editShowEndDate).toISOString();
      } else {
        updateData.showEndDate = null;
      }
      
      // Include yajman opportunities if enabled
      if (yajmanOpportunitiesEnabled) {
        updateData.yajmanOpportunities = editYajmanOpportunities.length > 0 ? editYajmanOpportunities : undefined;
      }
      
      updateCategoryMutation.mutate({
        id: editingCategory,
        data: updateData,
      })
    }
  }
  
  const handleCreate = () => {
    // Convert defaultAmount to number or null
    let defaultAmountValue: number | null = null;
    if (newDefaultAmount !== '' && newDefaultAmount != null) {
      const numValue = typeof newDefaultAmount === 'string' 
        ? parseFloat(newDefaultAmount) 
        : Number(newDefaultAmount);
      if (!isNaN(numValue)) {
        defaultAmountValue = numValue;
      }
    }
    
    createCategoryMutation.mutate({
      name: newCategoryName,
      defaultAmount: defaultAmountValue,
      showStartDate: newUseDateRange && newShowStartDate ? new Date(newShowStartDate).toISOString() : null,
      showEndDate: newUseDateRange && newShowEndDate ? new Date(newShowEndDate).toISOString() : null,
      quantityEnabled: newQuantityEnabled,
    })
  }

  const categoryList = Array.isArray(categories) ? categories : []
  const activeCount = categoryList.filter((category: { isActive?: boolean }) => category.isActive).length
  const onKioskCount = categoryList.filter((category: { showOnKiosk?: boolean }) => category.showOnKiosk).length
  const scheduledCount = categoryList.filter(
    (category: { showStartDate?: string | null }) => Boolean(category.showStartDate)
  ).length
  const quantityCount = categoryList.filter(
    (category: { quantityEnabled?: boolean }) => category.quantityEnabled
  ).length

  const addButton = (
    <button
      type="button"
      onClick={() => setShowCreate((open) => !open)}
      className={showCreate ? headerSecondaryButtonClass : headerPrimaryButtonClass}
    >
      {showCreate ? 'Close' : 'Add category'}
    </button>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            eyebrow={temple?.name}
            title="Categories"
            description="Create donation categories, default amounts, and when each one appears on the kiosk."
          />
        )}
        <KpiStatSkeleton count={4} />
        <div className="h-64 rounded-2xl border border-gray-200/80 bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          eyebrow={temple?.name}
          title="Categories"
          description="Create donation categories, default amounts, and when each one appears on the kiosk."
          actions={addButton}
        />
      ) : (
        <div className="flex justify-end">{addButton}</div>
      )}

      <KpiGrid count={4}>
        <KpiStatCard
          label="Categories"
          value={categoryList.length.toLocaleString()}
          insight="Donation choices on the kiosk"
          iconPath="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          gradient="from-orange-500 to-orange-600"
        />
        <KpiStatCard
          label="Active"
          value={activeCount.toLocaleString()}
          insight={categoryList.length ? `${categoryList.length - activeCount} inactive` : 'None yet'}
          iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          gradient="from-emerald-500 to-teal-600"
        />
        <KpiStatCard
          label="On kiosk"
          value={onKioskCount.toLocaleString()}
          insight="Visible to donors"
          iconPath="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          gradient="from-sky-500 to-blue-600"
        />
        <KpiStatCard
          label="Scheduled"
          value={scheduledCount.toLocaleString()}
          insight={quantityCount ? `${quantityCount} with quantity` : 'Date windows'}
          iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          gradient="from-amber-500 to-orange-500"
        />
      </KpiGrid>

      {showCreate && (
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">New category</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          Name it, set an optional default amount, and choose when it shows on the kiosk.
        </p>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., General, Annakut, Festival)"
              className={`flex-1 ${fieldClass}`}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newDefaultAmount}
              onChange={(e) => setNewDefaultAmount(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="Default amount"
              className={`sm:w-44 ${fieldClass}`}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="newQuantityEnabled"
                checked={newQuantityEnabled}
                onChange={(e) => setNewQuantityEnabled(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="newQuantityEnabled" className="text-sm text-gray-700">
                Enable quantity selector on kiosk (× default amount; appears under Custom Amount)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="newUseDateRange"
                checked={newUseDateRange}
                onChange={(e) => setNewUseDateRange(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="newUseDateRange" className="text-sm text-gray-700">
                Set date/time range for when this category appears on kiosk
              </label>
            </div>
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
                  className={fieldClass}
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
                  className={fieldClass}
                />
              </div>
            </div>
          )}
          
          <button
            onClick={handleCreate}
            disabled={!newCategoryName || createCategoryMutation.isPending}
            className={headerPrimaryButtonClass}
          >
            {createCategoryMutation.isPending ? 'Creating...' : 'Create category'}
          </button>
        </div>
      </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Kiosk order</h2>
            <p className="mt-0.5 text-xs text-gray-500">Donors see categories in this order. Move a row to change it.</p>
          </div>
          <span className="text-xs font-medium text-gray-500 tabular-nums">{categoryList.length} categories</span>
        </div>
        {categories?.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">No categories yet</p>
            <p className="mt-1 text-sm text-gray-500">Add a category to show it on the donation kiosk.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Default</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Kiosk</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories?.map((category: any, index: number) => (
                  <tr key={category.id} className="hover:bg-orange-50/40 transition-colors">
                    {editingCategory === category.id ? (
                      <td colSpan={8} className="px-6 py-4">
                        <div className="space-y-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className={fieldClass}
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
                                className={fieldClass}
                              />
                            </div>
                          </div>
                          
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editIsActive}
                                onChange={(e) => setEditIsActive(e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">Active</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editShowOnKiosk}
                                onChange={(e) => setEditShowOnKiosk(e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">Show on Kiosk</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editQuantityEnabled}
                                onChange={(e) => setEditQuantityEnabled(e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">Qty on kiosk</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editUseDateRange}
                                onChange={(e) => setEditUseDateRange(e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
                                  className={fieldClass}
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
                                  className={fieldClass}
                                />
                              </div>
                            </div>
                          )}

                          {yajmanOpportunitiesEnabled && (
                            <div className="pt-4 border-t border-gray-300">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Yajman Opportunities (Included Benefits)
                              </label>
                              <p className="text-xs text-gray-500 mb-3">
                                List the yajman opportunities included in this sponsorship tier
                              </p>
                              
                              {/* List of existing opportunities */}
                              {editYajmanOpportunities.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {editYajmanOpportunities.map((opp) => (
                                    <div key={opp.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                                        {opp.description && (
                                          <div className="text-xs text-gray-500 mt-1">{opp.description}</div>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => removeYajmanOpportunity(opp.id)}
                                        className="ml-2 text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add new opportunity */}
                              <div className="space-y-2">
                                <div>
                                  <input
                                    type="text"
                                    value={newYajmanOpportunityName}
                                    onChange={(e) => setNewYajmanOpportunityName(e.target.value)}
                                    placeholder="e.g., ANNUAL POONAM SABHA YAJMAN"
                                    className={fieldClass}
                                  />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={newYajmanOpportunityDescription}
                                    onChange={(e) => setNewYajmanOpportunityDescription(e.target.value)}
                                    placeholder="Description (optional)"
                                    className={fieldClass}
                                  />
                                </div>
                                <button
                                  onClick={addYajmanOpportunity}
                                  disabled={!newYajmanOpportunityName.trim()}
                                  className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Add Opportunity
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              disabled={!editName || updateCategoryMutation.isPending}
                              className={headerPrimaryButtonClass}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className={headerSecondaryButtonClass}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="inline-flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (index === 0) return
                                moveUpMutation.mutate(category.id)
                              }}
                              disabled={index === 0 || moveUpMutation.isPending || moveDownMutation.isPending}
                              className="px-2 py-0.5 text-gray-500 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (index === (categories?.length || 0) - 1) return
                                moveDownMutation.mutate(category.id)
                              }}
                              disabled={index === (categories?.length || 0) - 1 || moveUpMutation.isPending || moveDownMutation.isPending}
                              className="border-t border-gray-200 px-2 py-0.5 text-gray-500 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold"
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-bold text-white shadow-sm">
                              {index + 1}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-sm font-medium tabular-nums text-gray-900">
                            {category.defaultAmount != null && !isNaN(Number(category.defaultAmount))
                              ? `$${Number(category.defaultAmount).toFixed(2)}`
                              : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            category.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            category.showOnKiosk
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {category.showOnKiosk ? 'Showing' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${
                            category.quantityEnabled
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {category.quantityEnabled ? 'On' : 'Off'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-xs text-gray-600">
                            {category.showStartDate && category.showEndDate ? (
                              <div>
                                <div>{new Date(category.showStartDate).toLocaleString()}</div>
                                <div className="text-gray-400">to</div>
                                <div>{new Date(category.showEndDate).toLocaleString()}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">Always visible</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEdit(category)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
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
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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

