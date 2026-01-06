import { useEffect, useRef, useCallback } from 'react'

interface UseInactivityOptions {
  timeout: number // in milliseconds
  onInactive: () => void
  enabled?: boolean
}

/**
 * Hook to detect user inactivity and trigger a callback after a period of inactivity
 * Tracks mouse movements, clicks, keyboard input, scroll, and touch events
 */
export function useInactivity({
  timeout,
  onInactive,
  enabled = true,
}: UseInactivityOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    if (!enabled) return

    lastActivityRef.current = Date.now()

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      // Only trigger if still inactive after timeout
      if (timeSinceLastActivity >= timeout) {
        onInactive()
      }
    }, timeout)
  }, [timeout, onInactive, enabled])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    // Initial timer
    resetTimer()

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ]

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, true)
    })

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer, true)
      })
    }
  }, [resetTimer, enabled])
}

