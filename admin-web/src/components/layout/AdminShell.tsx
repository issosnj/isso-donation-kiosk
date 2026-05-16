'use client'

import { useState, type ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'

interface AdminShellProps {
  user: { name: string; role: string }
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  children: ReactNode
  className?: string
}

/** Temple-admin layout shell: sidebar + responsive main column (no viewport overflow). */
export default function AdminShell({
  user,
  activeTab,
  onTabChange,
  onLogout,
  children,
  className = 'bg-[var(--background)]',
}: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleTabChange = (tab: string) => {
    setMobileNavOpen(false)
    onTabChange(tab)
  }

  return (
    <div className={`min-h-screen flex overflow-x-hidden ${className}`}>
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={onLogout}
        isMobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="hidden lg:block w-64 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 min-h-screen flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-white/95 backdrop-blur border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">ISSO Kiosk</p>
            <p className="text-xs text-gray-500 truncate">{user.name}</p>
          </div>
        </header>
        <div className="flex-1 min-w-0 max-w-full">{children}</div>
      </div>
    </div>
  )
}
