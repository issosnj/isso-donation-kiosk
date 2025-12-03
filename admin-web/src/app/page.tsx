'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import { useAuthStore } from '@/store/authStore'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
              <span className="text-white font-bold text-3xl">I</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ISSO Kiosk
          </h1>
          <p className="text-gray-600 font-medium">Admin Portal</p>
          <p className="mt-1 text-sm text-gray-500">
            Master Admin & Temple Admin Login
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

