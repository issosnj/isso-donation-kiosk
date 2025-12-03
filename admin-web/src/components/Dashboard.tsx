'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const { logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')

  if (!user) {
    return null
  }

  const isMasterAdmin = user.role === 'MASTER_ADMIN'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={logout}
      />
      <div className="ml-64 min-h-screen">
        <div className="p-8">
          {isMasterAdmin ? (
            <MasterDashboard activeTab={activeTab} />
          ) : (
            <TempleDashboard activeTab={activeTab} templeId={user.templeId!} />
          )}
        </div>
      </div>
    </div>
  )
}

