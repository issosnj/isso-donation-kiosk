'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  // Wait for auth state to be ready before checking
  useEffect(() => {
    // Small delay to ensure auth store is hydrated
    const timer = setTimeout(() => {
      setIsChecking(false)
      if (!isAuthenticated) {
        router.push('/')
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isAuthenticated, router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <Dashboard user={user} />
}

