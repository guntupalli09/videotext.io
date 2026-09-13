/**
 * Turning a finished job into transcript text and a download filename.
 *
 * The resolution order is the production page's own — see
 * client/src/pages/VideoToTranscript.tsx:1013: prefer `result.segments`
 * (joined on a blank line), and only fall back to fetching
 * `result.downloadUrl` when the backend returned no segments.
 */
import type { TranscriptSegment } from './api.js'

/** Join segments exactly as the web app does: segment text separated by a blank line. */
export function segmentsToText(segments: readonly TranscriptSegment[]): string {
  return segments.map((s) => s.text).join('\n\n')
}

/** Words in the transcript — the only derived metric shown, and it is computed from the text itself. */
export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * `<source file stem>-transcript.txt`, following the web app's export naming
 * (client/src/lib/exportFileNames.ts). Characters illegal in a filename are
 * replaced so chrome cannot reject the download.
 */
export function transcriptFileName(sourceFileName: string): string {
  const stem = sourceFileName.replace(/\.[^./\\]+$/, '') || 'transcript'
  const safe = stem
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .trim()
    .slice(0, 80)
  return `${safe || 'transcript'}-transcript.txt`
}
