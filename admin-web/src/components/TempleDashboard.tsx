'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import OverviewTab from './tabs/OverviewTab'
import DonationsTab from './tabs/DonationsTab'
import DonorsTab from './tabs/DonorsTab'
import DevicesTab from './tabs/DevicesTab'
import DeviceDetailsTab from './tabs/DeviceDetailsTab'
import CategoriesTab from './tabs/CategoriesTab'
import SquareTab from './tabs/SquareTab'
import ReceiptTab from './tabs/ReceiptTab'

interface TempleDashboardProps {
  activeTab: string
  templeId: string
  deviceId?: string
}

export default function TempleDashboard({ activeTab, templeId, deviceId }: TempleDashboardProps) {
  const { data: temple } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const renderTab = () => {
    // If deviceId is provided, show device details
    if (deviceId && activeTab === 'devices') {
      return (
        <DeviceDetailsTab 
          deviceId={deviceId} 
          onBack={() => {
            // Remove deviceId from URL
            window.history.pushState({}, '', window.location.pathname + '?tab=devices')
            window.location.reload()
          }} 
        />
      )
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab templeId={templeId} />
      case 'donations':
        return <DonationsTab templeId={templeId} />
      case 'donors':
        return <DonorsTab templeId={templeId} />
      case 'devices':
        return <DevicesTab templeId={templeId} />
      case 'categories':
        return <CategoriesTab templeId={templeId} />
      case 'square':
        return <SquareTab templeId={templeId} />
      case 'receipts':
        return <ReceiptTab templeId={templeId} isMasterAdmin={false} />
      default:
        return <OverviewTab templeId={templeId} />
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{temple?.name || 'Temple Dashboard'}</h1>
        <p className="text-sm text-gray-600">Manage your temple's donations, devices, and Square integration</p>
      </div>
      {renderTab()}
    </div>
  )
}

