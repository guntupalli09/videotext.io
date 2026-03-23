/**
 * useFeedbackFrequency — Enforces feedback prompt frequency limits.
 *
 * Rules:
 * - Max 1 prompt per session (any type A/B/C)
 * - Max 2 prompts lifetime across first sessions (A/B/C only)
 * - PMF survey (D): one-time only, tracked independently
 * - Competitor (E): one-time only, tracked independently
 * - PMF + Competitor must not stack in the same session
 *
 * Uses localStorage for persistence across sessions.
 * Provides canShow() + markShown() for each trigger type.
 */

const KEYS = {
  SESSION_SHOWN: 'vt:fb:session_shown',     // '1' if any A/B/C prompt shown this session
  LIFETIME_COUNT: 'vt:fb:lifetime_count',   // numeric string
  TRIGGER_A: 'vt:fb:trigger_a',             // '1' if shown ever
  TRIGGER_B: 'vt:fb:trigger_b',             // '1' if shown ever
  TRIGGER_C: 'vt:fb:trigger_c',             // '1' if shown ever
  PMF_SHOWN: 'vt:fb:pmf_shown',             // '1' if shown ever
  COMPETITOR_SHOWN: 'vt:fb:competitor_shown', // '1' if shown ever
  PMF_SHOWN_THIS_SESSION: 'vt:fb:pmf_session', // '1' if PMF shown this session
} as const

function get(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function set(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* ok */ }
}
function getNum(key: string): number {
  return parseInt(get(key) ?? '0', 10) || 0
}

// ─── Session guard (sessionStorage so it resets on tab close) ────────────────
function isShownThisSession(): boolean {
  try { return sessionStorage.getItem(KEYS.SESSION_SHOWN) === '1' } catch { return false }
}
function markShownThisSession(): void {
  try { sessionStorage.setItem(KEYS.SESSION_SHOWN, '1') } catch { /* ok */ }
}
function isPMFShownThisSession(): boolean {
  try { return sessionStorage.getItem(KEYS.PMF_SHOWN_THIS_SESSION) === '1' } catch { return false }
}
function markPMFShownThisSession(): void {
  try { sessionStorage.setItem(KEYS.PMF_SHOWN_THIS_SESSION, '1') } catch { /* ok */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function canShowTriggerA(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_A) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

export function canShowTriggerB(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_B) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

export function canShowTriggerC(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_C) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  // 30% random sampling — evaluate once per session, cache result
  const SAMPLE_KEY = 'vt:fb:c_sampled'
  try {
    const cached = sessionStorage.getItem(SAMPLE_KEY)
    if (cached === '0') return false
    if (cached !== '1') {
      const sampled = Math.random() < 0.3
      sessionStorage.setItem(SAMPLE_KEY, sampled ? '1' : '0')
      if (!sampled) return false
    }
  } catch { /* ok */ }
  return true
}

export function canShowTriggerD(): boolean {
  if (get(KEYS.PMF_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false
  return true
}

export function canShowTriggerE(): boolean {
  if (get(KEYS.COMPETITOR_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false // Don't stack with PMF
  return true
}

export function markTriggerAShown(): void {
  markShownThisSession()
  set(KEYS.TRIGGER_A, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerBShown(): void {
  markShownThisSession()
  set(KEYS.TRIGGER_B, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerCShown(): void {
  markShownThisSession()
  set(KEYS.TRIGGER_C, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerDShown(): void {
  markPMFShownThisSession()
  set(KEYS.PMF_SHOWN, '1')
}

export function markTriggerEShown(): void {
  markPMFShownThisSession() // Prevents stacking competitor + pmf in same session
  set(KEYS.COMPETITOR_SHOWN, '1')
}

/** True if the user has exported at least once this session (for Trigger E gating). */
export function hasExportedThisSession(): boolean {
  try { return sessionStorage.getItem('vt:has_exported') === '1' } catch { return false }
}
export function markExportedThisSession(): void {
  try { sessionStorage.setItem('vt:has_exported', '1') } catch { /* ok */ }
}
