'use client'

import { useState, useEffect } from 'react'
import OverviewTab from './tabs/OverviewTab'
import TemplesTab from './tabs/TemplesTab'
import DonationsTab from './tabs/DonationsTab'
import DonorsTab from './tabs/DonorsTab'
import UsersTab from './tabs/UsersTab'
import ThemeTab from './tabs/ThemeTab'
import MasterReceiptsTab from './tabs/MasterReceiptsTab'
import ReligiousEventsTab from './tabs/ReligiousEventsTab'

interface MasterDashboardProps {
  activeTab: string
}

export default function MasterDashboard({ activeTab }: MasterDashboardProps) {
  // Get templeId from URL if present (for viewing specific temple's donors)
  const [templeId, setTempleId] = useState<string | undefined>(undefined)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const templeIdParam = urlParams.get('templeId')
      setTempleId(templeIdParam || undefined)
    }
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />
      case 'temples':
        return <TemplesTab />
      case 'donations':
        return <DonationsTab isMasterAdmin={true} />
      case 'donors':
        return <DonorsTab isMasterAdmin={true} templeId={templeId} />
      case 'users':
        return <UsersTab />
      case 'theme':
        return <ThemeTab />
      case 'receipts':
        return <MasterReceiptsTab />
      case 'religious-events':
        return <ReligiousEventsTab />
      default:
        return <OverviewTab />
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Master Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Manage temples, users, and view all donations across the platform</p>
      </div>
      {renderTab()}
    </div>
  )
}

