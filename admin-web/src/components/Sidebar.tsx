'use client'

import { OverviewIcon, TemplesIcon, DonationsIcon, UsersIcon, DevicesIcon, CategoriesIcon, SquareIcon, LogoutIcon } from './Icons'

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
  square: SquareIcon,
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const isMasterAdmin = user.role === 'MASTER_ADMIN'

  const templeTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'donations', label: 'Donations' },
    { id: 'devices', label: 'Devices' },
    { id: 'categories', label: 'Categories' },
    { id: 'square', label: 'Square' },
  ]

  const masterTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'temples', label: 'Temples' },
    { id: 'donations', label: 'All Donations' },
    { id: 'users', label: 'Users' },
  ]

  const tabs = isMasterAdmin ? masterTabs : templeTabs

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">ISSO Kiosk</h1>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {isMasterAdmin ? 'Master Admin' : 'Temple Admin'}
          </p>
        </div>
      </div>
      
      <nav className="mt-2 px-3 py-2">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.id] || OverviewIcon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 mb-1 flex items-center space-x-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-700 font-medium flex items-center justify-center space-x-2 transition-all duration-150"
        >
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

