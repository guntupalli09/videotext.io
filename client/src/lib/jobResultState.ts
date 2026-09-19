/**
 * Client-side readiness vocabulary for tools whose result is a single server file.
 *
 * Backend completion is NOT the same as the user holding a downloadable result.
 * A guest job has its payload withheld by GET /api/job/:jobId until the job is
 * claimed (`revealResults: allowedByUser` in server/src/routes/jobs.ts), so a
 * finished job can legitimately report `status: 'completed'` with no `result`.
 *
 * The trap this module exists to close: the auth gate stores a
 * `{ downloadUrl: '' }` placeholder, and that object is TRUTHY. Every plain
 * `if (result)` check therefore reports "the result is already in memory",
 * skips the re-fetch that claiming the job just made possible, and leaves the
 * page advertising a ready download over a blank URL. Clicking it throws
 * DownloadNotReadyError without ever issuing a request — the failure looks like
 * a download bug when it is really a result that was never fetched.
 *
 * `hasDownloadableResult` is the single predicate that answers "can the user
 * actually download this"; every gate below is expressed in terms of it, so the
 * placeholder cannot be mistaken for a result anywhere.
 *
 * Pure and dependency-free so the invariants can be unit tested without a DOM.
 */

import { isBlankDownloadUrl } from './downloadErrors'
import type { ResolvedCompletedJob } from './resolveCompletedJob'

/** The shape every single-file tool result shares. */
export interface DownloadableResult {
  downloadUrl: string
  fileName?: string
}

/**
 * Lifecycle of a job as the UI must present it.
 *
 * `ready` is the ONLY phase that may render a success panel or an enabled
 * download control. The three non-success terminal phases are distinct because
 * each needs different recovery: sign in, retry the fetch, or start over.
 */
export type JobResultPhase =
  /** Nothing submitted yet. */
  | 'idle'
  /** Uploading or the worker is still running. */
  | 'processing'
  /** Worker finished; the payload has not reached this client yet. Retryable. */
  | 'completed-awaiting-result'
  /** Worker finished; the API withholds the payload until the job is claimed. */
  | 'authentication-required'
  /** A usable downloadUrl is in memory. The only downloadable phase. */
  | 'ready'
  /** The job itself failed. */
  | 'failed'

/** True only when the result carries a URL the download endpoint can be called with. */
export function hasDownloadableResult(
  result: { downloadUrl?: string } | null | undefined,
): boolean {
  return !isBlankDownloadUrl(result?.downloadUrl)
}

/**
 * Whether a claim must be followed by re-resolving the result.
 *
 * Claiming changes server-side authorization, so a payload the API withheld
 * from the guest becomes fetchable. Callers must not short-circuit on the
 * truthy auth-gate placeholder — that is exactly the bug this guards.
 */
export function needsResultRefetchAfterClaim(
  result: { downloadUrl?: string } | null | undefined,
): boolean {
  return !hasDownloadableResult(result)
}

/**
 * Terminal phase for a resolved completed job.
 *
 * `missing` means resolution exhausted its retries without the API ever
 * disclosing a payload. That is retryable rather than fatal — the job succeeded
 * on the server — so it maps to `completed-awaiting-result`, never to `ready`.
 */
export function phaseForResolvedJob(resolved: ResolvedCompletedJob): JobResultPhase {
  if (resolved.kind === 'ready' && hasDownloadableResult(resolved.status.result)) {
    return 'ready'
  }
  if (resolved.kind === 'auth-gate') return 'authentication-required'
  return 'completed-awaiting-result'
}

/**
 * The single gate for enabling a download control.
 *
 * Both halves are required: a `ready` phase with a blank URL, or a usable URL
 * still sitting behind the auth gate, must never present a live button.
 */
export function canDownloadResult(
  phase: JobResultPhase,
  result: { downloadUrl?: string } | null | undefined,
): boolean {
  return phase === 'ready' && hasDownloadableResult(result)
}

/** Copy for the non-success terminal phases, so each failure reads distinctly. */
export function phaseRecoveryCopy(
  phase: JobResultPhase,
): { title: string; detail: string } | null {
  switch (phase) {
    case 'completed-awaiting-result':
      return {
        title: 'Your video is ready, but we could not load the download link',
        detail:
          'Processing finished on our side. Retry to fetch the link — your file is still available.',
      }
    case 'authentication-required':
      return {
        title: 'Sign in to get your video',
        detail:
          'Your video finished processing. Create a free account or log in and it will be linked to you automatically.',
      }
    default:
      return null
  }
}
