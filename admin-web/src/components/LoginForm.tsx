'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const fieldClass =
  'block h-14 w-full rounded-full border border-gray-200 bg-white pl-12 pr-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/15'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      login(response.data.access_token, response.data.user)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      console.error('Error code:', err.code)
      console.error('Error message:', err.message)
      console.error('Error response:', err.response)
      console.error('Error request:', err.request)
      console.error('Error config:', err.config)
      
      let errorMessage = 'Login failed. Please check your credentials and try again.'
      
      // Handle network/CORS errors
      if (!err.response && err.request) {
        if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
          errorMessage = 'Network error: Unable to connect to the server. This may be a CORS issue. Please check your connection and try again.'
        } else if (err.code === 'ERR_FAILED') {
          errorMessage = 'Connection failed: The request was blocked. This may be a CORS configuration issue.'
        } else {
          errorMessage = `Network error: ${err.message || 'Unable to reach the server'}`
        }
      }
      // Handle HTTP errors
      else if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.'
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.'
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message
        } else {
          errorMessage = `Server error (${err.response.status}). Please try again.`
        }
      }
      // Handle other errors
      else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-5 text-left">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="relative">
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <UserIcon />
        </span>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={fieldClass}
          style={{ color: '#111827', backgroundColor: '#ffffff', WebkitTextFillColor: '#111827' }}
        />
      </div>
      <div className="relative">
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <LockIcon />
        </span>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className={`${fieldClass} pr-14`}
          style={{ color: '#111827', backgroundColor: '#ffffff', WebkitTextFillColor: '#111827' }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-gray-700"
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex h-14 w-full items-center justify-center rounded-full bg-orange-600 text-base font-semibold tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(234,88,12,0.35)] transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'SIGNING IN...' : 'SIGN IN'}
      </button>
    </form>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5.5 19.25c1.2-2.7 3.55-4 6.5-4s5.3 1.3 6.5 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2.5 12S6.5 6.5 12 6.5 21.5 12 21.5 12 17.5 17.5 12 17.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5.5 19 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M9.2 8.2A8.7 8.7 0 0 1 12 7.5c5.5 0 9.5 5.5 9.5 5.5a16 16 0 0 1-3.2 3.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M6.1 7.8C3.8 9.4 2.5 12 2.5 12S6.5 17.5 12 17.5c1.1 0 2.1-.2 3.1-.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

