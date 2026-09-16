/**
 * Bounded poll for the deferred summary/chapters payload (DEFER_SUMMARY).
 *
 * The original poll in Video to Transcript cleared its spinner only when the
 * server returned a summary or chapters. Every other outcome fell through to a
 * "keep polling" comment and retried every 2s forever, so a job that never
 * produces a summary — or a guest job the server withholds with
 * requiresAuth — left "Generating summary…" on screen indefinitely and hid the
 * "no summary yet" and unlock-teaser fallbacks behind it.
 *
 * This runner always reaches a terminal outcome: ready, requires-auth,
 * exhausted, session-expired, or cancelled.
 */

export const SUMMARY_POLL_INTERVAL_MS = 2000
/** Hard ceiling on the poll regardless of how fast attempts come back. */
export const SUMMARY_POLL_TIMEOUT_MS = 90_000
/** Belt-and-braces cap in case an attempt resolves instantly (cached/offline). */
export const SUMMARY_POLL_MAX_ATTEMPTS = 45

export type DeferredSummaryPayload = {
  summary?: { summary?: string; bullets?: string[]; actionItems?: string[] }
  chapters?: { title: string; startTime: number; endTime?: number }[]
}

export type DeferredSummaryResponse = DeferredSummaryPayload & {
  requiresAuth?: boolean
}

export type DeferredSummaryOutcome =
  | { kind: 'ready'; payload: DeferredSummaryPayload }
  | { kind: 'requires-auth' }
  | { kind: 'exhausted' }
  | { kind: 'session-expired' }
  | { kind: 'cancelled' }

export type PollDeferredSummaryDeps = {
  fetchSummary: () => Promise<DeferredSummaryResponse>
  sleep: (ms: number) => Promise<void>
  now: () => number
  isCancelled: () => boolean
  /** True for the error the API layer throws when the job is gone (404). */
  isSessionExpired: (err: unknown) => boolean
  /**
   * Claim the guest job so the server stops withholding the payload. Called at
   * most once, on the first requiresAuth response; a second one is terminal.
   */
  claimJob?: () => Promise<void>
}

export type PollDeferredSummaryOptions = {
  intervalMs?: number
  timeoutMs?: number
  maxAttempts?: number
}

/** Classify one response without deciding whether to keep polling. */
export function classifyDeferredSummary(
  res: DeferredSummaryResponse | null | undefined,
): 'ready' | 'requires-auth' | 'pending' {
  if (!res) return 'pending'
  if (res.requiresAuth) return 'requires-auth'
  if (res.summary || res.chapters) return 'ready'
  return 'pending'
}

export async function pollDeferredSummary(
  deps: PollDeferredSummaryDeps,
  options: PollDeferredSummaryOptions = {},
): Promise<DeferredSummaryOutcome> {
  const intervalMs = options.intervalMs ?? SUMMARY_POLL_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? SUMMARY_POLL_TIMEOUT_MS
  const maxAttempts = options.maxAttempts ?? SUMMARY_POLL_MAX_ATTEMPTS
  const startedAt = deps.now()
  let claimed = false

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (deps.isCancelled()) return { kind: 'cancelled' }

    try {
      const res = await deps.fetchSummary()
      if (deps.isCancelled()) return { kind: 'cancelled' }

      const verdict = classifyDeferredSummary(res)
      if (verdict === 'ready') {
        return {
          kind: 'ready',
          payload: {
            ...(res.summary != null && { summary: res.summary }),
            ...(res.chapters != null && { chapters: res.chapters }),
          },
        }
      }
      if (verdict === 'requires-auth') {
        // One claim attempt, then treat it as terminal rather than spinning.
        if (claimed || !deps.claimJob) return { kind: 'requires-auth' }
        claimed = true
        try {
          await deps.claimJob()
        } catch {
          return { kind: 'requires-auth' }
        }
        if (deps.isCancelled()) return { kind: 'cancelled' }
        continue
      }
    } catch (err) {
      if (deps.isSessionExpired(err)) return { kind: 'session-expired' }
      // Transient failure — fall through to the interval and retry.
    }

    if (deps.now() - startedAt >= timeoutMs) return { kind: 'exhausted' }
    await deps.sleep(intervalMs)
    if (deps.now() - startedAt >= timeoutMs) return { kind: 'exhausted' }
  }

  return { kind: 'exhausted' }
}
