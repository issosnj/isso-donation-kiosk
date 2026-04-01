'use client'

import { useSearchParams } from 'next/navigation'
import { useAlerts } from '@/hooks/useAlerts'
import { StatusSummaryStrip } from './alerts'
import OverviewTab from './tabs/OverviewTab'
import TemplesTab from './tabs/TemplesTab'
import DonationsTab from './tabs/DonationsTab'
import DonorsTab from './tabs/DonorsTab'
import UsersTab from './tabs/UsersTab'
import MasterReceiptsTab from './tabs/MasterReceiptsTab'
import ReligiousEventsTab from './tabs/ReligiousEventsTab'
import MasterDevicesTab from './tabs/MasterDevicesTab'

interface MasterDashboardProps {
  activeTab: string
}

export default function MasterDashboard({ activeTab }: MasterDashboardProps) {
  const searchParams = useSearchParams()
  const templeId = searchParams.get('templeId') || undefined

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />
      case 'temples':
        return <TemplesTab />
      case 'devices':
        return <MasterDevicesTab />
      case 'donations':
        return <DonationsTab isMasterAdmin={true} />
      case 'donors':
        return <DonorsTab isMasterAdmin={true} templeId={templeId} />
      case 'users':
        return <UsersTab />
      case 'receipts':
        return <MasterReceiptsTab />
      case 'religious-events':
        return <ReligiousEventsTab />
      default:
        return <OverviewTab />
    }
  }

  const { summary, isLoading } = useAlerts()

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Master Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Manage temples, users, and view all donations across the platform</p>
      </div>
      <div className="mb-6">
        <StatusSummaryStrip summary={summary} isLoading={isLoading} />
      </div>
      {renderTab()}
    </div>
  )
}

