'use client'

import OverviewTab from './tabs/OverviewTab'
import TemplesTab from './tabs/TemplesTab'
import DonationsTab from './tabs/DonationsTab'
import UsersTab from './tabs/UsersTab'

interface MasterDashboardProps {
  activeTab: string
}

export default function MasterDashboard({ activeTab }: MasterDashboardProps) {
  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />
      case 'temples':
        return <TemplesTab />
      case 'donations':
        return <DonationsTab />
      case 'users':
        return <UsersTab />
      default:
        return <OverviewTab />
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Master Admin Dashboard</h1>
      {renderTab()}
    </div>
  )
}

