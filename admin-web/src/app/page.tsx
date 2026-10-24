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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f7fb] px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute -left-28 -top-32 h-80 w-80 rounded-full bg-orange-600" aria-hidden />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-orange-500" aria-hidden />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(154,52,18,0.14)] lg:min-h-[760px] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-12 sm:px-14 lg:px-16">
          <div className="mx-auto w-full max-w-md text-center">
            <p className="text-sm font-semibold tracking-[0.22em] text-gray-400">WELCOME TO</p>
            <div className="mt-4 flex items-center justify-center gap-3 text-orange-600">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold text-white">
                I
              </span>
              <h1 className="text-4xl font-bold tracking-wide">ISSO Kiosk</h1>
            </div>
            <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-gray-500">
              Sign in to manage donations, kiosks, and receipts.
            </p>
            <LoginForm />
          </div>
        </div>
        <div className="relative min-h-[300px] lg:min-h-0">
          <img
            src="/swaminarayan-temple.jpg"
            alt="Shree Swaminarayan Mandir, Ahmedabad (Kalupur)"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/80 via-orange-700/72 to-orange-950/80" />
          <div className="relative flex h-full flex-col items-center justify-center px-8 py-12 text-center text-white">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-4xl font-bold ring-1 ring-white/40">
              I
            </span>
            <p className="mt-6 text-4xl font-semibold tracking-[0.18em]">ISSO</p>
            <p className="mt-4 max-w-sm text-base leading-7 text-white/85">
              Donor CRM for Shree Swaminarayan temples. Kalupur, Ahmedabad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

