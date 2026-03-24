'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { TempleFilter, DonorSummaryCards } from '@/components/donors'
import DonorInfoPopup from '@/components/DonorInfoPopup'

interface DonorsTabProps {
  templeId?: string
  isMasterAdmin?: boolean
}

interface Donor {
  id: string
  name: string | null
  phone: string
  email: string | null
  address: string | null
  totalDonations: number
  totalAmount: number
  lastDonationDate: string | null
  templeId?: string
  temple?: { name: string }
  createdAt: string
  updatedAt: string
}

export default function DonorsTab({ templeId, isMasterAdmin = false }: DonorsTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null)
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', address: '', phone: '' })
  const limit = 50

  const effectiveTempleId = isMasterAdmin ? templeId : (templeId as string)

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: isMasterAdmin,
  })

  const endpoint =
    isMasterAdmin && effectiveTempleId
      ? `/donors/temple/${effectiveTempleId}`
      : !isMasterAdmin
        ? '/donors/my-temple'
        : null

  const { data, isLoading } = useQuery({
    queryKey: ['donors', effectiveTempleId, page, search],
    queryFn: async () => {
      if (!endpoint) return { donors: [], total: 0 }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      const response = await api.get(`${endpoint}?${params.toString()}`)
      return response.data
    },
    enabled: !!endpoint,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['donor-stats', effectiveTempleId],
    queryFn: async () => {
      if (!effectiveTempleId) return null
      const res = await api.get(`/donors/temple/${effectiveTempleId}/stats`)
      return res.data
    },
    enabled: !!effectiveTempleId && !!endpoint,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      name?: string
      email?: string
      address?: string
      phone?: string
    }) => {
      if (!editingDonor) return
      const response = await api.put(`/donors/${editingDonor.id}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      setEditingDonor(null)
      alert('Donor updated successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update donor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (donorId: string) => {
      await api.delete(`/donors/${donorId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      alert('Donor deleted successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete donor')
    },
  })

  const handleTempleSelect = (templeId: string | undefined) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', 'donors')
    if (templeId) params.set('templeId', templeId)
    else params.delete('templeId')
    router.push(`/dashboard?${params.toString()}`)
  }

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor)
    setEditForm({
      name: donor.name || '',
      email: donor.email || '',
      address: donor.address || '',
      phone: donor.phone || '',
    })
  }

  const handleSave = () => updateMutation.mutate(editForm)

  const handleDelete = (donorId: string) => {
    if (confirm('Are you sure you want to delete this donor? This action cannot be undone.')) {
      deleteMutation.mutate(donorId)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const donors: Donor[] = data?.donors || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const selectedTemple = temples.find((t: { id: string }) => t.id === effectiveTempleId)

  // Master Admin: no temple selected — show temple picker
  if (isMasterAdmin && !effectiveTempleId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Donor management</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            View and manage donor records by temple. Donors are created when they make donations.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <TempleFilter
            temples={temples}
            selectedTempleId={undefined}
            onSelect={handleTempleSelect}
            isLoading={false}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Select a temple to view donors</p>
          <p className="text-sm text-gray-500 mt-1">
            Choose a temple from the dropdown above to see its donor list and insights
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Donor management</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          View and manage donor records. Donors are created when they make donations.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
        {isMasterAdmin && (
          <TempleFilter
            temples={temples}
            selectedTempleId={effectiveTempleId}
            onSelect={handleTempleSelect}
          />
        )}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
          <input
            type="search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (
                confirm(
                  'This will create donor records from all past successful donations. Continue?'
                )
              ) {
                try {
                  const res = await api.post(
                    '/donors/backfill' + (effectiveTempleId ? `?templeId=${effectiveTempleId}` : '')
                  )
                  alert(
                    `Backfill complete! Created: ${res.data.created}, Updated: ${res.data.updated}${res.data.errors > 0 ? `, Errors: ${res.data.errors}` : ''}`
                  )
                  queryClient.invalidateQueries({ queryKey: ['donors'] })
                  queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
                } catch (err: any) {
                  alert(err.response?.data?.message || 'Failed to backfill donors')
                }
              }
            }}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Backfill past donors
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {effectiveTempleId && (
        <DonorSummaryCards
          total={stats?.total ?? 0}
          totalDonated={stats?.totalDonated ?? 0}
          newThisMonth={stats?.newThisMonth ?? 0}
          repeatCount={stats?.repeatCount ?? 0}
          activeCount={stats?.activeCount}
          isLoading={statsLoading}
        />
      )}

      {/* Donors table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {donors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No donors found</p>
            <p className="text-sm text-gray-500 mt-1">
              {search
                ? 'Try adjusting your search.'
                : selectedTemple
                  ? `${selectedTemple.name} has no donor records yet. Run "Backfill past donors" to create records from past donations.`
                  : 'No donor records yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone
                    </th>
                    {isMasterAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Temple
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total donated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Donations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last donation
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donors.map((donor) => (
                    <tr
                      key={donor.id}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedDonor(donor)}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDonor(donor)
                          }}
                          className="font-medium text-purple-600 hover:text-purple-800 hover:underline text-left"
                        >
                          {donor.name || (
                            <span className="text-gray-500 italic">No name</span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {donor.email || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">
                        {donor.phone || '—'}
                      </td>
                      {isMasterAdmin && (
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {donor.temple?.name || selectedTemple?.name || '—'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(Number(donor.totalAmount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {donor.totalDonations}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(donor.lastDonationDate)}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDonor(donor)}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(donor)}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(donor.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Donor detail modal (donation history & receipts) */}
      {selectedDonor && (
        <DonorInfoPopup
          donorPhone={selectedDonor.phone}
          donorName={selectedDonor.name}
          donorEmail={selectedDonor.email}
          donorAddress={selectedDonor.address}
          donorId={selectedDonor.id}
          templeId={effectiveTempleId}
          isMasterAdmin={isMasterAdmin}
          onClose={() => setSelectedDonor(null)}
        />
      )}

      {/* Edit modal */}
      {editingDonor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditingDonor(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit donor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mailing address
                </label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingDonor(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
