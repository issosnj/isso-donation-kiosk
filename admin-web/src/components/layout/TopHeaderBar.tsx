'use client'

import { useEffect, useRef, useState } from 'react'
import { QUICK_ACTIONS } from '@/lib/masterNavigation'
import LivePulse from '@/components/ops-dashboard/LivePulse'

interface TopHeaderBarProps {
  user: { name: string; email: string; role: string }
  onOpenCommandPalette: () => void
  onNavigate: (tab: string) => void
  onScrollToAlerts?: () => void
  alertCount?: number
  platformStatus?: 'operational' | 'degraded' | 'outage'
}

export default function TopHeaderBar({
  user,
  onOpenCommandPalette,
  onNavigate,
  onScrollToAlerts,
  alertCount = 0,
  platformStatus = 'operational',
}: TopHeaderBarProps) {
  const [quickOpen, setQuickOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const quickRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenCommandPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenCommandPalette])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (quickRef.current && !quickRef.current.contains(t)) setQuickOpen(false)
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const statusLabel = {
    operational: { text: 'All systems operational', color: 'text-emerald-700 bg-emerald-50' },
    degraded: { text: 'Degraded performance', color: 'text-amber-700 bg-amber-50' },
    outage: { text: 'Service disruption', color: 'text-red-700 bg-red-50' },
  }[platformStatus]

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.soon) return
    if (action.scrollTo === 'alerts') {
      onNavigate('overview')
      onScrollToAlerts?.()
    } else if (action.tab) {
      onNavigate(action.tab)
    }
    setQuickOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200/80 shrink-0">
      <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14 min-w-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex-1 min-w-0 max-w-md flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50/90 border border-gray-200/60 text-sm text-gray-500 hover:border-[#C084FC]/50 hover:bg-white transition-all"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="truncate hidden xs:inline">Search platform…</span>
          <span className="truncate sm:hidden">Search…</span>
          <kbd className="ml-auto hidden sm:inline text-[10px] font-medium text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shrink-0">
            ⌘K
          </kbd>
        </button>

        <span
          className={`hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusLabel.color}`}
        >
          <LivePulse />
          {statusLabel.text}
        </span>

        <div ref={quickRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setQuickOpen((o) => !o)}
            className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#A855F7] hover:shadow-lg hover:shadow-violet-200/50 transition-all whitespace-nowrap"
          >
            <span className="hidden sm:inline">Quick actions</span>
            <span className="sm:hidden">Actions</span>
          </button>
          {quickOpen && (
            <div className="absolute right-0 mt-2 w-56 dashboard-card shadow-xl py-1 z-50 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.soon}
                  onClick={() => handleQuickAction(action)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 disabled:text-gray-300 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                >
                  <span>{action.label}</span>
                  {action.soon && (
                    <span className="text-[9px] font-bold uppercase text-gray-400 shrink-0">Coming soon</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={notifRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o)
              setProfileOpen(false)
            }}
            className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 dashboard-card shadow-xl p-4 z-50">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500 mt-2">
                {alertCount > 0
                  ? `${alertCount} active alert${alertCount !== 1 ? 's' : ''} on the dashboard.`
                  : 'No active alerts.'}
              </p>
              {alertCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('overview')
                    onScrollToAlerts?.()
                    setNotifOpen(false)
                  }}
                  className="mt-3 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
                >
                  View alert center →
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center text-white text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-800 max-w-[100px] truncate">
              {user.name}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 dashboard-card shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-[10px] text-[#7C3AED] font-medium mt-1">{user.role.replace(/_/g, ' ')}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Account settings
                <span className="ml-2 text-[9px] text-gray-400 uppercase">Coming soon</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
