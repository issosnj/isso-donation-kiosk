import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// Log the API URL to help debug (always log in browser)
if (typeof window !== 'undefined') {
  console.log('[API] Base URL:', baseURL)
  console.log('[API] Environment:', process.env.NODE_ENV)
}

const api = axios.create({
  baseURL,
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
      localStorage.removeItem('authToken')
      // Don't redirect on login page
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api

