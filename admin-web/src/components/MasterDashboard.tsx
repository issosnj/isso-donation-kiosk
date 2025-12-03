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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Master Admin Dashboard</h1>
        <p className="text-gray-600">Manage temples, users, and view all donations across the platform</p>
      </div>
      {renderTab()}
    </div>
  )
}

