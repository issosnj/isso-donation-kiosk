import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

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
  createdAt: string
  updatedAt: string
}

export default function DonorsTab({ templeId, isMasterAdmin = false }: DonorsTabProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', address: '', phone: '' })
  const limit = 50

  const queryClient = useQueryClient()

  // Determine which endpoint to use
  const endpoint = isMasterAdmin && templeId
    ? `/donors/temple/${templeId}`
    : '/donors/my-temple'

  const { data, isLoading } = useQuery({
    queryKey: ['donors', templeId, page, search, isMasterAdmin],
    queryFn: async () => {
      if (!endpoint) {
        return { donors: [], total: 0 }
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) {
        params.append('search', search)
      }

      const response = await api.get(`${endpoint}?${params.toString()}`)
      return response.data
    },
    enabled: !!endpoint,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: { name?: string; email?: string; address?: string; phone?: string }) => {
      if (!editingDonor) return
      const response = await api.put(`/donors/${editingDonor.id}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      setEditingDonor(null)
      alert('Donor updated successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update donor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (donorId: string) => {
      const response = await api.delete(`/donors/${donorId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      alert('Donor deleted successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete donor')
    },
  })

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor)
    setEditForm({
      name: donor.name || '',
      email: donor.email || '',
      address: donor.address || '',
      phone: donor.phone || '',
    })
  }

  const handleSave = () => {
    updateMutation.mutate(editForm)
  }

  const handleDelete = (donorId: string) => {
    if (confirm('Are you sure you want to delete this donor? This action cannot be undone.')) {
      deleteMutation.mutate(donorId)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return <div className="p-6">Loading donors...</div>
  }

  const donors: Donor[] = data?.donors || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Donor Management</h2>
        <p className="text-gray-600 mb-4">
          View and manage donor information. Donors are automatically created when they make donations.
        </p>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1) // Reset to first page when searching
            }}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Donors</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Donations</div>
            <div className="text-2xl font-bold">
              {formatCurrency(donors.reduce((sum, d) => sum + Number(d.totalAmount), 0))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Average per Donor</div>
            <div className="text-2xl font-bold">
              {donors.length > 0
                ? formatCurrency(donors.reduce((sum, d) => sum + Number(d.totalAmount), 0) / donors.length)
                : formatCurrency(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit Donor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingDonor(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Donations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Donation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {donors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No donors found
                  </td>
                </tr>
              ) : (
                donors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {donor.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {donor.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {donor.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {donor.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {donor.totalDonations}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(Number(donor.totalAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(donor.lastDonationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(donor)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(donor.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} donors
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

