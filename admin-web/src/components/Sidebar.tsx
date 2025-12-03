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
    <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ISSO Kiosk</h1>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-700/50">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isMasterAdmin ? 'Master Admin' : 'Temple Admin'}
          </p>
        </div>
      </div>
      
      <nav className="mt-4 px-3">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.id] || OverviewIcon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 mb-1 flex items-center space-x-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon />
              <span className="font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-slate-700/50">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg text-white font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg shadow-red-500/20"
        >
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

