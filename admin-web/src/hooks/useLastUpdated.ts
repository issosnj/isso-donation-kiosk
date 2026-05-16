'use client'

import { useEffect, useState } from 'react'

function formatLastUpdatedTime(): string {
  return new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function useLastUpdated(intervalMs = 60_000): string {
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    setLastUpdated(formatLastUpdatedTime())
    const id = setInterval(() => setLastUpdated(formatLastUpdatedTime()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return lastUpdated
}
