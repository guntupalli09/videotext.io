/**
 * useIdleDetection — Fires a callback when the user has been idle for
 * `timeoutMs` milliseconds. Resets on any mouse movement, keypress, scroll,
 * or touch event.
 */

import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'] as const

export function useIdleDetection(timeoutMs: number, onIdle: () => void, enabled = true): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current)
      firedRef.current = false
      timerRef.current = setTimeout(() => {
        if (!firedRef.current) {
          firedRef.current = true
          onIdle()
        }
      }, timeoutMs)
    }

    // Start immediately
    reset()

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, reset, { passive: true })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, reset)
      }
    }
  }, [timeoutMs, onIdle, enabled])
}
