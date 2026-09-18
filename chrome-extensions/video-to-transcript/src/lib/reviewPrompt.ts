/**
 * The in-extension review engine: a repeating, self-limiting ask shown after a
 * successful transcription.
 *
 * Cadence — repeating, but bounded so it can never become nagging:
 *
 *   ask 1  after the 1st successful job
 *   ask 2  after the 5th,  and only if 7+ days have passed since ask 1
 *   ask 3  after the 15th, and only if 7+ days have passed since ask 2
 *   then   never again
 *
 * Both gates must pass, so someone who runs twenty files in an afternoon sees
 * the prompt once that day, not three times. Opening the Store retires the
 * prompt permanently on the spot.
 *
 * Rules this deliberately follows, because Chrome Web Store policy prohibits
 * the alternatives:
 *
 *   - It asks for an *honest* review. It never asks for five stars, never
 *     suggests a rating, and never implies a favour is owed.
 *   - Nothing is offered in exchange — no free minutes, no Pro access, no
 *     credits. The user's plan and allowance are identical either way.
 *   - Everyone who finishes a transcription sees the same prompt. It is not
 *     gated on how the job went, and there is no "are you happy?" fork that
 *     would route only satisfied users to the Store while diverting unhappy
 *     ones elsewhere. That fork is review-gating, and it is against policy.
 *   - It only ever links to THIS extension's own reviews page.
 *
 * The first ask waits for a completed job so the user has actually seen the
 * extension work and has something real to review.
 */
import { REVIEWS_URL, STORAGE_KEYS } from './config.js'

export interface ReviewPromptState {
  /** Successful transcriptions this profile has completed. */
  completedJobs: number
  /** How many times the prompt has been shown and acted on. */
  asks: number
  /** Epoch ms of the last ask, or null if never asked. */
  lastAskedAt: number | null
  /**
   * 'pending'   — eligible for a future ask
   * 'asked'     — the user opened the Store reviews page; done for good
   * 'exhausted' — the cadence ran out; done for good
   *
   * We deliberately do not record whether a review was actually left. That is
   * the user's business, and the Store does not tell us anyway.
   */
  status: 'pending' | 'asked' | 'exhausted'
}

export const INITIAL_REVIEW_STATE: ReviewPromptState = {
  completedJobs: 0,
  asks: 0,
  lastAskedAt: null,
  status: 'pending',
}

/** Completed-job count at which each successive ask becomes eligible. */
export const REVIEW_PROMPT_JOB_MILESTONES = [1, 5, 15] as const

/** Minimum gap between asks, regardless of how many jobs were run. */
export const REVIEW_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Whether to show the prompt now. Pure, so the cadence above is testable
 * without a browser or a clock.
 */
export function shouldShowReviewPrompt(state: ReviewPromptState, now = Date.now()): boolean {
  if (state.status !== 'pending') return false

  const milestone = REVIEW_PROMPT_JOB_MILESTONES[state.asks]
  if (milestone === undefined) return false // cadence exhausted
  if (state.completedJobs < milestone) return false

  if (state.lastAskedAt != null && now - state.lastAskedAt < REVIEW_PROMPT_COOLDOWN_MS) return false

  return true
}

/** Record one more successful transcription. */
export function recordCompletedJob(state: ReviewPromptState): ReviewPromptState {
  return { ...state, completedJobs: state.completedJobs + 1 }
}

/**
 * The user declined this ask. Counts toward the cadence; once the milestones
 * run out the prompt retires itself rather than looping forever.
 */
export function dismissAsk(state: ReviewPromptState, now = Date.now()): ReviewPromptState {
  const asks = state.asks + 1
  const exhausted = asks >= REVIEW_PROMPT_JOB_MILESTONES.length
  return { ...state, asks, lastAskedAt: now, status: exhausted ? 'exhausted' : 'pending' }
}

/** The user opened the reviews page. Never ask again. */
export function acceptAsk(state: ReviewPromptState, now = Date.now()): ReviewPromptState {
  return { ...state, asks: state.asks + 1, lastAskedAt: now, status: 'asked' }
}

/** Tolerate anything previously stored, including nothing at all. */
function normalize(raw: unknown): ReviewPromptState {
  if (!raw || typeof raw !== 'object') return { ...INITIAL_REVIEW_STATE }
  const value = raw as Partial<ReviewPromptState>
  const count = (n: unknown): number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  return {
    completedJobs: count(value.completedJobs),
    asks: count(value.asks),
    lastAskedAt:
      typeof value.lastAskedAt === 'number' && Number.isFinite(value.lastAskedAt)
        ? value.lastAskedAt
        : null,
    status:
      value.status === 'asked' || value.status === 'exhausted' || value.status === 'pending'
        ? value.status
        : 'pending',
  }
}

export async function getReviewPromptState(): Promise<ReviewPromptState> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.reviewPrompt)
    return normalize(stored[STORAGE_KEYS.reviewPrompt])
  } catch {
    // Storage is not worth failing a transcription over.
    return { ...INITIAL_REVIEW_STATE }
  }
}

export async function setReviewPromptState(state: ReviewPromptState): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.reviewPrompt]: state })
  } catch {
    // ignore
  }
}

/**
 * Direct link to THIS item's reviews page — never another extension's.
 *
 * Format is Google's own, from the Chrome Web Store user-support docs: "add
 * /reviews at the end of your item's URL". It redirects to the current
 * chromewebstore.google.com listing, so it stays correct as the Store evolves.
 */
export function reviewsUrl(): string {
  return REVIEWS_URL
}
