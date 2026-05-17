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
    <header className="master-admin-topbar">
      <div className="mx-auto flex h-full w-full max-w-[1600px] min-w-0 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
          className="flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-gray-200/60 bg-gray-50/90 px-3 text-sm text-gray-500 transition-colors hover:border-violet-300/60 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 lg:max-w-sm xl:max-w-md"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden truncate sm:inline">
            Search temples, donors, donations, receipts…
          </span>
          <span className="truncate sm:hidden">Search…</span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline">
            ⌘K
          </kbd>
        </button>

        <span
          className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold lg:inline-flex ${statusLabel.color}`}
        >
          <LivePulse />
          <span className="max-w-[11rem] truncate">{statusLabel.text}</span>
        </span>

        <div ref={quickRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setQuickOpen((o) => !o)}
            className="inline-flex h-9 items-center whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#A855F7] px-2.5 text-xs font-semibold text-white transition-shadow hover:shadow-md hover:shadow-violet-200/50 sm:px-3 sm:text-sm"
          >
            <span className="hidden sm:inline">Quick actions</span>
            <span className="sm:hidden">Actions</span>
          </button>
          {quickOpen && (
            <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-[var(--card-radius)] border border-gray-200/60 bg-white py-1 shadow-xl custom-scrollbar">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.soon}
                  onClick={() => handleQuickAction(action)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <span>{action.label}</span>
                  {action.soon && (
                    <span className="shrink-0 text-[9px] font-bold uppercase text-gray-400">Soon</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div ref={notifRef} className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o)
              setProfileOpen(false)
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {alertCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[var(--card-radius)] border border-gray-200/60 bg-white p-4 shadow-xl">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="mt-2 text-xs text-gray-500">
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
                  className="mt-3 text-xs font-semibold text-violet-700 hover:text-violet-800"
                >
                  View alert center →
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o)
              setNotifOpen(false)
            }}
            className="flex h-9 max-w-[10rem] items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden min-w-0 truncate text-sm font-medium text-gray-800 md:block">
              {user.name}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[var(--card-radius)] border border-gray-200/60 bg-white py-2 shadow-xl">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
                <p className="mt-1 text-[10px] font-medium text-violet-600">
                  {user.role.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
              >
                Account settings
                <span className="ml-2 text-[9px] uppercase text-gray-400">Coming soon</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
