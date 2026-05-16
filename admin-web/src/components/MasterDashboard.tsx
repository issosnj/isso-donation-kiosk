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
      case 'donation-change-requests':
        return <DonationChangeRequestsTab />
      case 'religious-events':
        return <ReligiousEventsTab />
      default:
        return <OverviewTab />
    }
  }

  const showPageHeader = activeTab !== 'overview'

  return (
    <div className="min-w-0 max-w-full">
      {showPageHeader && (
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{pageTitle(activeTab)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pageSubtitle(activeTab)}</p>
        </div>
      )}
      {renderTab()}
    </div>
  )
}

function pageTitle(tab: string): string {
  const titles: Record<string, string> = {
    temples: 'Temples',
    devices: 'Device fleet',
    donations: 'Donations',
    donors: 'Donors',
    users: 'Users & roles',
    receipts: 'Receipts',
    'donation-change-requests': 'Receipt changes',
    'religious-events': 'Observances',
  }
  return titles[tab] ?? 'Platform'
}

function pageSubtitle(tab: string): string {
  const subtitles: Record<string, string> = {
    temples: 'Manage temple organizations and Stripe connections',
    devices: 'Monitor and control kiosk devices nationwide',
    donations: 'All donations across temples',
    donors: 'Donor profiles and engagement',
    users: 'Admin accounts and permissions',
    receipts: 'Receipt templates and delivery',
    'donation-change-requests': 'Pending receipt correction requests',
    'religious-events': 'Global observance calendar',
  }
  return subtitles[tab] ?? ''
}

