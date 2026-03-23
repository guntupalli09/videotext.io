/**
 * useFeedbackFrequency — Feedback prompt frequency enforcement.
 *
 * HARD RULES:
 *  • Max 1 A/B/C per session (tab)
 *  • Max 2 A/B/C lifetime — unless starved (see below)
 *  • C is fallback: never fires if A fired this mount (enforced in orchestrator)
 *  • B/E: only if session gate is clear; E requires exported in a PRIOR session
 *  • D (PMF): once ever, requires prior export, never same session as B or E
 *  • E (Competitor): once ever, never same session as D
 *
 * STARVATION RULE (item 5):
 *  If 4+ sessions pass without any A/B/C feedback (user always exports too fast),
 *  `canShowTriggerA()` ignores the "ever shown" and lifetime-cap flags once,
 *  giving the founder one more result-quality data point.
 */

const KEYS = {
  SESSION_SHOWN:       'vt:fb:session_shown',     // sessionStorage
  LIFETIME_COUNT:      'vt:fb:lifetime_count',     // localStorage
  TRIGGER_A:           'vt:fb:trigger_a',          // localStorage
  TRIGGER_B:           'vt:fb:trigger_b',          // localStorage
  TRIGGER_C:           'vt:fb:trigger_c',          // localStorage
  PMF_SHOWN:           'vt:fb:pmf_shown',          // localStorage
  COMPETITOR_SHOWN:    'vt:fb:competitor_shown',   // localStorage
  HAS_EXPORTED_EVER:   'vt:fb:exported_ever',      // localStorage
  SESSIONS_SINCE:      'vt:fb:sessions_since',     // localStorage — sessions without A/B/C
  PMF_SESSION:         'vt:fb:pmf_session',        // sessionStorage
  BEHAVIORAL_SESSION:  'vt:fb:behavioral_session', // sessionStorage — B or E shown
} as const

const STARVATION_THRESHOLD = 4  // sessions without feedback before forcing A

// ─── localStorage ─────────────────────────────────────────────────────────────
function get(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function set(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* ok */ }
}
function getNum(key: string): number {
  return parseInt(get(key) ?? '0', 10) || 0
}

// ─── sessionStorage ───────────────────────────────────────────────────────────
function sGet(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
function sSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value) } catch { /* ok */ }
}

// ─── Session-level guards ─────────────────────────────────────────────────────

/** True if any A/B/C shown this session (tab). */
export function isShownThisSession(): boolean {
  return sGet(KEYS.SESSION_SHOWN) === '1'
}
function markShownThisSession(): void {
  sSet(KEYS.SESSION_SHOWN, '1')
}

function isPMFShownThisSession(): boolean {
  return sGet(KEYS.PMF_SESSION) === '1'
}
function markPMFShownThisSession(): void {
  sSet(KEYS.PMF_SESSION, '1')
}

function isBehavioralShownThisSession(): boolean {
  return sGet(KEYS.BEHAVIORAL_SESSION) === '1'
}
function markBehavioralShownThisSession(): void {
  sSet(KEYS.BEHAVIORAL_SESSION, '1')
}

// ─── Export tracking ──────────────────────────────────────────────────────────

export function hasEverExported(): boolean {
  return get(KEYS.HAS_EXPORTED_EVER) === '1'
}
export function markEverExported(): void {
  set(KEYS.HAS_EXPORTED_EVER, '1')
}
export function hasExportedThisSession(): boolean {
  try { return sessionStorage.getItem('vt:has_exported') === '1' } catch { return false }
}
export function markExportedThisSession(): void {
  try { sessionStorage.setItem('vt:has_exported', '1') } catch { /* ok */ }
}

// ─── Starvation counter ───────────────────────────────────────────────────────

/**
 * Call once per new session (from App.tsx, after isNewSession() check).
 * Counts sessions where no A/B/C prompt was shown.
 */
export function incrementSessionsSinceFeedback(): void {
  set(KEYS.SESSIONS_SINCE, String(getNum(KEYS.SESSIONS_SINCE) + 1))
}

function resetSessionsSinceFeedback(): void {
  set(KEYS.SESSIONS_SINCE, '0')
}

function isStarved(): boolean {
  return getNum(KEYS.SESSIONS_SINCE) >= STARVATION_THRESHOLD
}

// ─── canShow guards ───────────────────────────────────────────────────────────

/**
 * A: post-result quality.
 * Starvation override: if 4+ sessions with no feedback, bypass "ever shown"
 * and lifetime cap once — then reset starvation counter.
 */
export function canShowTriggerA(): boolean {
  if (isShownThisSession()) return false
  if (isStarved()) return true           // starvation override — bypass both flags
  if (get(KEYS.TRIGGER_A) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

/**
 * B: export friction. First export ever.
 * Session gate applies (no other A/B/C this session).
 */
export function canShowTriggerB(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_B) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
  return true
}

/**
 * C: drop-off fallback.
 * 30% sampling cached in sessionStorage.
 * Orchestrator additionally checks triggerAFiredRef (C = fallback for A).
 */
export function canShowTriggerC(): boolean {
  if (isShownThisSession()) return false
  if (get(KEYS.TRIGGER_C) === '1') return false
  if (getNum(KEYS.LIFETIME_COUNT) >= 2) return false
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
 * D: PMF. Once ever.
 * Requires: session 2+, exported before, not same session as B or E.
 * Orchestrator checks hasEverExported() and session count.
 */
export function canShowTriggerD(): boolean {
  if (get(KEYS.PMF_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false
  if (isBehavioralShownThisSession()) return false   // B or E showed this session
  return true
}

/**
 * E: competitor. Once ever.
 * Requires: exported in a PRIOR session (orchestrator checks hasEverExported()
 *   BEFORE marking the current export). Session gate applies.
 * Never same session as D.
 */
export function canShowTriggerE(): boolean {
  if (isShownThisSession()) return false              // FIX: was missing — double-fire guard
  if (get(KEYS.COMPETITOR_SHOWN) === '1') return false
  if (isPMFShownThisSession()) return false           // D showed this session
  return true
}

// ─── markShown ────────────────────────────────────────────────────────────────

export function markTriggerAShown(): void {
  markShownThisSession()
  resetSessionsSinceFeedback()
  set(KEYS.TRIGGER_A, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerBShown(): void {
  markShownThisSession()
  markBehavioralShownThisSession()
  resetSessionsSinceFeedback()
  set(KEYS.TRIGGER_B, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerCShown(): void {
  markShownThisSession()
  resetSessionsSinceFeedback()
  set(KEYS.TRIGGER_C, '1')
  set(KEYS.LIFETIME_COUNT, String(getNum(KEYS.LIFETIME_COUNT) + 1))
}

export function markTriggerDShown(): void {
  markPMFShownThisSession()
  set(KEYS.PMF_SHOWN, '1')
}

export function markTriggerEShown(): void {
  markShownThisSession()
  markPMFShownThisSession()
  markBehavioralShownThisSession()
  set(KEYS.COMPETITOR_SHOWN, '1')
}
