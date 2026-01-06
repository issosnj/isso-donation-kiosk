'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useInactivity } from '@/hooks/useInactivity'
import { useAuthStore } from '@/store/authStore'

/**
 * Component that handles user inactivity and automatically logs out
 * Clears all authentication data (localStorage and cookies) for security
 */
export default function InactivityHandler() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()

  // Clear all authentication data including cookies
  const handleInactivity = () => {
    if (!isAuthenticated) return

    // Logout from auth store (this clears localStorage and cookies)
    logout()

    // Redirect to login page
    router.push('/')
  }

  // Monitor inactivity - 15 minutes of inactivity triggers logout
  useInactivity({
    timeout: 15 * 60 * 1000, // 15 minutes in milliseconds
    onInactive: handleInactivity,
    enabled: isAuthenticated, // Only monitor when authenticated
  })

  // Also handle visibility change (tab/window focus)
  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibilityChange = () => {
      // If tab becomes visible after being hidden for a long time, check if we should logout
      // This is handled by the inactivity timer, but we can add additional checks here if needed
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])

  return null // This component doesn't render anything
}

