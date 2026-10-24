'use client'

import OverviewTab from './tabs/OverviewTab'
import DonationsTab from './tabs/DonationsTab'
import DonorsTab from './tabs/DonorsTab'
import DevicesTab from './tabs/DevicesTab'
import DeviceDetailsTab from './tabs/DeviceDetailsTab'
import CategoriesTab from './tabs/CategoriesTab'
import StripeTab from './tabs/StripeTab'
import ReceiptTab from './tabs/ReceiptTab'

interface TempleDashboardProps {
  activeTab: string
  templeId: string
  deviceId?: string
}

export default function TempleDashboard({ activeTab, templeId, deviceId }: TempleDashboardProps) {
  const renderTab = () => {
    // If deviceId is provided, show device details
    if (deviceId && activeTab === 'devices') {
      return (
        <DeviceDetailsTab 
          deviceId={deviceId} 
          onBack={() => {
            // Remove deviceId from URL and ensure tab is set to devices
            const url = new URL(window.location.href)
            url.searchParams.delete('deviceId')
            url.searchParams.set('tab', 'devices')
            window.history.pushState({}, '', url.toString())
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
      case 'stripe':
        return <StripeTab templeId={templeId} />
      case 'receipts':
        return <ReceiptTab templeId={templeId} isMasterAdmin={false} />
      default:
        return <OverviewTab templeId={templeId} />
    }
  }

  return <div className="min-w-0 max-w-full">{renderTab()}</div>
}

