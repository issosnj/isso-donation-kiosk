import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export { baseURL as apiBaseURL }

// Log the API URL to help debug (always log in browser)
if (typeof window !== 'undefined') {
  console.log('[API] Base URL:', baseURL)
  console.log('[API] Environment:', process.env.NODE_ENV)
}

const api = axios.create({
  baseURL,
  timeout: 30000, // 30s - prevents infinite loading when API is unreachable
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors and log network issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information for debugging
    if (!error.response) {
      console.error('[API] Network error - no response received')
      console.error('[API] Error code:', error.code)
      console.error('[API] Error message:', error.message)
      console.error('[API] Request URL:', error.config?.url)
      console.error('[API] Base URL:', baseURL)
    }
    
    if (error.response?.status === 401) {
      // Only handle 401 if we're not already on the login page
      // This prevents redirect loops and unnecessary redirects
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        // Clear auth token from localStorage
        localStorage.removeItem('authToken')
        // Clear persisted auth store state to prevent redirect loop
        localStorage.removeItem('auth-storage')
        
        // Clear all cookies for security
        if (typeof document !== 'undefined') {
          document.cookie.split(';').forEach((cookie) => {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            // Clear cookie by setting it to expire in the past
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          })
        }
        
        // Dispatch custom event to notify auth store
        window.dispatchEvent(new CustomEvent('auth:logout'))
        
        // Use a small delay to ensure state is cleared before redirect
        // This prevents race conditions with auth state updates
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

export default api

