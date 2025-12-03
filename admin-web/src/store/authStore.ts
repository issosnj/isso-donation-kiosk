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

export const useAuthStore = create<AuthState>()(
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
    }
  )
)

