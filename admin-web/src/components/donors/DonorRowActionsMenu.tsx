'use client'

import { useEffect, useRef, useState } from 'react'

export interface DonorRowActions {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMarkVip?: () => void
  isVip?: boolean
}

interface DonorRowActionsMenuProps {
  actions: DonorRowActions
}

export default function DonorRowActionsMenu({ actions }: DonorRowActionsMenuProps) {
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

  const items: {
    label: string
    onClick: () => void
    destructive?: boolean
  }[] = []

  if (actions.onView) items.push({ label: 'View profile', onClick: actions.onView })
  if (actions.onEdit) items.push({ label: 'Edit donor', onClick: actions.onEdit })
  if (actions.onMarkVip) {
    items.push({
      label: actions.isVip ? 'Remove VIP' : 'Mark as VIP',
      onClick: actions.onMarkVip,
    })
  }
  if (actions.onDelete) {
    items.push({ label: 'Delete donor', onClick: actions.onDelete, destructive: true })
  }

  return (
    <div className="relative flex items-center gap-1" ref={ref} onClick={(e) => e.stopPropagation()}>
      {actions.onView && (
        <button
          type="button"
          onClick={actions.onView}
          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          aria-label="View donor"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && items.length > 0 && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-44 py-1 bg-white border border-gray-200/80 rounded-xl shadow-lg ring-1 ring-black/5"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
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
