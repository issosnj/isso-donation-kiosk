'use client'

import { useEffect } from 'react'

export default function PermissionsPolicy() {
  useEffect(() => {
    // Add Permissions Policy meta tag to allow unload event
    // This suppresses warnings from third-party libraries (e.g., recharts)
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Permissions-Policy'
    meta.content = 'unload=(self)'
    
    // Check if it already exists
    const existing = document.querySelector('meta[http-equiv="Permissions-Policy"]')
    if (!existing) {
      document.head.appendChild(meta)
    }
  }, [])

  return null
}

