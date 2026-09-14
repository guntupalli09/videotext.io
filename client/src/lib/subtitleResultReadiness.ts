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
