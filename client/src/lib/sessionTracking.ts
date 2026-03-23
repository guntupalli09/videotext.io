/**
 * sessionTracking.ts — Session identity and lifecycle management.
 *
 * Session ID: UUID in sessionStorage (per tab). Persists on refresh.
 * Grace period: if user reopens within 30 min, treat as same session
 *   (no counter increment, same session ID restored).
 * Session count: persists in localStorage across sessions.
 */

const SESSION_ID_KEY    = 'vt:session_id'
const SESSION_COUNT_KEY = 'vt:session_count'
const LAST_SESSION_KEY  = 'vt:last_session_id'    // localStorage: most recent session ID
const LAST_ACTIVE_KEY   = 'vt:last_active'        // localStorage: epoch ms of last activity
const IS_NEW_KEY        = 'vt:session_is_new'     // sessionStorage: '1' if truly new this tab

const GRACE_PERIOD_MS = 30 * 60 * 1000  // 30 minutes

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Returns a stable session ID for this tab.
 *
 * - Refresh: sessionStorage survives → same ID, no counter bump.
 * - Tab close + reopen within 30 min: grace period restores last session ID.
 * - New session (>30 min gap or first ever): new UUID, counter incremented.
 *
 * Call getSessionId() on app init. Subsequent calls return the same value.
 */
export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr'

  // Already initialised for this tab
  let id = sessionStorage.getItem(SESSION_ID_KEY)
  if (id) {
    touchLastActive(id)
    return id
  }

  // Try grace-period resume (tab close + reopen within 30 min)
  try {
    const lastId     = localStorage.getItem(LAST_SESSION_KEY)
    const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0', 10)
    if (lastId && lastActive > 0 && Date.now() - lastActive < GRACE_PERIOD_MS) {
      id = lastId
      sessionStorage.setItem(SESSION_ID_KEY, id)
      // sessionStorage feedback flags are gone (new tab), but localStorage flags
      // remain — frequency limits are still respected.
      touchLastActive(id)
      return id
    }
  } catch { /* ok */ }

  // Genuinely new session
  id = generateId()
  sessionStorage.setItem(SESSION_ID_KEY, id)
  sessionStorage.setItem(IS_NEW_KEY, '1')

  try {
    const prev = parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10) || 0
    localStorage.setItem(SESSION_COUNT_KEY, String(prev + 1))
  } catch { /* ok */ }

  touchLastActive(id)
  return id
}

/** True only on the first call within a new tab that started a fresh session. */
export function isNewSession(): boolean {
  try { return sessionStorage.getItem(IS_NEW_KEY) === '1' } catch { return false }
}

/** Clear the new-session flag after callers have acted on it. */
export function clearNewSessionFlag(): void {
  try { sessionStorage.removeItem(IS_NEW_KEY) } catch { /* ok */ }
}

/** Total number of distinct sessions this user has had (rough estimate). */
export function getLifetimeSessionCount(): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10) || 0
}

/** True if this is the user's first session on this device. */
export function isFirstSession(): boolean {
  return getLifetimeSessionCount() <= 1
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function touchLastActive(id: string): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
    localStorage.setItem(LAST_SESSION_KEY, id)
  } catch { /* ok */ }
}
