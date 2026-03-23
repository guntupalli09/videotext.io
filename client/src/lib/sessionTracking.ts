/**
 * sessionTracking.ts — Session identity and lifecycle management.
 *
 * Session ID: UUID stored in sessionStorage (one per browser tab).
 * Session count: persisted in localStorage across sessions.
 * Used for feedback frequency control and funnel analytics.
 */

const SESSION_ID_KEY = 'vt:session_id'
const SESSION_COUNT_KEY = 'vt:session_count'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Returns (and lazily creates) a stable session ID for this browser tab. */
export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let id = sessionStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = generateId()
    sessionStorage.setItem(SESSION_ID_KEY, id)
    // Increment the lifetime session counter each time a new session starts
    if (typeof localStorage !== 'undefined') {
      const prev = parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10) || 0
      localStorage.setItem(SESSION_COUNT_KEY, String(prev + 1))
    }
  }
  return id
}

/** Total number of distinct sessions this user has had (rough estimate via localStorage). */
export function getLifetimeSessionCount(): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10) || 0
}

/** Returns true if this is the user's first session on this device. */
export function isFirstSession(): boolean {
  return getLifetimeSessionCount() <= 1
}
