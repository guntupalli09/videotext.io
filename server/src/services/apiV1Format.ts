/**
 * Pure response-shaping + pagination-cursor helpers for the /api/v1
 * facade — deliberately kept free of any Prisma/queue/network imports so
 * they can be unit tested without pulling in the whole worker stack (see
 * tests/apiV1Pagination.test.ts).
 */

export interface StableJobRow {
  id: string
  status: string
  toolType: string
  resultFilename: string | null
  jobToken: string | null
  videoDurationSec: number | null
  createdAt: Date
  completedAt: Date | null
  failureReason: string | null
}

/** Basename extension, lowercased, including the dot (e.g. ".srt"). */
export function extOf(filename: string | null): string {
  if (!filename) return ''
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

function downloadUrlFor(filename: string, jobToken: string | null): string {
  const base = `/api/download/${encodeURIComponent(filename)}`
  return jobToken ? `${base}?jobToken=${encodeURIComponent(jobToken)}` : base
}

/**
 * Maps a durable Job row to the external, stable transcription representation.
 * Only fields the current architecture actually persists are included —
 * notably, per-job language and inline transcript text are not durably
 * stored on the Job table today (they live only in the ephemeral Bull
 * result), so they are intentionally omitted here rather than invented.
 * The transcript's text content remains reachable via the download URLs.
 */
export function toExternalTranscription(row: StableJobRow) {
  const ext = extOf(row.resultFilename)
  const downloadUrl = row.resultFilename ? downloadUrlFor(row.resultFilename, row.jobToken) : null

  return {
    id: row.id,
    status: row.status,
    tool_type: row.toolType,
    filename: row.resultFilename,
    duration_seconds: row.videoDurationSec,
    txt_url: ext === '.txt' ? downloadUrl : null,
    srt_url: ext === '.srt' ? downloadUrl : null,
    vtt_url: ext === '.vtt' ? downloadUrl : null,
    // Any other output type (docx/pdf/json/zip) still has a working link here.
    download_url: row.resultFilename && ext !== '.txt' && ext !== '.srt' && ext !== '.vtt' ? downloadUrl : null,
    created_at: row.createdAt.toISOString(),
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    failure_reason: row.failureReason,
  }
}

/** Exported for unit testing (round-trip + malformed-input handling). */
export function encodeCursor(sortValue: Date, id: string): string {
  return Buffer.from(`${sortValue.toISOString()}|${id}`, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): { sortValue: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const sep = decoded.lastIndexOf('|')
    if (sep < 0) return null
    const sortValue = new Date(decoded.slice(0, sep))
    const id = decoded.slice(sep + 1)
    if (Number.isNaN(sortValue.getTime()) || !id) return null
    return { sortValue, id }
  } catch {
    return null
  }
}
