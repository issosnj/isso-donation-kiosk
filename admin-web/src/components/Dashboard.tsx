'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from './Sidebar'
import EnterpriseSidebar from './layout/EnterpriseSidebar'
import TopHeaderBar from './layout/TopHeaderBar'
import CommandPalette from './layout/CommandPalette'
import TempleDashboard from './TempleDashboard'
import MasterDashboard from './MasterDashboard'
import { useDevices } from '@/hooks/useDevices'
import { usePlatformAlerts } from '@/hooks/usePlatformAlerts'

interface DashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: 'MASTER_ADMIN' | 'TEMPLE_ADMIN'
    templeId?: string
  } | null
}

const MOBILE_BREAKPOINT = 1024

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout, isAuthenticated } = useAuthStore()

  const tabFromUrl = searchParams.get('tab') || 'overview'
  const deviceIdFromUrl = searchParams.get('deviceId')

  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<{
    type: 'success' | 'error'
    message: string
    templeId?: string
  } | null>(null)

  const isMasterAdmin = user?.role === 'MASTER_ADMIN'
  const { devices } = useDevices(undefined, { enabled: isMasterAdmin })
  const { alerts } = usePlatformAlerts(isMasterAdmin ? devices : [])

  useEffect(() => {
    const checkAuth = setTimeout(() => {
      const token = localStorage.getItem('authToken')
      if (!token && isAuthenticated) {
        logout()
        router.push('/')
      }
    }, 100)
    return () => clearTimeout(checkAuth)
  }, [isAuthenticated, logout, router])

  useEffect(() => {
    if (deviceIdFromUrl && tabFromUrl === 'devices') {
      router.replace(`/devices/status?id=${deviceIdFromUrl}`)
    }
  }, [deviceIdFromUrl, tabFromUrl, router])

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  useEffect(() => {
    if (tabFromUrl !== 'kiosk-behavior') return
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', 'overview')
    router.replace(`${window.location.pathname}?${urlParams.toString()}`)
    setActiveTab('overview')
  }, [tabFromUrl, router])

  useEffect(() => {
    if (!isMasterAdmin) return
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const apply = () => {
      if (mq.matches) setSidebarCollapsed(true)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [isMasterAdmin])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', tab)
    if (tab !== 'devices') urlParams.delete('deviceId')
    const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
    router.push(newUrl)
  }

  const scrollToAlerts = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('alert-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const stripeConnected = urlParams.get('stripeConnected')
    const squareConnected = urlParams.get('squareConnected')
    const stripeError = urlParams.get('stripeError')
    const squareError = urlParams.get('squareError')
    const templeId = urlParams.get('templeId')
    const connected = stripeConnected === 'true' || squareConnected === 'true'
    const error = stripeError || squareError

    if (connected && templeId) {
      setPaymentMessage({ type: 'success', message: 'Stripe account connected successfully!', templeId })
      urlParams.delete('stripeConnected')
      urlParams.delete('squareConnected')
      urlParams.delete('templeId')
      router.replace(window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : ''))
      if (user?.role === 'MASTER_ADMIN') {
        setActiveTab('temples')
        sessionStorage.setItem('openTempleId', templeId)
      }
    } else if (error) {
      setPaymentMessage({ type: 'error', message: decodeURIComponent(error) })
      urlParams.delete('stripeError')
      urlParams.delete('squareError')
      router.replace(window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : ''))
    }
  }, [router, user])

  if (!user) return null

  const platformStatus =
    devices.filter((d) => d.operationalStatus === 'offline').length > 2
      ? 'degraded'
      : alerts.some((a) => a.severity === 'critical')
        ? 'outage'
        : 'operational'

  const mainMargin = isMasterAdmin
    ? sidebarCollapsed
      ? 'ml-0 lg:ml-[72px]'
      : 'ml-0 lg:ml-64'
    : 'ml-64'

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {isMasterAdmin ? (
        <>
          <EnterpriseSidebar
            user={user}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={logout}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          />
          <CommandPalette
            open={commandOpen}
            onClose={() => setCommandOpen(false)}
            onNavigate={handleTabChange}
            onScrollTo={(target) => {
              if (target === 'alerts') scrollToAlerts()
            }}
          />
        </>
      ) : (
        <Sidebar user={user} activeTab={activeTab} setActiveTab={handleTabChange} onLogout={logout} />
      )}

      <div
        className={`${mainMargin} min-h-screen flex flex-col transition-[margin] duration-300 ease-out w-full min-w-0`}
      >
        {isMasterAdmin && (
          <TopHeaderBar
            user={user}
            onOpenCommandPalette={() => setCommandOpen(true)}
            onNavigate={handleTabChange}
            onScrollToAlerts={scrollToAlerts}
            alertCount={alerts.length}
            platformStatus={platformStatus}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full min-w-0 mx-auto">
          {paymentMessage && (
            <div
              className={`mb-4 p-4 rounded-xl border flex items-center justify-between gap-3 ${
                paymentMessage.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p
                className={`font-medium text-sm ${
                  paymentMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {paymentMessage.message}
              </p>
              <button
                type="button"
                onClick={() => setPaymentMessage(null)}
                className="text-gray-500 hover:text-gray-800 text-sm font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {isMasterAdmin ? (
            <MasterDashboard activeTab={activeTab} />
          ) : (
            <TempleDashboard
              activeTab={activeTab}
              templeId={user.templeId!}
              deviceId={deviceIdFromUrl || undefined}
            />
          )}
        </main>
      </div>
    </div>
  )
}
