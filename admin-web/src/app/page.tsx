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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">I</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            ISSO Donation Kiosk
          </h1>
          <p className="mt-2 text-gray-600 font-medium">Admin Portal</p>
          <p className="mt-1 text-sm text-gray-500">
            Master Admin & Temple Admin Login
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

