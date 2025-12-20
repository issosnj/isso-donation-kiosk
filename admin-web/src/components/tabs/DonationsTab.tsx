'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { useState } from 'react'

interface DonationsTabProps {
  templeId?: string
  isMasterAdmin?: boolean
}

export default function DonationsTab({ templeId, isMasterAdmin = false }: DonationsTabProps) {
  const queryClient = useQueryClient()
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [viewingPaymentDetailsId, setViewingPaymentDetailsId] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [selectedTempleId, setSelectedTempleId] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Fetch temples for master admin filter
  const { data: temples } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: isMasterAdmin,
  })

  // Build query params
  const queryParams: any = {}
  if (isMasterAdmin && selectedTempleId !== 'all') {
    queryParams.templeId = selectedTempleId
  } else if (!isMasterAdmin && templeId) {
    queryParams.templeId = templeId
  }
  if (startDate) queryParams.startDate = startDate
  if (endDate) queryParams.endDate = endDate

  const { data: donations, isLoading } = useQuery({
    queryKey: ['donations', selectedTempleId, startDate, endDate, templeId],
    queryFn: async () => {
      const response = await api.get('/donations', {
        params: queryParams,
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

  const generateReceiptNumbersMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/donations/cleanup/generate-receipt-numbers')
      return response.data
    },
    onSuccess: (data) => {
      alert(`Successfully generated receipt numbers for ${data.updated} donations!`)
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to generate receipt numbers')
    },
  })

  const refundMutation = useMutation({
    mutationFn: async ({ donationId, amount, reason }: { donationId: string; amount?: number; reason?: string }) => {
      const response = await api.post(`/donations/${donationId}/refund`, { amount, reason })
      return response.data
    },
    onSuccess: (data) => {
      alert(`Refund processed successfully! Refund ID: ${data.refundId}, Amount: $${data.refundAmount.toFixed(2)}`)
      setRefundingId(null)
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to process refund')
      setRefundingId(null)
    },
  })

  const fetchPaymentDetailsMutation = useMutation({
    mutationFn: async (donationId: string) => {
      const response = await api.get(`/donations/${donationId}/payment-details`)
      return response.data
    },
    onSuccess: (data) => {
      setPaymentDetails(data)
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to fetch payment details')
      setViewingPaymentDetailsId(null)
    },
  })

  const handleRefund = (donation: any) => {
    const refundAmount = prompt(`Enter refund amount (leave empty for full refund of $${Number(donation.amount).toFixed(2)}):`)
    if (refundAmount === null) return // User cancelled
    
    const amount = refundAmount.trim() ? parseFloat(refundAmount) : undefined
    if (amount !== undefined && (isNaN(amount) || amount <= 0 || amount > donation.amount)) {
      alert('Invalid refund amount')
      return
    }

    const reason = prompt('Enter refund reason (optional):') || undefined
    
    if (confirm(`Are you sure you want to refund ${amount ? `$${amount.toFixed(2)}` : 'the full amount'}?`)) {
      setRefundingId(donation.id)
      refundMutation.mutate({ donationId: donation.id, amount, reason })
    }
  }

  const handleViewPaymentDetails = (donationId: string) => {
    setViewingPaymentDetailsId(donationId)
    setPaymentDetails(null)
    fetchPaymentDetailsMutation.mutate(donationId)
  }

  const handleGenerateReceiptNumbers = () => {
    if (confirm('Generate receipt numbers for all successful donations that are missing them?')) {
      generateReceiptNumbersMutation.mutate()
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

  const showTempleColumn = isMasterAdmin && selectedTempleId === 'all'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filters */}
      {(isMasterAdmin || startDate || endDate) && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end">
            {isMasterAdmin && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Temple
                </label>
                <select
                  value={selectedTempleId}
                  onChange={(e) => setSelectedTempleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Temples</option>
                  {temples?.map((temple: any) => (
                    <option key={temple.id} value={temple.id}>
                      {temple.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Dates
              </button>
            )}
            </div>
            {isMasterAdmin && (
              <button
                onClick={handleGenerateReceiptNumbers}
                disabled={generateReceiptNumbersMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generateReceiptNumbersMutation.isPending ? 'Generating...' : 'Generate Receipt Numbers'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              {showTempleColumn && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Temple</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Receipt #</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gross Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Square Fee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Amount</th>
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
                {showTempleColumn && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {donation.temple?.name || 'Unknown'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {donation.receiptNumber || <span className="text-gray-400 italic">-</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600">
                    ${Number(donation.amount).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-red-600">
                    {donation.squareFee ? `-$${Number(donation.squareFee).toFixed(2)}` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-blue-600">
                    {donation.netAmount ? `$${Number(donation.netAmount).toFixed(2)}` : donation.amount ? `$${Number(donation.amount).toFixed(2)}` : '-'}
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
                  <div className="flex flex-col gap-1">
                    {donation.status === 'SUCCEEDED' && (
                      <a
                        href={`/receipt?id=${donation.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline"
                      >
                        View/Print Receipt
                      </a>
                    )}
                    {donation.status === 'SUCCEEDED' && donation.donorEmail && (
                      <button
                        onClick={() => handleResendReceipt(donation.id)}
                        disabled={resendingId === donation.id}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendingId === donation.id ? 'Sending...' : 'Resend Receipt'}
                      </button>
                    )}
                    {donation.status === 'SUCCEEDED' && donation.squarePaymentId && (
                      <>
                        <button
                          onClick={() => handleViewPaymentDetails(donation.id)}
                          disabled={viewingPaymentDetailsId === donation.id}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {viewingPaymentDetailsId === donation.id ? 'Loading...' : 'View Details'}
                        </button>
                        <button
                          onClick={() => handleRefund(donation)}
                          disabled={refundingId === donation.id || donation.status === 'REFUNDED'}
                          className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {refundingId === donation.id ? 'Processing...' : 'Refund'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Details Modal */}
      {viewingPaymentDetailsId && paymentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingPaymentDetailsId(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payment Details</h2>
              <button
                onClick={() => {
                  setViewingPaymentDetailsId(null)
                  setPaymentDetails(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment ID</p>
                  <p className="font-medium">{paymentDetails.payment?.id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">{paymentDetails.paymentStatus || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gross Amount</p>
                  <p className="font-medium">${(paymentDetails.netAmount + paymentDetails.squareFee).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Square Fee</p>
                  <p className="font-medium text-red-600">-${paymentDetails.squareFee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="font-medium text-blue-600">${paymentDetails.netAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Card Type</p>
                  <p className="font-medium">{paymentDetails.cardType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Card Last 4</p>
                  <p className="font-medium">{paymentDetails.cardLast4 ? `****${paymentDetails.cardLast4}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium">{paymentDetails.createdAt ? format(new Date(paymentDetails.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                </div>
              </div>
              {paymentDetails.payment && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Full Payment Details (JSON):</p>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(paymentDetails.payment, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

