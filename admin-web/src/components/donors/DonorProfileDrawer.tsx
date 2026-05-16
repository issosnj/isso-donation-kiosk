'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import api from '@/lib/api'
import type { Donor } from '@/types/donor'
import ReceiptView from '@/components/ReceiptView'
import {
  donorDisplayName,
  donorInitials,
  formatDonorDate,
  formatMoneyPrecise,
  getDonorNotes,
  isDonorVip,
  setDonorNotes,
  setDonorVip,
} from './donorUtils'

interface DonorProfileDrawerProps {
  donor: Donor
  templeId?: string
  isMasterAdmin?: boolean
  onClose: () => void
  onEdit: () => void
}

export default function DonorProfileDrawer({
  donor,
  templeId,
  isMasterAdmin = false,
  onClose,
  onEdit,
}: DonorProfileDrawerProps) {
  const queryClient = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)
  const [vip, setVip] = useState(() => isDonorVip(donor.id))
  const [notes, setNotes] = useState(() => getDonorNotes(donor.id))
  const [notesOpen, setNotesOpen] = useState(false)
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<Record<string, unknown> | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 200)
  }

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations-by-donor', donor.phone, templeId, donor.id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (templeId && isMasterAdmin) params.append('templeId', templeId)
      if (donor.id) params.append('donorId', donor.id)
      const response = await api.get(
        `/donations/by-donor/${encodeURIComponent(donor.phone)}?${params.toString()}`,
      )
      return response.data
    },
    enabled: !!donor.phone,
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
    onError: (error: { response?: { data?: { message?: string } } }) => {
      alert(error.response?.data?.message || 'Failed to send receipt')
      setResendingId(null)
    },
  })

  const sortedDonations = [...donations].sort(
    (a: { createdAt: string }, b: { createdAt: string }) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const lifetimeTotal = sortedDonations.reduce(
    (sum: number, d: { amount: number }) => sum + Number(d.amount),
    0,
  )
  const avgGift =
    sortedDonations.length > 0 ? lifetimeTotal / sortedDonations.length : Number(donor.totalAmount)
  const firstDonation = sortedDonations[sortedDonations.length - 1]
  const lastDonation = sortedDonations[0]

  const handleViewReceipt = async (donationId: string) => {
    setViewingReceiptId(donationId)
    try {
      const response = await api.get(`/donations/${donationId}/receipt`)
      setReceiptData(response.data)
    } catch {
      alert('Failed to load receipt')
      setViewingReceiptId(null)
    }
  }

  const handleSaveNotes = () => {
    setDonorNotes(donor.id, notes)
    setNotesOpen(false)
  }

  const toggleVip = () => {
    const next = !vip
    setDonorVip(donor.id, next)
    setVip(next)
    queryClient.invalidateQueries({ queryKey: ['donors'] })
  }

  const stripePaymentId = sortedDonations.find(
    (d: { stripePaymentIntentId?: string }) => d.stripePaymentIntentId,
  )?.stripePaymentIntentId

  if (viewingReceiptId && receiptData) {
    const rd = receiptData as {
      donation: Parameters<typeof ReceiptView>[0]['donation']
      temple: Parameters<typeof ReceiptView>[0]['temple']
      receiptConfig: Parameters<typeof ReceiptView>[0]['receiptConfig']
    }
    return (
      <DrawerShell visible={visible} onBackdropClick={handleClose}>
        <div className="ml-auto flex flex-col h-full w-full max-w-lg sm:max-w-xl bg-white shadow-2xl">
          <DrawerTopBar title="Receipt" onClose={() => { setViewingReceiptId(null); setReceiptData(null) }} />
          <div className="flex-1 overflow-y-auto p-6">
            <ReceiptView
              donation={rd.donation}
              temple={rd.temple}
              receiptConfig={rd.receiptConfig}
            />
          </div>
        </div>
      </DrawerShell>
    )
  }

  return (
    <DrawerShell visible={visible} onBackdropClick={handleClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-drawer-title"
        className={`ml-auto h-full w-full max-w-lg sm:max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DrawerTopBar title="Donor profile" onClose={handleClose} />

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Header */}
          <div className="px-6 pt-2 pb-6 border-b border-gray-100 bg-gradient-to-b from-purple-50/50 to-white">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/25 shrink-0">
                {donorInitials(donor)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="donor-drawer-title" className="text-xl font-bold text-gray-900 truncate">
                  {donorDisplayName(donor)}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5 truncate">{donor.email || 'No email'}</p>
                <p className="text-sm text-gray-500 tabular-nums">{donor.phone}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <StatusBadge label={donor.totalDonations > 0 ? 'Active' : 'Prospect'} active />
                  {vip && <StatusBadge label="VIP" vip />}
                  {donor.totalDonations > 1 && <StatusBadge label="Repeat donor" />}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <section className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Donation analytics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Lifetime total" value={formatMoneyPrecise(lifetimeTotal || Number(donor.totalAmount))} />
              <MetricCard label="Average gift" value={formatMoneyPrecise(avgGift)} />
              <MetricCard
                label="First donation"
                value={firstDonation ? format(new Date(firstDonation.createdAt), 'MMM d, yyyy') : formatDonorDate(donor.createdAt)}
                small
              />
              <MetricCard
                label="Last donation"
                value={lastDonation ? format(new Date(lastDonation.createdAt), 'MMM d, yyyy') : formatDonorDate(donor.lastDonationDate)}
                small
              />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {donor.totalDonations} gift{donor.totalDonations !== 1 ? 's' : ''} on record
              {sortedDonations.length > 1 && ' · Consistent supporter'}
            </p>
          </section>

          {/* Timeline */}
          <section className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Activity timeline
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sortedDonations.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-xl">
                No donation activity yet.
              </p>
            ) : (
              <ol className="relative border-l-2 border-purple-100 ml-2 space-y-4">
                {sortedDonations.slice(0, 12).map((d: {
                  id: string
                  createdAt: string
                  amount: number
                  receiptNumber?: string
                  status?: string
                }) => (
                  <li key={d.id} className="ml-5 relative">
                    <span className="absolute -left-[1.35rem] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50" />
                    <div className="bg-gray-50/80 hover:bg-purple-50/50 rounded-xl p-3 transition-colors">
                      <p className="text-sm font-medium text-gray-900">
                        Donated {formatMoneyPrecise(Number(d.amount))}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(d.createdAt), 'MMM d, yyyy · h:mm a')}
                        {d.receiptNumber && ` · #${d.receiptNumber}`}
                      </p>
                      {d.receiptNumber && (
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(d.id)}
                            className="text-xs font-medium text-purple-600 hover:text-purple-800"
                          >
                            View receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Resend receipt email?')) {
                                setResendingId(d.id)
                                resendReceiptMutation.mutate(d.id)
                              }
                            }}
                            disabled={resendingId === d.id}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            {resendingId === d.id ? 'Sending…' : 'Resend email'}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Notes */}
          <section className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Internal notes
              </h3>
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                className="text-xs font-medium text-purple-600 hover:text-purple-800"
              >
                {notesOpen ? 'Cancel' : notes ? 'Edit' : 'Add note'}
              </button>
            </div>
            {notesOpen ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Sponsorship interest, family donor, volunteer, follow-up needed…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/25 outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  Save note
                </button>
              </div>
            ) : notes ? (
              <p className="text-sm text-gray-700 bg-amber-50/50 border border-amber-100 rounded-xl p-3 whitespace-pre-wrap">
                {notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No internal notes yet.</p>
            )}
          </section>

          {/* Quick actions */}
          <section className="px-6 py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Quick actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="Edit profile"
                onClick={onEdit}
                icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
              <ActionButton
                label={vip ? 'Remove VIP' : 'Mark VIP'}
                onClick={toggleVip}
                icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
              <ActionButton
                label="Export history"
                onClick={() => {
                  if (sortedDonations.length === 0) {
                    alert('No donations to export')
                    return
                  }
                  const rows = sortedDonations.map((d: { createdAt: string; amount: number; receiptNumber?: string }) => ({
                    Date: format(new Date(d.createdAt), 'yyyy-MM-dd'),
                    Amount: Number(d.amount).toFixed(2),
                    Receipt: d.receiptNumber || '',
                  }))
                  const headers = ['Date', 'Amount', 'Receipt'] as const
                  const csv = [
                    headers.join(','),
                    ...rows.map((r) =>
                      headers
                        .map((h) => `"${String(r[h]).replace(/"/g, '""')}"`)
                        .join(','),
                    ),
                  ].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `donor-${donor.phone}-history.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                icon="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
              <ActionButton
                label="Stripe payment"
                onClick={() => {
                  if (stripePaymentId) {
                    window.open(`https://dashboard.stripe.com/search?query=${stripePaymentId}`, '_blank')
                  } else {
                    alert('No Stripe payment on file for this donor.')
                  }
                }}
                disabled={!stripePaymentId}
                icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </div>
          </section>
        </div>
      </div>
    </DrawerShell>
  )
}

function DrawerShell({
  visible,
  onBackdropClick,
  children,
}: {
  visible: boolean
  onBackdropClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close drawer"
        onClick={onBackdropClick}
      />
      {children}
    </div>
  )
}

function DrawerTopBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm shrink-0">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function StatusBadge({
  label,
  vip,
  active,
}: {
  label: string
  vip?: boolean
  active?: boolean
}) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
        vip
          ? 'bg-amber-100 text-amber-800'
          : active
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  )
}

function MetricCard({
  label,
  value,
  small,
}: {
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`font-bold text-gray-900 mt-1 tabular-nums ${small ? 'text-sm' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string
  onClick: () => void
  icon: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200/80 rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-900 transition-all disabled:opacity-50 text-left"
    >
      <svg className="w-4 h-4 shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
    </button>
  )
}
