'use client'

import { OverviewIcon, TemplesIcon, DonationsIcon, UsersIcon, DevicesIcon, CategoriesIcon, StripeIcon, LogoutIcon, ThemeIcon, ReceiptIcon, ReligiousEventsIcon } from './Icons'

interface SidebarProps {
  user: {
    name: string
    role: string
  }
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
}

const iconMap: Record<string, () => JSX.Element> = {
  overview: OverviewIcon,
  temples: TemplesIcon,
  donations: DonationsIcon,
  users: UsersIcon,
  devices: DevicesIcon,
  categories: CategoriesIcon,
  stripe: StripeIcon,
  theme: ThemeIcon,
  receipts: ReceiptIcon,
  'religious-events': ReligiousEventsIcon,
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const isMasterAdmin = user.role === 'MASTER_ADMIN'

  const templeTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'donations', label: 'Donations' },
    { id: 'donors', label: 'Donors' },
    { id: 'devices', label: 'Devices' },
    { id: 'categories', label: 'Categories' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'receipts', label: 'Receipts' },
  ]

  const masterTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'temples', label: 'Temples' },
    { id: 'donations', label: 'All Donations' },
    { id: 'donors', label: 'All Donors' },
    { id: 'users', label: 'Users' },
    { id: 'religious-events', label: 'Observances' },
    { id: 'theme', label: 'Kiosk Theme' },
    { id: 'receipts', label: 'Receipts' },
  ]

  const tabs = isMasterAdmin ? masterTabs : templeTabs

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">ISSO Kiosk</h1>
            <p className="text-xs text-gray-500">Donor CRM</p>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isMasterAdmin ? 'Master Admin' : 'Temple Admin'}
          </p>
        </div>
      </div>
      
      <nav className="mt-1 px-2 py-3">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.id] || OverviewIcon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 mb-0.5 flex items-center space-x-3 rounded-md transition-all duration-150 ${
                isActive
                  ? 'bg-purple-50 text-purple-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon />
              <span className="text-sm">{tab.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 font-medium flex items-center justify-center space-x-2 transition-all duration-150 text-sm"
        >
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

