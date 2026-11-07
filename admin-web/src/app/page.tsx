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
            <h1 className="mt-4 text-4xl font-bold tracking-wide text-orange-600">ISSO Kiosk</h1>
            <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-gray-500">
              Sign in to manage donations, kiosks, and receipts.
            </p>
            <LoginForm />
          </div>
        </div>
        <div className="relative lg:h-full">
          <img
            src="/swaminarayan-temple.jpg"
            alt="Shree Swaminarayan Mandir, Ahmedabad (Kalupur)"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/80 via-orange-700/72 to-orange-950/80" />
          <div className="relative flex min-h-[360px] flex-col items-center justify-center px-8 py-12 text-center text-white lg:h-full lg:min-h-0">
            <p className="text-4xl font-semibold tracking-[0.18em]">ISSO</p>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/85">
              Donor CRM for Shree Swaminarayan ISSO Temples.
              <br />
              Under NarNarayan Dev Gadi, Kalupur, Ahmedabad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

