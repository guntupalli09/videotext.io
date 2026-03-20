import { useState, useEffect } from 'react'
import { isLoggedIn } from '../lib/auth'

/**
 * Provides reactive auth state for free tools.
 * Updates whenever the user logs in or logs out (via custom DOM events).
 */
export function useFreeToolGate() {
  const [authed, setAuthed] = useState(() => {
    try { return isLoggedIn() } catch { return false }
  })

  useEffect(() => {
    const update = () => {
      try { setAuthed(isLoggedIn()) } catch { /* ignore */ }
    }
    window.addEventListener('videotext:plan-updated', update)
    window.addEventListener('videotext:logout', update)
    return () => {
      window.removeEventListener('videotext:plan-updated', update)
      window.removeEventListener('videotext:logout', update)
    }
  }, [])

  return { authed }
}
