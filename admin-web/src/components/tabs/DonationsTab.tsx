'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { useState } from 'react'
import DonorInfoPopup from '../DonorInfoPopup'

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
  const [showFailedAndCancelled, setShowFailedAndCancelled] = useState<boolean>(false)
  const [viewingDonorInfo, setViewingDonorInfo] = useState<{
    phone: string
    name?: string | null
    email?: string | null
    address?: string | null
  } | null>(null)
  const [assigningDonationId, setAssigningDonationId] = useState<string | null>(null)
  const [donorSearch, setDonorSearch] = useState<string>('')
  const [assigningDonorId, setAssigningDonorId] = useState<string | null>(null)
  const [showCreateDonor, setShowCreateDonor] = useState(false)
  const [newDonorForm, setNewDonorForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [sendReceiptEmail, setSendReceiptEmail] = useState(false)

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

  const backfillStripeFeesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/donations/cleanup/backfill-stripe-fees')
      return response.data
    },
    onSuccess: (data) => {
      alert(`Successfully backfilled Stripe fees for ${data.updated} donations!${data.failed > 0 ? ` ${data.failed} failed.` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to backfill Stripe fees')
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

  // Get the temple ID for the donation being assigned
  const assigningDonation = assigningDonationId 
    ? donations?.find((d: any) => d.id === assigningDonationId)
    : null
  const assignTempleId = assigningDonation 
    ? (assigningDonation.templeId || (isMasterAdmin && selectedTempleId !== 'all' ? selectedTempleId : templeId))
    : (isMasterAdmin && selectedTempleId !== 'all' ? selectedTempleId : templeId)

  // Fetch donors for assignment
  const { data: donorsData } = useQuery({
    queryKey: ['donors', assignTempleId, donorSearch],
    queryFn: async () => {
      if (!assignTempleId) return { donors: [], total: 0 }
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
      })
      if (donorSearch) {
        params.append('search', donorSearch)
      }
      const endpoint = isMasterAdmin && assignTempleId
        ? `/donors/temple/${assignTempleId}`
        : '/donors/my-temple'
      const response = await api.get(`${endpoint}?${params.toString()}`)
      return response.data
    },
    enabled: !!assigningDonationId && !!assignTempleId,
  })

  const createDonorMutation = useMutation({
    mutationFn: async (donorData: { name?: string; phone: string; email?: string; address?: string; templeId?: string }) => {
      const response = await api.post('/donors', donorData)
      return response.data
    },
    onSuccess: (newDonor) => {
      // After creating donor, automatically assign the donation
      if (assigningDonationId) {
        assignDonationMutation.mutate({
          donationId: assigningDonationId,
          donorId: newDonor.id,
          sendReceiptEmail,
        })
      }
      setShowCreateDonor(false)
      setNewDonorForm({ name: '', phone: '', email: '', address: '' })
      queryClient.invalidateQueries({ queryKey: ['donors'] })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create donor'
      alert(errorMessage)
      // Reset form state on error to allow retry
      setNewDonorForm({ name: '', phone: '', email: '', address: '' })
    },
  })

  const assignDonationMutation = useMutation({
    mutationFn: async ({ donationId, donorId, sendReceiptEmail }: { donationId: string; donorId: string; sendReceiptEmail?: boolean }) => {
      const response = await api.post(`/donations/${donationId}/assign-donor`, { 
        donorId,
        sendReceiptEmail: sendReceiptEmail || false,
      })
      return response.data
    },
    onSuccess: () => {
      const message = sendReceiptEmail 
        ? 'Donation successfully assigned to donor! Receipt email will be sent if donor has an email address.'
        : 'Donation successfully assigned to donor!'
      alert(message)
      setAssigningDonationId(null)
      setDonorSearch('')
      setAssigningDonorId(null)
      setShowCreateDonor(false)
      setSendReceiptEmail(false)
      setNewDonorForm({ name: '', phone: '', email: '', address: '' })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
      queryClient.invalidateQueries({ queryKey: ['donors'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to assign donation to donor')
      setAssigningDonorId(null)
    },
  })

  const handleAssignDonor = (donorId: string) => {
    if (!assigningDonationId) return
    const confirmMessage = sendReceiptEmail
      ? 'Are you sure you want to assign this donation to this donor? This will update the donor\'s statistics and send a receipt email if the donor has an email address.'
      : 'Are you sure you want to assign this donation to this donor? This will update the donor\'s statistics.'
    if (confirm(confirmMessage)) {
      setAssigningDonorId(donorId)
      assignDonationMutation.mutate({ 
        donationId: assigningDonationId, 
        donorId,
        sendReceiptEmail,
      })
    }
  }

  const handleCreateDonor = () => {
    if (!newDonorForm.phone || !newDonorForm.phone.trim()) {
      alert('Phone number is required')
      return
    }
    if (!assignTempleId) {
      alert('Unable to determine temple. Please ensure the donation has a valid temple ID.')
      return
    }
    if (!assigningDonationId) {
      alert('No donation selected for assignment')
      return
    }
    createDonorMutation.mutate({
      ...newDonorForm,
      templeId: assignTempleId,
    })
  }

  const handleGenerateReceiptNumbers = () => {
    if (confirm('Generate receipt numbers for all successful donations that are missing them?')) {
      generateReceiptNumbersMutation.mutate()
    }
  }

  const handleBackfillStripeFees = () => {
    if (confirm('Backfill Stripe fees for all donations that are missing fee information? This will fetch actual fees from Stripe for each donation.')) {
      backfillStripeFeesMutation.mutate()
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

  // Count donations by status for info display
  const statusCounts = donations.reduce((acc: any, donation: any) => {
    acc[donation.status] = (acc[donation.status] || 0) + 1
    return acc
  }, {})

  const pendingCount = statusCounts.PENDING || 0
  const failedCount = statusCounts.FAILED || 0
  const cancelledCount = statusCounts.CANCELED || 0

  // Filter donations based on toggle
  const filteredDonations = donations.filter((donation: any) => {
    if (showFailedAndCancelled) {
      // Show all donations when toggle is on
      return true
    } else {
      // Only show SUCCEEDED donations when toggle is off
      return donation.status === 'SUCCEEDED'
    }
  })

  if (filteredDonations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No successful donations found</p>
        <p className="text-sm text-gray-400 mt-1">
          Showing only successful donations. 
          {failedCount > 0 || cancelledCount > 0 ? (
            <> Toggle "Show Failed & Cancelled" to see {failedCount + cancelledCount} other donation(s).</>
          ) : null}
        </p>
      </div>
    )
  }

  const showTempleColumn = isMasterAdmin && selectedTempleId === 'all'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filters */}
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
            <div className="flex items-center gap-4">
              {/* Toggle to show/hide failed and cancelled - visible for all users */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFailedAndCancelled}
                    onChange={(e) => setShowFailedAndCancelled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show Failed & Cancelled
                  </span>
                </label>
              </div>
              {isMasterAdmin && (
                <div className="flex gap-2">
                <button
                  onClick={handleGenerateReceiptNumbers}
                  disabled={generateReceiptNumbersMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generateReceiptNumbersMutation.isPending ? 'Generating...' : 'Generate Receipt Numbers'}
                </button>
                <button
                  onClick={handleBackfillStripeFees}
                  disabled={backfillStripeFeesMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backfillStripeFeesMutation.isPending ? 'Backfilling...' : 'Backfill Stripe Fees'}
                </button>
              </div>
              )}
            </div>
          </div>
        </div>

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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stripe Fee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donor Info</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Show info about PENDING donations if any exist */}
            {pendingCount > 0 && (
              <tr>
                <td colSpan={showTempleColumn ? 10 : 9} className="px-6 py-3 bg-yellow-50 border-y border-yellow-200">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      <strong>{pendingCount} donation(s) with PENDING status</strong> - These are donations that were initiated but the payment flow was interrupted (app closed, network error, etc.). 
                      They should be automatically cleaned up or can be manually cancelled.
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {filteredDonations.map((donation: any) => (
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
                    {donation.status === 'SUCCEEDED' && (donation.stripeFee || donation.squareFee) ? `-$${Number(donation.stripeFee || donation.squareFee).toFixed(2)}` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-blue-600">
                    {donation.status === 'SUCCEEDED' && donation.netAmount ? `$${Number(donation.netAmount).toFixed(2)}` : donation.status === 'SUCCEEDED' && donation.amount ? `$${Number(donation.amount).toFixed(2)}` : '-'}
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
                  {donation.donorPhone || donation.donorId ? (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setViewingDonorInfo({
                          phone: donation.donorPhone,
                          name: donation.donorName,
                          email: donation.donorEmail,
                          address: donation.donorAddress,
                        })}
                        className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-medium text-left"
                      >
                        View Info
                      </button>
                      {donation.assignedAt && (
                        <div className="text-xs text-gray-500">
                          Assigned {format(new Date(donation.assignedAt), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-400">Anonymous</span>
                      {donation.status === 'SUCCEEDED' && (
                        <button
                          onClick={() => setAssigningDonationId(donation.id)}
                          className="px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline w-fit"
                        >
                          Assign to Donor
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {donation.receiptNumber && (
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
                  <p className="font-medium">${(paymentDetails.netAmount + (paymentDetails.stripeFee || paymentDetails.squareFee || 0)).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stripe Fee</p>
                  <p className="font-medium text-red-600">-${(paymentDetails.stripeFee || paymentDetails.squareFee || 0).toFixed(2)}</p>
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
      {/* Donor Info Popup */}
      {viewingDonorInfo && (
        <DonorInfoPopup
          donorPhone={viewingDonorInfo.phone}
          donorName={viewingDonorInfo.name}
          donorEmail={viewingDonorInfo.email}
          donorAddress={viewingDonorInfo.address}
          templeId={isMasterAdmin ? selectedTempleId !== 'all' ? selectedTempleId : undefined : templeId}
          isMasterAdmin={isMasterAdmin}
          onClose={() => setViewingDonorInfo(null)}
        />
      )}

      {/* Assign Donation to Donor Modal */}
      {assigningDonationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Assign Donation to Donor</h2>
                <button
                  onClick={() => {
                    setAssigningDonationId(null)
                    setDonorSearch('')
                    setAssigningDonorId(null)
                    setShowCreateDonor(false)
                    setSendReceiptEmail(false)
                    setNewDonorForm({ name: '', phone: '', email: '', address: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Search for a donor to assign this donation. The donation will be linked to the donor and their statistics will be updated.
              </p>
              {assigningDonation && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Donation:</strong> ${Number(assigningDonation.amount).toFixed(2)} on {format(new Date(assigningDonation.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Toggle between search and create */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setShowCreateDonor(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !showCreateDonor
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Search Existing Donor
                </button>
                <button
                  onClick={() => setShowCreateDonor(true)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    showCreateDonor
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Create New Donor
                </button>
              </div>

              {!showCreateDonor ? (
                <>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name, phone, or email..."
                      value={donorSearch}
                      onChange={(e) => setDonorSearch(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {/* Send receipt email checkbox */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendReceiptEmail}
                        onChange={(e) => setSendReceiptEmail(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        Send receipt email after assignment (if donor has email)
                      </span>
                    </label>
                  </div>
                  {donorsData?.donors && donorsData.donors.length > 0 ? (
                    <div className="space-y-2">
                      {donorsData.donors.map((donor: any) => (
                        <div
                          key={donor.id}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{donor.name || 'No name'}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {donor.phone && <span>Phone: {donor.phone}</span>}
                                {donor.email && <span className="ml-4">Email: {donor.email}</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Total Donations: {donor.totalDonations || 0} | Total Amount: ${Number(donor.totalAmount || 0).toFixed(2)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignDonor(donor.id)}
                              disabled={assigningDonorId === donor.id || assignDonationMutation.isPending}
                              className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              {assigningDonorId === donor.id ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {donorSearch ? 'No donors found matching your search.' : 'Start typing to search for donors...'}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newDonorForm.phone}
                      onChange={(e) => setNewDonorForm({ ...newDonorForm, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newDonorForm.name}
                      onChange={(e) => setNewDonorForm({ ...newDonorForm, name: e.target.value })}
                      placeholder="Enter donor name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newDonorForm.email}
                      onChange={(e) => setNewDonorForm({ ...newDonorForm, email: e.target.value })}
                      placeholder="Enter email address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={newDonorForm.address}
                      onChange={(e) => setNewDonorForm({ ...newDonorForm, address: e.target.value })}
                      placeholder="Enter mailing address"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {/* Send receipt email checkbox for new donor */}
                  <div className="pb-4 border-b border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendReceiptEmail}
                        onChange={(e) => setSendReceiptEmail(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        Send receipt email after assignment (if email provided)
                      </span>
                    </label>
                  </div>
                  <button
                    onClick={handleCreateDonor}
                    disabled={!newDonorForm.phone || createDonorMutation.isPending}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {createDonorMutation.isPending ? 'Creating...' : 'Create Donor & Assign Donation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

