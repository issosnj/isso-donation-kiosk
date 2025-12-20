'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { useState } from 'react'

interface DonationsTabProps {
  templeId?: string
}

export default function DonationsTab({ templeId }: DonationsTabProps) {
  const queryClient = useQueryClient()
  const [resendingId, setResendingId] = useState<string | null>(null)

  const { data: donations, isLoading } = useQuery({
    queryKey: ['donations', templeId],
    queryFn: async () => {
      const response = await api.get('/donations', {
        params: templeId ? { templeId } : {},
      })
      return response.data
    },
  })

  const resendReceiptMutation = useMutation({
    mutationFn: async (donationId: string) => {
      const response = await api.post(`/donations/${donationId}/resend-receipt`)
      return response.data
    },
    onSuccess: () => {
      alert('Receipt email sent successfully!')
      setResendingId(null)
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send receipt email')
      setResendingId(null)
    },
  })

  const handleResendReceipt = (donationId: string) => {
    if (confirm('Are you sure you want to resend the receipt email?')) {
      setResendingId(donationId)
      resendReceiptMutation.mutate(donationId)
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

  if (!donations || donations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No donations found</p>
        <p className="text-sm text-gray-400 mt-1">Donations will appear here once processed</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donor Info</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {donations.map((donation: any) => (
              <tr key={donation.id} className="hover:bg-purple-50/30 transition-colors border-b border-gray-100">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(donation.createdAt), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(donation.createdAt), 'HH:mm')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600">
                    ${Number(donation.amount).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{donation.category?.name || 'General'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${
                    donation.status === 'SUCCEEDED' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : donation.status === 'PENDING' 
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      : donation.status === 'CANCELED'
                      ? 'bg-gray-100 text-gray-700 border-gray-200'
                      : donation.status === 'FAILED'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                    {donation.status === 'CANCELED' 
                      ? 'User Cancelled' 
                      : donation.status === 'FAILED'
                      ? 'Failed'
                      : donation.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">{donation.donorName || 'Anonymous'}</div>
                  {donation.donorPhone && (
                    <div className="text-xs text-gray-500 mt-1">📞 {donation.donorPhone}</div>
                  )}
                  {donation.donorEmail && (
                    <div className="text-xs text-gray-500 mt-1">✉️ {donation.donorEmail}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {donation.status === 'SUCCEEDED' && donation.donorEmail && (
                    <button
                      onClick={() => handleResendReceipt(donation.id)}
                      disabled={resendingId === donation.id}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendingId === donation.id ? 'Sending...' : 'Resend Receipt'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

