/**
 * Phase 1B — UTILITY 2B: Subtitle Format Converter
 * Derived from subtitle files only (pure parsing). No AI. No worker changes to core flows.
 * Output: converted subtitle as derived artifact. Original never overwritten.
 */

import {
  SubtitleEntry,
  parseSRT,
  parseVTT,
  toSRT,
  toVTT,
  toTXT,
  detectSubtitleFormat,
} from '../utils/srtParser'

export type TargetSubtitleFormat = 'srt' | 'vtt' | 'txt'

/**
 * Convert subtitle file to target format. Reuses existing parsing; no re-encoding.
 */
export function convertSubtitleFile(
  filePath: string,
  targetFormat: TargetSubtitleFormat
): { content: string; format: TargetSubtitleFormat } {
  const sourceFormat = detectSubtitleFormat(filePath)
  const entries: SubtitleEntry[] =
    sourceFormat === 'srt' ? parseSRT(filePath) : parseVTT(filePath)

  if (entries.length === 0) {
    throw new Error('No subtitle entries found (invalid or empty file).')
  }

  let content: string
  switch (targetFormat) {
    case 'srt':
      content = toSRT(entries)
      break
    case 'vtt':
      content = toVTT(entries)
      break
    case 'txt':
      content = toTXT(entries)
      break
    default:
      throw new Error(`Unsupported target format: ${targetFormat}`)
  }

  return { content, format: targetFormat }
}
