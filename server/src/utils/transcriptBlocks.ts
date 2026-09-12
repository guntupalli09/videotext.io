/**
 * Parses the plain-text transcript format produced by the client's `buildTxt()`
 * (client/src/lib/transcriptExport.ts) into speaker/timestamp headers plus
 * spoken-words-only bodies, so the guideline formatter can edit body text
 * without ever seeing (and therefore never inventing or dropping) attribution.
 *
 * Recognizes three header shapes buildTxt emits:
 *   - "Speaker (0:19)"          — per-speaker / per-segment timestamp modes
 *   - "Speaker (01:02:05:10)"   — smpte mode (BITC/SMPTE, HH:MM:SS:FF or HH:MM:SS;FF)
 *   - "[0:19]"                  — per-interval timestamp mode (time-only marker)
 * Any block whose first line doesn't match one of these is treated as
 * headerless (its whole text is the body) — this covers 'none' mode and
 * arbitrary pasted transcripts that don't follow this convention.
 */

export interface TranscriptBlock {
  /** Verbatim header line, or null when the block has no recognized header. */
  header: string | null
  /** Everything after the header line (or the whole block when header is null). */
  body: string
}

const SPEAKER_TIMESTAMP_HEADER = /^.+\s\((?:\d{1,4}:\d{2}|\d{1,2}:\d{2}:\d{2}[:;]\d{1,2})\)$/
const INTERVAL_HEADER = /^\[\d{1,4}:\d{2}\]$/

function isHeaderLine(line: string): boolean {
  return SPEAKER_TIMESTAMP_HEADER.test(line) || INTERVAL_HEADER.test(line)
}

/** Splits transcript text into blank-line-separated blocks with header/body split out. */
export function parseHeaderedBlocks(text: string): TranscriptBlock[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const chunks = normalized.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean)

  return chunks.map((chunk) => {
    const lines = chunk.split('\n')
    const firstLine = lines[0].trim()
    if (isHeaderLine(firstLine) && lines.length > 1) {
      return { header: firstLine, body: lines.slice(1).join('\n').trim() }
    }
    return { header: null, body: chunk }
  })
}

/** True when at least one block carries a recognized header — worth protecting via block mode. */
export function hasAnyHeader(blocks: TranscriptBlock[]): boolean {
  return blocks.some((b) => b.header !== null)
}

/** Reassembles blocks (with edited bodies) back into transcript text, headers verbatim. */
export function joinHeaderedBlocks(blocks: TranscriptBlock[]): string {
  return blocks
    .map((b) => (b.header ? `${b.header}\n${b.body}` : b.body))
    .join('\n\n')
    .trim()
}
