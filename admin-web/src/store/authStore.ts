import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'MASTER_ADMIN' | 'TEMPLE_ADMIN'
  templeId?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

const store = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: (token: string, user: User) => {
        localStorage.setItem('authToken', token)
        set({ isAuthenticated: true, user, token })
      },
      logout: () => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken')
          localStorage.removeItem('auth-storage')
        }
        
        // Clear all cookies for security
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          document.cookie.split(';').forEach((cookie) => {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            // Clear cookie by setting it to expire in the past
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          })
        }
        
        set({ isAuthenticated: false, user: null, token: null })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, check if token exists in localStorage
        // If not, clear the authenticated state to prevent redirect loops
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken')
          if (!token && state?.isAuthenticated) {
            state.isAuthenticated = false
            state.user = null
            state.token = null
          }
        }
      },
    }
  )
)

// Set up event listener for logout events from API interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    store.getState().logout()
  })
}

export const useAuthStore = store

