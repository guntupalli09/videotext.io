/**
 * Pure response-shaping + pagination-cursor helpers for the /api/v1
 * facade — deliberately kept free of any Prisma/queue/network imports so
 * they can be unit tested without pulling in the whole worker stack (see
 * tests/apiV1Pagination.test.ts).
 */
import { PUBLIC_OPERATIONS, type PublicOperation } from './apiOperations'

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
  /** Original upload size, when known — the only file-size field the Job table persists.
   *  There is no persisted "compressed output size" column; see toExternalTranscription. */
  fileSizeBytes?: bigint | number | null
}

const TOOL_TYPE_TO_OPERATION: Partial<Record<string, PublicOperation>> = Object.fromEntries(
  (Object.entries(PUBLIC_OPERATIONS) as [PublicOperation, (typeof PUBLIC_OPERATIONS)[PublicOperation]][])
    .filter(([, cfg]) => cfg.kind !== 'guideline-format')
    .map(([op, cfg]) => [(cfg as { internalToolType: string }).internalToolType, op])
)

// 'voice-to-transcript' is the analytics-only toolType label the intake pipeline
// records for audio-source uploads (see services/transcriptionIntake.ts) — the
// worker itself still runs 'video-to-transcript'. Both belong to the same public
// operation, since Voice Recorder is just another input source for it (see
// services/apiOperations.ts).
TOOL_TYPE_TO_OPERATION['voice-to-transcript'] = 'video_to_transcript'

/** Maps an internal Job.toolType to the stable public operation name, when it is one of the
 *  eight paid API-exposed operations. Falls back to the raw toolType for anything else
 *  (e.g. 'cached-result', 'youtube-to-transcript') rather than hiding it. */
export function operationForToolType(toolType: string): string {
  return TOOL_TYPE_TO_OPERATION[toolType] ?? toolType
}

/** All Job.toolType values that belong to a given public operation — used to scope
 *  GET /api/v1/<resource> list/detail queries so e.g. /subtitle-burns never surfaces
 *  another operation's job. */
export function toolTypesForOperation(operation: PublicOperation): string[] {
  const cfg = PUBLIC_OPERATIONS[operation]
  if (cfg.kind === 'guideline-format') return []
  const toolTypes = [cfg.internalToolType as string]
  if (operation === 'video_to_transcript') toolTypes.push('voice-to-transcript')
  return toolTypes
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
    operation: operationForToolType(row.toolType),
    tool_type: row.toolType,
    filename: row.resultFilename,
    duration_seconds: row.videoDurationSec,
    txt_url: ext === '.txt' ? downloadUrl : null,
    srt_url: ext === '.srt' ? downloadUrl : null,
    vtt_url: ext === '.vtt' ? downloadUrl : null,
    // Any other output type (docx/pdf/json/zip) still has a working link here.
    // For video_compression this is the compressed video's download URL.
    download_url: row.resultFilename && ext !== '.txt' && ext !== '.srt' && ext !== '.vtt' ? downloadUrl : null,
    // Only the original upload size is persisted (Job.fileSizeBytes) — there is no
    // durable "compressed output size" column, so it is intentionally omitted here
    // rather than invented; see docs/API_PRIVATE_BETA.md for why.
    original_size_bytes: row.fileSizeBytes !== null && row.fileSizeBytes !== undefined ? Number(row.fileSizeBytes) : null,
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
