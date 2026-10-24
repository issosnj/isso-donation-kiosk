'use client'

import type { ReactNode } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { getMasterAdminPageMeta } from '@/lib/masterAdminPageMeta'

interface MasterAdminPageHeaderProps {
  activeTab: string
  trailing?: ReactNode
}

export default function MasterAdminPageHeader({ activeTab, trailing }: MasterAdminPageHeaderProps) {
  const { title, subtitle } = getMasterAdminPageMeta(activeTab)

  return (
    <div className="mb-6">
      <PageHeader
        eyebrow="ISSO Platform"
        title={title}
        description={subtitle}
        trailing={
          trailing ? (
            <span className="text-xs font-medium tabular-nums text-gray-500">{trailing}</span>
          ) : null
        }
        actionSlot
      />
    </div>
  )
}
