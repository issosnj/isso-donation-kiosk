'use client'

import { useState } from 'react'
import { LogoutIcon } from '../Icons'
import { NavItemIcon } from '@/lib/enterpriseNavIcons'
import { MASTER_NAV_GROUPS, TEMPLE_NAV_ITEMS } from '@/lib/masterNavigation'

interface EnterpriseSidebarProps {
  user: { name: string; role: string }
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function isNavItemActive(activeTab: string, itemTab: string | undefined, itemId: string): boolean {
  if (!itemTab || activeTab !== itemTab) return false
  if (itemTab === 'overview') return itemId === 'overview'
  return itemId === itemTab
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

  const sidebarClass = [
    'enterprise-sidebar',
    'fixed left-0 top-0 z-40 flex h-screen flex-col',
    'border-r border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-xl',
    collapsed ? 'is-collapsed' : '',
  ].join(' ')

  const renderNavItem = (item: (typeof MASTER_NAV_GROUPS)[0]['items'][0]) => {
    const tab = item.tab
    const isActive = isNavItemActive(activeTab, tab, item.id)

    return (
      <li key={item.id}>
        <button
          type="button"
          disabled={item.soon}
          onClick={() => tab && !item.soon && setActiveTab(tab)}
          title={item.label}
          aria-current={isActive ? 'page' : undefined}
          className={[
            'enterprise-nav-item',
            isActive ? 'is-active' : '',
            item.soon ? 'is-disabled' : '',
            collapsed ? 'is-collapsed-item' : '',
          ].join(' ')}
        >
          <span className="enterprise-nav-icon shrink-0" aria-hidden>
            <NavItemIcon id={item.id} />
          </span>
          {!collapsed && (
            <>
              <span className="truncate flex-1 text-left">{item.label}</span>
              {item.soon && (
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-400">
                  Soon
                </span>
              )}
            </>
          )}
        </button>
      </li>
    )
  }

  return (
    <aside className={sidebarClass} data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="enterprise-sidebar-header shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] via-[#9333EA] to-[#A855F7] shadow-md shadow-violet-200/50">
            <span className="text-base font-bold text-white">I</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-gray-900">ISSO Platform</h1>
              <p className="text-[10px] font-medium text-gray-500">Operations Center</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="mt-0.5 text-[10px] font-medium text-violet-600">
              {isMasterAdmin ? 'Super Admin' : 'Temple Admin'}
            </p>
          </div>
        )}
      </div>

      <nav className="enterprise-sidebar-nav custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-2 py-2">
          {isMasterAdmin
            ? MASTER_NAV_GROUPS.map((group) => {
                const isOpen = collapsed || expandedGroups[group.id]
                return (
                  <div key={group.id} className="mb-1">
                    {!collapsed && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={expandedGroups[group.id]}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600"
                      >
                        <span>{group.label}</span>
                        <svg
                          className={`h-3 w-3 shrink-0 transition-transform duration-200 ease-out ${
                            expandedGroups[group.id] ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                    <div
                      className="nav-collapse-panel"
                      data-open={isOpen ? 'true' : 'false'}
                      aria-hidden={!isOpen}
                    >
                      <div className="nav-collapse-inner">
                        <ul className="space-y-0.5 py-0.5">{group.items.map(renderNavItem)}</ul>
                      </div>
                    </div>
                  </div>
                )
              })
            : TEMPLE_NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.tab
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.tab && setActiveTab(item.tab)}
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'enterprise-nav-item mb-0.5',
                      isActive ? 'is-active' : '',
                      collapsed ? 'is-collapsed-item' : '',
                    ].join(' ')}
                  >
                    {!collapsed && item.label}
                  </button>
                )
              })}
        </div>
      </nav>

      <div className={`enterprise-sidebar-footer shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-1.5 w-full rounded-lg py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 ${
            collapsed ? 'px-0' : ''
          }`}
        >
          <LogoutIcon />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
