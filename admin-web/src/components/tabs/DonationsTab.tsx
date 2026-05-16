'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import DonorInfoPopup from '../DonorInfoPopup'
import {
  PendingDonationsAlert,
  DonationsPageHeader,
  DonationsKPICards,
  DonationsFiltersToolbar,
  DonationsBulkBar,
  DonationsTable,
} from '@/components/donations'
import type { DonationRowActions } from '@/components/donations/DonationRowActionsMenu'
import {
  applyClientDonationFilters,
  computeDonationKpis,
  exportDonationsToCsv,
  extractCategoryOptions,
  filterBySucceededToggle,
} from '@/components/donations/donationUtils'
import type { Donation, PaymentDetailsResponse } from '@/types/donation'
import { isAnonymousForAssign } from '@/lib/donationDisplay'

interface DonationsTabProps {
  templeId?: string
  isMasterAdmin?: boolean
}

export default function DonationsTab({ templeId, isMasterAdmin = false }: DonationsTabProps) {
  const queryClient = useQueryClient()
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [viewingPaymentDetailsId, setViewingPaymentDetailsId] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailsResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [bulkResending, setBulkResending] = useState(false)
  const [selectedTempleId, setSelectedTempleId] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFailedAndCancelled, setShowFailedAndCancelled] = useState<boolean>(false)
  const [viewingDonorInfo, setViewingDonorInfo] = useState<{
    phone: string
    donorId?: string | null
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [changeRequestDonation, setChangeRequestDonation] = useState<Donation | null>(null)
  const [changeRequestForm, setChangeRequestForm] = useState({
    donorName: '',
    donorPhone: '',
    donorEmail: '',
    donorAddress: '',
    donorId: '',
  })
  const [changeRequestTempleNote, setChangeRequestTempleNote] = useState('')

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

  const { data: temple } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data as { id: string; name: string }
    },
    enabled: !isMasterAdmin && !!templeId,
  })

  const {
    data: donations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['donations', selectedTempleId, startDate, endDate, templeId],
    queryFn: async () => {
      const response = await api.get('/donations', {
        params: queryParams,
      })
      return response.data as Donation[]
    },
  })

  const { data: myChangeRequests } = useQuery({
    queryKey: ['donation-change-requests', 'my-temple'],
    queryFn: async () => {
      const response = await api.get('/donation-change-requests/my-temple')
      return response.data as any[]
    },
    enabled: !isMasterAdmin,
  })

  const pendingMyChangeCount =
    myChangeRequests?.filter((r: any) => r.status === 'PENDING').length ?? 0

  const createChangeRequestMutation = useMutation({
    mutationFn: async (body: {
      donationId: string
      templeNote?: string
      proposed: Record<string, string | undefined>
    }) => {
      const response = await api.post('/donation-change-requests', body)
      return response.data
    },
    onSuccess: () => {
      alert('Change request submitted for master admin approval.')
      setChangeRequestDonation(null)
      setChangeRequestTempleNote('')
      queryClient.invalidateQueries({ queryKey: ['donation-change-requests'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to submit request')
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

  const cleanupPendingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/donations/cleanup/pending')
      return response.data
    },
    onSuccess: (data) => {
      alert(`Successfully cleaned up ${data.deleted} pending donation(s).`)
      queryClient.invalidateQueries({ queryKey: ['donations'] })
      setSelectedIds(new Set())
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to cleanup pending donations')
    },
  })

  const cancelDonationMutation = useMutation({
    mutationFn: async (donationId: string) => {
      await api.post(`/donations/${donationId}/cancel`)
    },
    onSuccess: (_, donationId) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(donationId)
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to cancel donation')
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

  const handleRefund = (donation: Donation) => {
    const refundAmount = prompt(`Enter refund amount (leave empty for full refund of $${Number(donation.amount).toFixed(2)}):`)
    if (refundAmount === null) return // User cancelled
    
    const amount = refundAmount.trim() ? parseFloat(refundAmount) : undefined
    if (amount !== undefined && (isNaN(amount) || amount <= 0 || amount > Number(donation.amount))) {
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

  const statusCounts = useMemo(() => {
    return donations.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {})
  }, [donations])

  const pendingCount = statusCounts.PENDING || 0
  const failedCount = statusCounts.FAILED || 0
  const cancelledCount = statusCounts.CANCELED || 0

  const handleCleanupPending = () => {
    if (confirm(`Delete all ${pendingCount} pending donation(s)? This cannot be undone.`)) {
      cleanupPendingMutation.mutate()
    }
  }

  const kpis = useMemo(() => computeDonationKpis(donations), [donations])
  const categoryOptions = useMemo(() => extractCategoryOptions(donations), [donations])
  const statusFiltered = useMemo(
    () => filterBySucceededToggle(donations, showFailedAndCancelled),
    [donations, showFailedAndCancelled],
  )
  const displayDonations = useMemo(
    () =>
      applyClientDonationFilters(statusFiltered, {
        searchQuery,
        statusFilter,
        categoryFilter,
      }),
    [statusFiltered, searchQuery, statusFilter, categoryFilter],
  )

  const showTempleColumn = isMasterAdmin && selectedTempleId === 'all'

  const templeLabel = useMemo(() => {
    if (isMasterAdmin) {
      if (selectedTempleId === 'all') return 'All temples'
      return temples?.find((t: { id: string; name: string }) => t.id === selectedTempleId)?.name
    }
    return temple?.name
  }, [isMasterAdmin, selectedTempleId, temples, temple?.name])

  const handleBulkCancelPending = () => {
    const pendingSelected = displayDonations.filter(
      (d) => d.status === 'PENDING' && selectedIds.has(d.id),
    )
    if (pendingSelected.length === 0) return
    if (confirm(`Cancel ${pendingSelected.length} selected pending donation(s)?`)) {
      pendingSelected.forEach((d) => cancelDonationMutation.mutate(d.id))
    }
  }

  const handleExport = (rows: Donation[] = displayDonations) => {
    exportDonationsToCsv(rows)
  }

  const handleExportSelected = () => {
    const rows = displayDonations.filter((d) => selectedIds.has(d.id))
    if (rows.length === 0) return
    handleExport(rows)
  }

  const handleBulkResend = async () => {
    const targets = displayDonations.filter(
      (d) => selectedIds.has(d.id) && d.status === 'SUCCEEDED' && d.donorEmail,
    )
    if (targets.length === 0) {
      alert('No selected donations with an email address.')
      return
    }
    if (!confirm(`Resend receipt emails for ${targets.length} donation(s)?`)) return
    setBulkResending(true)
    try {
      const results = await Promise.allSettled(
        targets.map((d) => api.post(`/donations/${d.id}/resend-receipt`)),
      )
      let succeeded = 0
      const failures: { id: string; email: string | null | undefined; message: string }[] = []

      results.forEach((result, i) => {
        const d = targets[i]
        if (result.status === 'fulfilled') {
          succeeded++
          return
        }
        const err = result.reason as { response?: { data?: { message?: string } } }
        failures.push({
          id: d.id,
          email: d.donorEmail,
          message: err.response?.data?.message || 'Failed to send',
        })
      })

      if (failures.length === 0) {
        alert(`Receipt emails sent for ${succeeded} donation(s).`)
      } else {
        const failureLines = failures
          .map((f) => `${f.id}${f.email ? ` (${f.email})` : ''}: ${f.message}`)
          .join('\n')
        alert(
          `Sent ${succeeded} of ${targets.length} receipt email(s).\n\nFailed (${failures.length}):\n${failureLines}`,
        )
      }
    } finally {
      setBulkResending(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === displayDonations.length && displayDonations.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayDonations.map((d) => d.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedPendingCount = displayDonations.filter(
    (d) => d.status === 'PENDING' && selectedIds.has(d.id),
  ).length

  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
    setStatusFilter('')
    setCategoryFilter('')
    setShowFailedAndCancelled(false)
    if (isMasterAdmin) setSelectedTempleId('all')
  }

  const openChangeRequest = (donation: Donation) => {
    setChangeRequestDonation(donation)
    setChangeRequestForm({
      donorName: donation.donorName || '',
      donorPhone: donation.donorPhone || '',
      donorEmail: donation.donorEmail || '',
      donorAddress: donation.donorAddress || '',
      donorId: donation.donorId || '',
    })
    setChangeRequestTempleNote('')
  }

  const getRowActions = (donation: Donation): DonationRowActions => {
    const hasPayment =
      donation.status === 'SUCCEEDED' &&
      (donation.stripePaymentIntentId || donation.squarePaymentId)

    return {
      onViewDetails: hasPayment ? () => handleViewPaymentDetails(donation.id) : undefined,
      onViewReceipt: donation.receiptNumber
        ? () => window.open(`/receipt?id=${donation.id}`, '_blank', 'noopener,noreferrer')
        : undefined,
      onResendReceipt:
        donation.status === 'SUCCEEDED' && donation.donorEmail
          ? () => handleResendReceipt(donation.id)
          : undefined,
      resendDisabled: !donation.donorEmail,
      isResending: resendingId === donation.id,
      onRequestChange:
        !isMasterAdmin && donation.status === 'SUCCEEDED'
          ? () => openChangeRequest(donation)
          : undefined,
      onAssignDonor:
        isAnonymousForAssign(donation) && donation.status === 'SUCCEEDED'
          ? () => setAssigningDonationId(donation.id)
          : undefined,
      onRefund: hasPayment ? () => handleRefund(donation) : undefined,
      refundDisabled: donation.status === 'REFUNDED',
      isRefunding: refundingId === donation.id,
    }
  }

  const emptyHint =
    !showFailedAndCancelled && (failedCount > 0 || cancelledCount > 0)
      ? `Enable "Show failed & cancelled" to see ${failedCount + cancelledCount} other donation(s).`
      : donations.length === 0
        ? 'Donations will appear here once processed on a kiosk.'
        : 'Try adjusting your filters or date range.'

  const masterAdminActions = isMasterAdmin ? (
    <>
      <button
        type="button"
        onClick={handleGenerateReceiptNumbers}
        disabled={generateReceiptNumbersMutation.isPending}
        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {generateReceiptNumbersMutation.isPending ? 'Generating…' : 'Generate receipt #'}
      </button>
      <button
        type="button"
        onClick={handleBackfillStripeFees}
        disabled={backfillStripeFeesMutation.isPending}
        className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
      >
        {backfillStripeFeesMutation.isPending ? 'Backfilling…' : 'Backfill Stripe fees'}
      </button>
    </>
  ) : undefined

  return (
    <div className="space-y-6 pb-8">
      <DonationsPageHeader
        templeLabel={templeLabel}
        isMasterAdmin={isMasterAdmin}
        onExport={() => handleExport()}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <DonationsKPICards kpis={kpis} isLoading={isLoading} />

      {pendingCount > 0 && (
        <PendingDonationsAlert
          count={pendingCount}
          onReview={() => setShowFailedAndCancelled(true)}
          onShowFailedAndCancelled={() => setShowFailedAndCancelled(true)}
          onCleanupPending={isMasterAdmin ? handleCleanupPending : undefined}
          isCleaningUp={cleanupPendingMutation.isPending}
          isMasterAdmin={isMasterAdmin}
        />
      )}

      {!isMasterAdmin && pendingMyChangeCount > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
          You have <strong>{pendingMyChangeCount}</strong> receipt / donor change request
          {pendingMyChangeCount === 1 ? '' : 's'} awaiting master admin approval.
        </div>
      )}

      <DonationsFiltersToolbar
        isMasterAdmin={isMasterAdmin}
        temples={temples}
        selectedTempleId={selectedTempleId}
        onTempleChange={setSelectedTempleId}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categoryOptions}
        showFailedAndCancelled={showFailedAndCancelled}
        onShowFailedAndCancelledChange={setShowFailedAndCancelled}
        onClearFilters={clearAllFilters}
        masterAdminActions={masterAdminActions}
      />

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                displayDonations.length > 0 && selectedIds.size === displayDonations.length
              }
              onChange={toggleSelectAll}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">Select all on page</span>
          </label>
          <p className="text-xs text-gray-500 tabular-nums">
            {displayDonations.length} row{displayDonations.length === 1 ? '' : 's'}
          </p>
        </div>

        <DonationsBulkBar
          selectedCount={selectedIds.size}
          onExportSelected={handleExportSelected}
          onResendSelected={handleBulkResend}
          onClearSelection={() => setSelectedIds(new Set())}
          onCancelPending={selectedPendingCount > 0 ? handleBulkCancelPending : undefined}
          pendingSelectedCount={selectedPendingCount}
          isResending={bulkResending}
          isCancelling={cancelDonationMutation.isPending}
        />

        {isLoading ? (
          <div className="p-12 animate-pulse space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : (
          <DonationsTable
            donations={displayDonations}
            showTempleColumn={showTempleColumn}
            selectedIds={selectedIds}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelect={toggleSelect}
            allSelected={
              displayDonations.length > 0 && selectedIds.size === displayDonations.length
            }
            getRowActions={getRowActions}
            onViewDonorDetails={setViewingDonorInfo}
            onAssignDonor={setAssigningDonationId}
            emptyMessage={
              donations.length === 0 ? 'No donations found' : 'No donations match your filters'
            }
            emptyHint={emptyHint}
          />
        )}
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
                  <p className="font-medium">
                    {paymentDetails.payment?.id != null
                      ? String(paymentDetails.payment.id)
                      : 'N/A'}
                  </p>
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
          donorId={viewingDonorInfo.donorId ?? undefined}
          donorName={viewingDonorInfo.name}
          donorEmail={viewingDonorInfo.email}
          donorAddress={viewingDonorInfo.address}
          templeId={isMasterAdmin ? selectedTempleId !== 'all' ? selectedTempleId : undefined : templeId}
          isMasterAdmin={isMasterAdmin}
          onClose={() => setViewingDonorInfo(null)}
        />
      )}

      {/* Temple: request donor/receipt change (master approval) */}
      {changeRequestDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request receipt / name change</h2>
                <button
                  type="button"
                  onClick={() => setChangeRequestDonation(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Proposed values are sent to a master admin for approval. After approval, the donation record and receipts will use the new donor information.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-xs font-medium text-gray-600">Name</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={changeRequestForm.donorName}
                onChange={(e) => setChangeRequestForm((f) => ({ ...f, donorName: e.target.value }))}
              />
              <label className="block text-xs font-medium text-gray-600">Phone</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={changeRequestForm.donorPhone}
                onChange={(e) => setChangeRequestForm((f) => ({ ...f, donorPhone: e.target.value }))}
              />
              <label className="block text-xs font-medium text-gray-600">Email</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={changeRequestForm.donorEmail}
                onChange={(e) => setChangeRequestForm((f) => ({ ...f, donorEmail: e.target.value }))}
              />
              <label className="block text-xs font-medium text-gray-600">Mailing address</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[72px]"
                value={changeRequestForm.donorAddress}
                onChange={(e) => setChangeRequestForm((f) => ({ ...f, donorAddress: e.target.value }))}
              />
              <label className="block text-xs font-medium text-gray-600">Donor profile ID (optional UUID)</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-xs"
                placeholder="Leave blank if not linking to CRM donor"
                value={changeRequestForm.donorId}
                onChange={(e) => setChangeRequestForm((f) => ({ ...f, donorId: e.target.value }))}
              />
              <label className="block text-xs font-medium text-gray-600">Note to master admin</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[64px]"
                placeholder="Why is this change needed?"
                value={changeRequestTempleNote}
                onChange={(e) => setChangeRequestTempleNote(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangeRequestDonation(null)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createChangeRequestMutation.isPending}
                  onClick={() => {
                    if (!changeRequestDonation) return
                    const proposed: Record<string, string | undefined> = {
                      donorName: changeRequestForm.donorName,
                      donorPhone: changeRequestForm.donorPhone,
                      donorEmail: changeRequestForm.donorEmail,
                      donorAddress: changeRequestForm.donorAddress,
                    }
                    const idTrim = changeRequestForm.donorId.trim()
                    if (idTrim) proposed.donorId = idTrim
                    createChangeRequestMutation.mutate({
                      donationId: changeRequestDonation.id,
                      templeNote: changeRequestTempleNote.trim() || undefined,
                      proposed,
                    })
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  {createChangeRequestMutation.isPending ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                For anonymous donations only: link this gift to a donor profile so receipts and reports show their name.
                Statistics will be updated; you can optionally send a receipt email.
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

