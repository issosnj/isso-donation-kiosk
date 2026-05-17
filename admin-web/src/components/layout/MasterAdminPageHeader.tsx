'use client'

import type { ReactNode } from 'react'
import { getMasterAdminPageMeta } from '@/lib/masterAdminPageMeta'

interface MasterAdminPageHeaderProps {
  activeTab: string
  trailing?: ReactNode
}

export default function MasterAdminPageHeader({ activeTab, trailing }: MasterAdminPageHeaderProps) {
  const { title, subtitle } = getMasterAdminPageMeta(activeTab)

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
      {trailing ? (
        <div className="shrink-0 text-xs font-medium tabular-nums text-gray-400">{trailing}</div>
      ) : null}
    </div>
  )
}
