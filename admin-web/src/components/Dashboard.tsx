'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Sidebar from './Sidebar'
import TempleDashboard from './TempleDashboard'
import MasterDashboard from './MasterDashboard'

interface DashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: 'MASTER_ADMIN' | 'TEMPLE_ADMIN'
    templeId?: string
  } | null
}

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useAuthStore()
  
  // Get tab and deviceId from URL params
  const tabFromUrl = searchParams.get('tab') || 'overview'
  const deviceIdFromUrl = searchParams.get('deviceId')
  
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [squareMessage, setSquareMessage] = useState<{ type: 'success' | 'error'; message: string; templeId?: string } | null>(null)
  
  // Update activeTab when URL changes (including deviceId changes)
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl, deviceIdFromUrl]) // Also react to deviceId changes
  
  // Handle tab changes while preserving deviceId if present
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Update URL while preserving deviceId if we're staying on devices tab
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', tab)
    // Only preserve deviceId if we're staying on devices tab
    if (tab !== 'devices') {
      urlParams.delete('deviceId')
    }
    const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
    router.push(newUrl)
  }

  // Handle Square connection callback
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const squareConnected = urlParams.get('squareConnected')
    const squareError = urlParams.get('squareError')
    const templeId = urlParams.get('templeId')

    if (squareConnected === 'true' && templeId) {
      setSquareMessage({ type: 'success', message: 'Square account connected successfully!', templeId })
      // Clean up URL
      urlParams.delete('squareConnected')
      urlParams.delete('templeId')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
      
      // Auto-navigate to temples tab and open the temple edit view
      if (user?.role === 'MASTER_ADMIN') {
        setActiveTab('temples')
        // Store templeId in sessionStorage so TemplesTab can open it
        sessionStorage.setItem('openTempleId', templeId)
      }
    } else if (squareError) {
      setSquareMessage({ type: 'error', message: decodeURIComponent(squareError) })
      // Clean up URL
      urlParams.delete('squareError')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
    }
  }, [router, user])

  if (!user) {
    return null
  }

  const isMasterAdmin = user.role === 'MASTER_ADMIN'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={logout}
      />
      <div className="ml-64 min-h-screen">
        <div className="p-8">
          {/* Square connection notification */}
          {squareMessage && (
            <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
              squareMessage.type === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                {squareMessage.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <p className={`font-medium ${
                  squareMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {squareMessage.message}
                </p>
              </div>
              <button
                onClick={() => setSquareMessage(null)}
                className={`ml-4 ${
                  squareMessage.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
        </div>
      </div>
    </div>
  )
}

