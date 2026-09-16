/**
 * Readiness rules for the Video-to-Subtitles completed state.
 *
 * Backend completion is NOT the same as the user having a usable result. A
 * guest job is withheld by the API until claimed, the preview fetch can fail,
 * and a well-formed response can still parse to zero cues. Each of those used
 * to reach the same `setStatus('completed')` + `first_output_seen` code path as
 * a genuine success, so the funnel reported healthy result views over an empty
 * Studio.
 *
 * These helpers are pure so the invariant can be tested without a DOM.
 */

import type { SubtitleRow } from '../components/SubtitleEditor'
import type { ResolvedCompletedJob } from './resolveCompletedJob'

/**
 * Parse SRT/VTT cue blocks into editor rows. Blocks without a `-->` timing line
 * are skipped, so a non-subtitle body (an error page, an empty file) yields an
 * empty array rather than throwing.
 */
export function parseSubtitlesToRows(text: string): SubtitleRow[] {
  const blocks = text
    .replace(/\r/g, '')
    .trim()
    .split('\n\n')
    .filter(Boolean)

  const rows: SubtitleRow[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0)
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeLineIdx === -1) continue

    const timeLine = lines[timeLineIdx]
    const [start, end] = timeLine.split('-->').map((s) => s.trim())
    const textLines = lines.slice(timeLineIdx + 1)
    rows.push({
      index: rows.length + 1,
      startTime: start,
      endTime: end,
      text: textLines.join('\n'),
    })
  }
  return rows
}

/**
 * True only when the Studio has something the user can actually read or export.
 * A `{ downloadUrl: '' }` placeholder — which the auth gate sets and which is
 * truthy — is explicitly not usable.
 */
export function hasRenderableSubtitleResult(
  result: { downloadUrl?: string } | null | undefined,
  subtitleRowCount: number,
): boolean {
  return Boolean(result?.downloadUrl) && subtitleRowCount > 0
}

/**
 * Gate for `first_output_seen`. It must represent a genuinely usable result,
 * never mere backend completion, and must stay deduplicated per session.
 */
export function shouldEmitFirstOutputSeen(params: {
  status: string
  subtitleRowCount: number
  alreadyTracked: boolean
}): boolean {
  if (params.status !== 'completed') return false
  if (params.alreadyTracked) return false
  return params.subtitleRowCount > 0
}

/**
 * After a guest signs in and the job is claimed, the previously withheld result
 * must be re-resolved. The auth-gate placeholder is truthy, so a plain
 * `if (result)` check wrongly reports "already in memory" and the Studio stays
 * empty forever.
 */
export function needsResultRefetchAfterClaim(
  result: { downloadUrl?: string } | null | undefined,
  subtitleRowCount: number,
): boolean {
  return !hasRenderableSubtitleResult(result, subtitleRowCount)
}

/** A resolved job may only drive the success Studio when it is genuinely ready. */
export function resolvedJobIsSuccessful(resolved: ResolvedCompletedJob): boolean {
  return resolved.kind === 'ready' && Boolean(resolved.status?.result)
}

/**
 * Terminal outcome of finalizing a completed subtitle job.
 *
 * `ready` is the ONLY member that may drive `setStatus('completed')`, the
 * success Studio, or `first_output_seen`. It carries `rowsAvailable: true` as a
 * literal so a ready result cannot be constructed without asserting that cue
 * rows actually loaded — the compiler enforces the invariant, not a convention.
 *
 * There is deliberately no `download-only` member. Video-to-Subtitles has no
 * direct server-file download: every export runs handleDownloadSubtitles(rows)
 * and is generated client-side from subtitleRows, so a downloadUrl without
 * rows produces an EMPTY file. If a real server-file download is added later,
 * add the member here and extend `finalizeOutcomeAllowsSuccessState`.
 */
export type FinalizeResult =
  /** Cue rows loaded and are rendered. The only success. */
  | { kind: 'ready'; rowsAvailable: true }
  /** Guest job: the API withheld the payload pending sign-in. */
  | { kind: 'auth-gate' }
  /** Signed in, but the job could not be attached to this account. */
  | { kind: 'claim-failed' }
  /** Resolution exhausted its retries without ever seeing a usable payload. */
  | { kind: 'timeout' }
  /** Result file resolved, but fetching or parsing it produced no cues. */
  | { kind: 'preview-failed' }
  /** Resolution reported ready, but the payload carried no downloadUrl. */
  | { kind: 'empty-result' }

/** The single branch that authorizes the successful Studio. */
export function finalizeOutcomeAllowsSuccessState(result: FinalizeResult): boolean {
  return result.kind === 'ready'
}

/** Terminal UI status for a finalize result. */
export function statusForFinalizeOutcome(
  result: FinalizeResult,
): 'completed' | 'result-gated' | 'result-unavailable' {
  if (result.kind === 'ready') return 'completed'
  if (result.kind === 'auth-gate') return 'result-gated'
  return 'result-unavailable'
}

/** Copy for the terminal non-success states, so each failure reads distinctly. */
export function finalizeFailureCopy(result: FinalizeResult): { title: string; detail: string } | null {
  switch (result.kind) {
    case 'ready':
    case 'auth-gate':
      return null
    case 'claim-failed':
      return {
        title: "Couldn't attach this result to your account",
        detail:
          'This job may have been started in a different session. Try generating again, or refresh if you think this is a mistake.',
      }
    case 'timeout':
      return {
        title: 'Your subtitles are still finishing up',
        detail: 'This is taking longer than usual. Refresh the page to check again.',
      }
    case 'preview-failed':
      return {
        title: "Your subtitles couldn't be loaded",
        detail:
          "The file finished, but we couldn't read it in this session. Refresh to try again — your subtitles are still on our side.",
      }
    case 'empty-result':
      return {
        title: 'This job finished without a subtitle file',
        detail:
          'Nothing was produced for this video. Try generating again, or contact support if it keeps happening.',
      }
  }
}
