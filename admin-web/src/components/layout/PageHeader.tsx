'use client'

import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const headerPrimaryButtonClass =
  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-xl shadow-sm hover:bg-orange-700 disabled:opacity-50 transition-colors'

export const headerSecondaryButtonClass =
  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors'

export const headerDangerButtonClass =
  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors'

const ACTION_SLOT_ID = 'page-header-actions'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  trailing?: ReactNode
  /** Master pages render one header and let the active tab portal its buttons here. */
  actionSlot?: boolean
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  trailing,
  actionSlot = false,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-gray-600">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {trailing}
        {actions}
        {actionSlot ? (
          <div id={ACTION_SLOT_ID} className="flex flex-wrap items-center gap-2" />
        ) : null}
      </div>
    </div>
  )
}

/** Places tab actions into the master page header, on the same row as the title. */
export function PageHeaderActions({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const next = document.getElementById(ACTION_SLOT_ID)
    setSlot((current) => (current === next ? current : next))
  })

  if (!slot) return null
  return createPortal(children, slot)
}
