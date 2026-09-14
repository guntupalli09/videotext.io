/**
 * Client-side SRT gates that match production intake, not a second fix engine.
 * Server still rejects unknown formats via detectSubtitleFormatFromContent()
 * (server/src/utils/subtitleDetector.ts) and parseSRT() silently drops bad cues.
 */

const TIMESTAMP_PATTERN = /\d\d:\d\d:\d\d[.,]\d\d\d\s+-->/
const CUE_TIME_LINE = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/

/**
 * @param {{ name: string, size: number, text: string }} file
 * @param {{ maxBytes: number, warnBytes: number }} limits
 */
export function validateSrtSelection(file, limits) {
  const errors = []
  const warnings = []
  const name = (file.name || '').trim()
  const size = Number(file.size) || 0
  const text = file.text ?? ''

  if (!name) {
    errors.push('Choose an SRT file.')
    return emptyResult(errors, warnings)
  }

  const lower = name.toLowerCase()
  if (!lower.endsWith('.srt')) {
    errors.push('This extension accepts .srt files only. Convert VTT on videotext.io/fix-subtitles if needed.')
  }

  if (size <= 0 || !text.trim()) {
    errors.push('This SRT file is empty.')
    return emptyResult(errors, warnings)
  }

  if (size > limits.maxBytes) {
    errors.push(`File is ${(size / (1024 * 1024)).toFixed(1)} MB. Maximum size is ${Math.round(limits.maxBytes / (1024 * 1024))} MB.`)
    return emptyResult(errors, warnings)
  }

  if (size > limits.warnBytes) {
    warnings.push('Large subtitle file — processing may take longer, especially with grammar & spelling enabled.')
  }

  const trimmed = text.trimStart()
  if (trimmed.startsWith('WEBVTT')) {
    errors.push('This looks like a WebVTT file. Upload a .srt, or use the website tool which also accepts VTT.')
    return emptyResult(errors, warnings)
  }

  if (!TIMESTAMP_PATTERN.test(text)) {
    errors.push('No SRT timestamps found. Each cue needs a line like 00:00:01,000 --> 00:00:04,000.')
    return emptyResult(errors, warnings)
  }

  const stats = inspectSrt(text)
  if (stats.cueCount === 0) {
    errors.push('No complete subtitle cues could be read. The file may be malformed.')
    return emptyResult(errors, warnings, stats)
  }

  if (stats.skippedBlocks > 0) {
    warnings.push(`${stats.skippedBlocks} block(s) do not look like complete SRT cues. The server skips those instead of repairing them.`)
  }

  if (stats.overlapCount > 0) {
    warnings.push(`${stats.overlapCount} overlapping cue pair(s) detected. Overlaps are always resolved on Fix SRT.`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats,
  }
}

function emptyResult(errors, warnings, stats) {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: stats || { cueCount: 0, skippedBlocks: 0, overlapCount: 0, durationSec: 0 },
  }
}

export function inspectSrt(text) {
  const blocks = text.replace(/\r/g, '').trim().split(/\n\s*\n/)
  let cueCount = 0
  let skippedBlocks = 0
  const cues = []

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      if (block.trim()) skippedBlocks += 1
      continue
    }
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) {
      skippedBlocks += 1
      continue
    }
    const match = timeLine.match(CUE_TIME_LINE)
    if (!match) {
      skippedBlocks += 1
      continue
    }
    const start = toSeconds(match, 1)
    const end = toSeconds(match, 5)
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    if (!textLines.length) {
      skippedBlocks += 1
      continue
    }
    cueCount += 1
    cues.push({ start, end, text: textLines.join('\n') })
  }

  let overlapCount = 0
  const sorted = [...cues].sort((a, b) => a.start - b.start)
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (sorted[i].end > sorted[i + 1].start) overlapCount += 1
  }

  const durationSec = sorted.length ? Math.max(0, sorted[sorted.length - 1].end) : 0
  return { cueCount, skippedBlocks, overlapCount, durationSec }
}

export function parseSrtPreview(text, limit = 40) {
  const blocks = text.replace(/\r/g, '').trim().split(/\n\s*\n/)
  const rows = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0)
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeLineIdx === -1) continue
    const [start, end] = lines[timeLineIdx].split('-->').map((s) => s.trim())
    rows.push({
      index: rows.length + 1,
      start,
      end,
      text: lines.slice(timeLineIdx + 1).join('\n'),
    })
    if (rows.length >= limit) break
  }
  return rows
}

function toSeconds(match, offset) {
  return (
    Number(match[offset]) * 3600 +
    Number(match[offset + 1]) * 60 +
    Number(match[offset + 2]) +
    Number(match[offset + 3]) / 1000
  )
}

export function formatBytes(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(sec) {
  if (!sec || sec < 0) return '0s'
  const s = Math.round(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return `${m}m ${r}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
