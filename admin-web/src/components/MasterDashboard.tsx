'use client'

import { useSearchParams } from 'next/navigation'
import OverviewTab from './tabs/OverviewTab'
import TemplesTab from './tabs/TemplesTab'
import DonationsTab from './tabs/DonationsTab'
import DonorsTab from './tabs/DonorsTab'
import UsersTab from './tabs/UsersTab'
import MasterReceiptsTab from './tabs/MasterReceiptsTab'
import ReligiousEventsTab from './tabs/ReligiousEventsTab'
import MasterDevicesTab from './tabs/MasterDevicesTab'
import DonationChangeRequestsTab from './tabs/DonationChangeRequestsTab'
import MasterAdminPageHeader from './layout/MasterAdminPageHeader'
import { useLastUpdated } from '@/hooks/useLastUpdated'

interface MasterDashboardProps {
  activeTab: string
}

export default function MasterDashboard({ activeTab }: MasterDashboardProps) {
  const searchParams = useSearchParams()
  const templeId = searchParams.get('templeId') || undefined
  const lastUpdated = useLastUpdated()

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
      case 'donation-change-requests':
        return <DonationChangeRequestsTab />
      case 'religious-events':
        return <ReligiousEventsTab />
      default:
        return <OverviewTab />
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      <MasterAdminPageHeader
        activeTab={activeTab}
        trailing={
          activeTab === 'overview' && lastUpdated ? (
            <>Last updated {lastUpdated}</>
          ) : undefined
        }
      />
      {renderTab()}
    </div>
  )
}
