/**
 * Session storage for the extension.
 *
 * The token is the VideoText web session's own JWT, handed over by
 * /extension-auth. It lives in chrome.storage.local, which is per-profile and
 * not readable by web pages or other extensions. We never store a password, and
 * we never mint a credential of our own.
 *
 * Expiry is read from the JWT's own `exp` claim — decoded, not verified. The
 * server verifies the signature on every request; the local check only avoids
 * showing a signed-in UI for a token that is already dead.
 */
import { STORAGE_KEYS } from './config.js'

export interface StoredSession {
  token: string
  plan: string
  email: string
}

function decodeJwtExpiry(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
    const claims = JSON.parse(json) as { exp?: number }
    return typeof claims.exp === 'number' ? claims.exp : null
  } catch {
    return null
  }
}

/** True when the token carries an `exp` claim that has already passed. */
export function isExpired(token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const exp = decodeJwtExpiry(token)
  return exp != null && exp <= nowSeconds
}

/** The stored session, or null when signed out or the token has expired (expired tokens are cleared). */
export async function getSession(): Promise<StoredSession | null> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.plan,
    STORAGE_KEYS.email,
  ])
  const token = stored[STORAGE_KEYS.authToken] as string | undefined
  if (!token) return null
  if (isExpired(token)) {
    await clearSession()
    return null
  }
  return {
    token,
    plan: (stored[STORAGE_KEYS.plan] as string) || 'free',
    email: (stored[STORAGE_KEYS.email] as string) || '',
  }
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.plan,
    STORAGE_KEYS.email,
  ])
}

/** Persist plan/email refreshed from GET /api/usage/current so the popup header stays accurate. */
export async function updateSessionDetails(plan: string, email?: string): Promise<void> {
  const patch: Record<string, string> = { [STORAGE_KEYS.plan]: plan }
  if (email) patch[STORAGE_KEYS.email] = email
  await chrome.storage.local.set(patch)
}

/** A job the popup should resume rendering when reopened. */
export interface ActiveJob {
  jobId: string
  jobToken?: string
  fileName: string
  language: string
  startedAt: number
}

export async function getActiveJob(): Promise<ActiveJob | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.activeJob)
  return (stored[STORAGE_KEYS.activeJob] as ActiveJob | undefined) ?? null
}

export async function setActiveJob(job: ActiveJob): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.activeJob]: job })
}

export async function clearActiveJob(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.activeJob)
}
