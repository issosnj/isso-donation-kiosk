'use client'

interface SidebarProps {
  user: {
    name: string
    role: string
  }
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const isMasterAdmin = user.role === 'MASTER_ADMIN'

  const templeTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'donations', label: 'Donations', icon: '💰' },
    { id: 'devices', label: 'Devices', icon: '📱' },
    { id: 'categories', label: 'Categories', icon: '📁' },
    { id: 'square', label: 'Square', icon: '💳' },
  ]

  const masterTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'temples', label: 'Temples', icon: '🏛️' },
    { id: 'donations', label: 'All Donations', icon: '💰' },
    { id: 'users', label: 'Users', icon: '👥' },
  ]

  const tabs = isMasterAdmin ? masterTabs : templeTabs

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 text-white">
      <div className="p-6">
        <h1 className="text-xl font-bold">ISSO Kiosk</h1>
        <p className="text-sm text-gray-400 mt-1">{user.name}</p>
        <p className="text-xs text-gray-500 mt-1">{user.role}</p>
      </div>
      <nav className="mt-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-6 py-3 flex items-center space-x-3 hover:bg-gray-700 ${
              activeTab === tab.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 w-full p-6">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

