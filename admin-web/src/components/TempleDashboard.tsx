'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import OverviewTab from './tabs/OverviewTab'
import DonationsTab from './tabs/DonationsTab'
import DevicesTab from './tabs/DevicesTab'
import CategoriesTab from './tabs/CategoriesTab'
import SquareTab from './tabs/SquareTab'

interface TempleDashboardProps {
  activeTab: string
  templeId: string
}

export default function TempleDashboard({ activeTab, templeId }: TempleDashboardProps) {
  const { data: temple } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab templeId={templeId} />
      case 'donations':
        return <DonationsTab templeId={templeId} />
      case 'devices':
        return <DevicesTab templeId={templeId} />
      case 'categories':
        return <CategoriesTab templeId={templeId} />
      case 'square':
        return <SquareTab templeId={templeId} />
      default:
        return <OverviewTab templeId={templeId} />
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{temple?.name || 'Temple Dashboard'}</h1>
      {renderTab()}
    </div>
  )
}

