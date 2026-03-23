/**
 * useFeedbackFrequency — Enforces feedback prompt frequency limits.
 *
 * HARD RULES:
 * - Max 1 prompt (A/B/C) per session
 * - Max 2 prompts (A/B/C) lifetime
 * - Trigger C: fallback only — never fires if A already fired
 * - Trigger B/E: only one per session, export overrides A/C
 * - Trigger D (PMF): once ever, only if user has exported before,
 *                    never in same session as B or E
 * - Trigger E (Competitor): once ever, only if exported in a previous session,
 *                           never in same session as D (PMF)
 * - PMF + Competitor never in the same session
 */

const KEYS = {
  SESSION_SHOWN:       'vt:fb:session_shown',       // sessionStorage: '1' if A/B/C shown this session
  LIFETIME_COUNT:      'vt:fb:lifetime_count',       // localStorage: number
  TRIGGER_A:           'vt:fb:trigger_a',            // localStorage: '1' if ever shown
  TRIGGER_B:           'vt:fb:trigger_b',            // localStorage: '1' if ever shown
  TRIGGER_C:           'vt:fb:trigger_c',            // localStorage: '1' if ever shown
  PMF_SHOWN:           'vt:fb:pmf_shown',            // localStorage: '1' if ever shown
  COMPETITOR_SHOWN:    'vt:fb:competitor_shown',     // localStorage: '1' if ever shown
  HAS_EXPORTED_EVER:   'vt:fb:exported_ever',        // localStorage: '1' if ever exported (any session)
  PMF_SESSION:         'vt:fb:pmf_session',          // sessionStorage: '1' if D shown this session
  BEHAVIORAL_SESSION:  'vt:fb:behavioral_session',   // sessionStorage: '1' if B or E shown this session
} as const

// ─── localStorage helpers ─────────────────────────────────────────────────────
function get(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function set(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* ok */ }
}
function getNum(key: string): number {
  return parseInt(get(key) ?? '0', 10) || 0
}

// ─── sessionStorage helpers ───────────────────────────────────────────────────
function sGet(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
function sSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value) } catch { /* ok */ }
}

// ─── Session-level flags ──────────────────────────────────────────────────────

/** True if any A/B/C prompt was shown this tab session. */
function isShownThisSession(): boolean {
  return sGet(KEYS.SESSION_SHOWN) === '1'
}
function markShownThisSession(): void {
  sSet(KEYS.SESSION_SHOWN, '1')
}

/** True if PMF (D) was shown this tab session. */
function isPMFShownThisSession(): boolean {
  return sGet(KEYS.PMF_SESSION) === '1'
}
function markPMFShownThisSession(): void {
  sSet(KEYS.PMF_SESSION, '1')
}

/** True if B (export friction) or E (competitor) was shown this tab session. */
function isBehavioralShownThisSession(): boolean {
  return sGet(KEYS.BEHAVIORAL_SESSION) === '1'
}
function markBehavioralShownThisSession(): void {
  sSet(KEYS.BEHAVIORAL_SESSION, '1')
}

// ─── Export tracking (cross-session) ─────────────────────────────────────────

/** True if the user has ever exported in any previous session. */
export function hasEverExported(): boolean {
  return get(KEYS.HAS_EXPORTED_EVER) === '1'
}

/** Call once when user exports. Persists to localStorage. */
export function markEverExported(): void {
  set(KEYS.HAS_EXPORTED_EVER, '1')
}

/** Per-tab session export flag (for legacy checks). */
export function hasExportedThisSession(): boolean {
  try { return sessionStorage.getItem('vt:has_exported') === '1' } catch { return false }
}
export function markExportedThisSession(): void {
  try { sessionStorage.setItem('vt:has_exported', '1') } catch { /* ok */ }
}

// ─── canShow guards ───────────────────────────────────────────────────────────

/** A: post-result quality check. First result ever, <2 lifetime prompts. */
export function canShowTriggerA(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_A) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

/**
 * B: export friction. First export ever.
 * feedback_shown_session must be false (no A/B/C this session yet).
 */
export function canShowTriggerB(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_B) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

/**
 * C: drop-off idle. Fallback — only if A did NOT fire.
 * 30% random sampling cached in sessionStorage.
 */
export function canShowTriggerC(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_C) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  // 30% sampling — evaluated once per session
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

/**
 * D: PMF survey. Once ever.
 * Requires: exported at least once (checked in orchestrator), 2+ sessions,
 * never in same session as B or E.
 */
export function canShowTriggerD(): boolean {
  if (get(KEYS.PMF_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false
  if (isBehavioralShownThisSession()) return false  // B or E showed this session
  return true
}

/**
 * E: competitor survey. Once ever.
 * Requires: exported in a PREVIOUS session (checked in orchestrator),
 * never in same session as D (PMF).
 */
export function canShowTriggerE(): boolean {
  if (get(KEYS.COMPETITOR_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false          // D showed this session
  return true
}

// ─── markShown functions ──────────────────────────────────────────────────────

export function markTriggerAShown(): void {
  markShownThisSession()
  set(KEYS.TRIGGER_A, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerBShown(): void {
  markShownThisSession()
  markBehavioralShownThisSession()          // blocks D in same session
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
  markPMFShownThisSession()                 // blocks D in same session
  markBehavioralShownThisSession()
  set(KEYS.COMPETITOR_SHOWN, '1')
}
