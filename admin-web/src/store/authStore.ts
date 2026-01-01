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
        localStorage.removeItem('authToken')
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

