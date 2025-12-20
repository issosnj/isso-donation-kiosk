'use client'

import OverviewTab from './tabs/OverviewTab'
import TemplesTab from './tabs/TemplesTab'
import DonationsTab from './tabs/DonationsTab'
import UsersTab from './tabs/UsersTab'
import ThemeTab from './tabs/ThemeTab'

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
      case 'theme':
        return <ThemeTab />
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

