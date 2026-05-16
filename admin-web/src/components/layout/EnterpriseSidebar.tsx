'use client'

import { useState } from 'react'
import { LogoutIcon } from '../Icons'
import { MASTER_NAV_GROUPS, TEMPLE_NAV_ITEMS } from '@/lib/masterNavigation'

interface EnterpriseSidebarProps {
  user: { name: string; role: string }
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function EnterpriseSidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  collapsed,
  onToggleCollapse,
}: EnterpriseSidebarProps) {
  const isMasterAdmin = user.role === 'MASTER_ADMIN'
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    operations: true,
    financial: false,
    system: false,
    platform: false,
  })

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const width = collapsed ? 'w-[72px]' : 'w-64'

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${width} z-40 flex flex-col bg-white/95 backdrop-blur-xl border-r border-gray-200/80 shadow-sm transition-all duration-300 ease-out`}
    >
      <div className={`p-4 border-b border-gray-100 ${collapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] via-[#9333EA] to-[#A855F7] flex items-center justify-center shadow-md shadow-violet-200/50 shrink-0">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">ISSO Platform</h1>
              <p className="text-[10px] text-gray-500 font-medium">Operations Center</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-violet-600 font-medium mt-0.5">
              {isMasterAdmin ? 'Super Admin' : 'Temple Admin'}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
        {isMasterAdmin
          ? MASTER_NAV_GROUPS.map((group) => (
              <div key={group.id} className="mb-2">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600"
                  >
                    {group.label}
                    <svg
                      className={`w-3 h-3 transition-transform ${expandedGroups[group.id] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                {(collapsed || expandedGroups[group.id]) && (
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const tab = item.tab
                      const isActive = tab ? activeTab === tab : false
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={item.soon}
                            onClick={() => tab && !item.soon && setActiveTab(tab)}
                            title={item.label}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                              isActive
                                ? 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 font-semibold shadow-sm'
                                : item.soon
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } ${collapsed ? 'justify-center px-2' : ''}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isActive ? 'bg-violet-500' : 'bg-transparent'
                              }`}
                            />
                            {!collapsed && (
                              <>
                                <span className="truncate flex-1 text-left">{item.label}</span>
                                {item.soon && (
                                  <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    Coming soon
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))
          : TEMPLE_NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.tab
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.tab && setActiveTab(item.tab)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 mb-0.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-violet-50 text-violet-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {!collapsed && item.label}
                </button>
              )
            })}
      </nav>

      <div className={`p-3 border-t border-gray-100 space-y-2 ${collapsed ? 'px-2' : ''}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={`w-full py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2 text-sm transition-colors ${collapsed ? 'px-0' : ''}`}
        >
          <LogoutIcon />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
