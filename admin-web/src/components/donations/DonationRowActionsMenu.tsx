'use client'

import { useEffect, useRef, useState } from 'react'

export interface DonationRowActions {
  onViewDetails?: () => void
  onViewReceipt?: () => void
  onResendReceipt?: () => void
  onRequestChange?: () => void
  onAssignDonor?: () => void
  onRefund?: () => void
  resendDisabled?: boolean
  refundDisabled?: boolean
  isResending?: boolean
  isRefunding?: boolean
}

interface DonationRowActionsMenuProps {
  actions: DonationRowActions
}

export default function DonationRowActionsMenu({ actions }: DonationRowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const items: { label: string; onClick: () => void; destructive?: boolean; disabled?: boolean }[] =
    []

  if (actions.onViewDetails) {
    items.push({ label: 'View payment details', onClick: actions.onViewDetails })
  }
  if (actions.onViewReceipt) {
    items.push({ label: 'View / print receipt', onClick: actions.onViewReceipt })
  }
  if (actions.onResendReceipt) {
    items.push({
      label: actions.isResending ? 'Sending…' : 'Resend receipt',
      onClick: actions.onResendReceipt,
      disabled: actions.resendDisabled || actions.isResending,
    })
  }
  if (actions.onRequestChange) {
    items.push({ label: 'Request receipt / name change', onClick: actions.onRequestChange })
  }
  if (actions.onAssignDonor) {
    items.push({ label: 'Assign to donor', onClick: actions.onAssignDonor })
  }
  if (actions.onRefund) {
    items.push({
      label: actions.isRefunding ? 'Processing refund…' : 'Refund',
      onClick: actions.onRefund,
      destructive: true,
      disabled: actions.refundDisabled || actions.isRefunding,
    })
  }

  if (items.length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Actions
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 py-1 bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black/5"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                item.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
