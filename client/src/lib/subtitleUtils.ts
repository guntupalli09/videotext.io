/** Shared subtitle parsing/conversion utilities for client-side free tools. Zero server calls. */

export interface SubtitleCue {
  index: number
  startTime: string   // HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT)
  endTime: string
  text: string
}

export interface ValidationIssue {
  cueIndex: number
  type: 'overlap' | 'long-line' | 'fast-reading' | 'gap' | 'empty' | 'bad-timing'
  message: string
  severity: 'error' | 'warning'
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Parse HH:MM:SS,mmm or HH:MM:SS.mmm → milliseconds */
export function parseTimeToMs(t: string): number {
  const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!m) return 0
  return (
    parseInt(m[1]) * 3_600_000 +
    parseInt(m[2]) * 60_000 +
    parseInt(m[3]) * 1_000 +
    parseInt(m[4].padEnd(3, '0').slice(0, 3))
  )
}

/** Milliseconds → HH:MM:SS,mmm (SRT format) */
export function msToSrtTime(ms: number): string {
  ms = Math.max(0, Math.round(ms))
  const h = Math.floor(ms / 3_600_000); ms %= 3_600_000
  const m = Math.floor(ms / 60_000);    ms %= 60_000
  const s = Math.floor(ms / 1_000);     ms %= 1_000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`
}

/** Milliseconds → HH:MM:SS.mmm (VTT format) */
export function msToVttTime(ms: number): string {
  return msToSrtTime(ms).replace(',', '.')
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function pad3(n: number) { return String(n).padStart(3, '0') }

// ─── Parsers ──────────────────────────────────────────────────────────────────

/** Parse SRT file text → cues */
export function parseSrt(text: string): SubtitleCue[] {
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split(/\n\n+/)
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    const indexLine = lines[0].trim()
    const timingLine = lines[1].trim()
    const tm = timingLine.match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/)
    if (!tm) continue
    const textLines = lines.slice(2).join('\n').trim()
    cues.push({
      index: parseInt(indexLine) || cues.length + 1,
      startTime: tm[1],
      endTime: tm[2],
      text: textLines,
    })
  }
  return cues
}

/** Parse VTT file text → cues */
export function parseVtt(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: SubtitleCue[] = []
  let i = 0
  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) i++
  let idx = 1
  while (i < lines.length) {
    const timingLine = lines[i].trim()
    const tm = timingLine.match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/)
    if (tm) {
      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        textLines.push(lines[i])
        i++
      }
      if (textLines.length > 0) {
        cues.push({ index: idx++, startTime: tm[1], endTime: tm[2], text: textLines.join('\n') })
      }
    } else {
      i++
    }
  }
  return cues
}

/** Detect format from file content */
export function detectFormat(text: string): 'srt' | 'vtt' | 'unknown' {
  const t = text.trim()
  if (t.startsWith('WEBVTT')) return 'vtt'
  if (/^\d+\s*\n\d+:\d+:\d+[,.]/.test(t)) return 'srt'
  if (t.includes('-->')) return 'srt' // best guess
  return 'unknown'
}

// ─── Converters ───────────────────────────────────────────────────────────────

/** SRT cue text → VTT string */
export function cuesToVtt(cues: SubtitleCue[]): string {
  const lines = ['WEBVTT', '']
  for (const c of cues) {
    const start = c.startTime.replace(',', '.')
    const end = c.endTime.replace(',', '.')
    lines.push(`${start} --> ${end}`)
    lines.push(c.text)
    lines.push('')
  }
  return lines.join('\n')
}

/** VTT cues → SRT string */
export function cuesToSrt(cues: SubtitleCue[]): string {
  const lines: string[] = []
  cues.forEach((c, i) => {
    const start = c.startTime.replace('.', ',')
    const end = c.endTime.replace('.', ',')
    lines.push(String(i + 1))
    lines.push(`${start} --> ${end}`)
    lines.push(c.text)
    lines.push('')
  })
  return lines.join('\n')
}

// ─── Shift timing ─────────────────────────────────────────────────────────────

export function shiftCues(cues: SubtitleCue[], offsetMs: number, isSrt: boolean): SubtitleCue[] {
  return cues.map(c => ({
    ...c,
    startTime: isSrt
      ? msToSrtTime(Math.max(0, parseTimeToMs(c.startTime) + offsetMs))
      : msToVttTime(Math.max(0, parseTimeToMs(c.startTime) + offsetMs)),
    endTime: isSrt
      ? msToSrtTime(Math.max(0, parseTimeToMs(c.endTime) + offsetMs))
      : msToVttTime(Math.max(0, parseTimeToMs(c.endTime) + offsetMs)),
  }))
}

// ─── Merge SRTs ───────────────────────────────────────────────────────────────

export function mergeCues(cuesA: SubtitleCue[], cuesB: SubtitleCue[]): SubtitleCue[] {
  const merged = [...cuesA, ...cuesB]
  merged.sort((a, b) => parseTimeToMs(a.startTime) - parseTimeToMs(b.startTime))
  return merged.map((c, i) => ({ ...c, index: i + 1 }))
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateCues(cues: SubtitleCue[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i]
    const startMs = parseTimeToMs(c.startTime)
    const endMs = parseTimeToMs(c.endTime)
    const durationSec = (endMs - startMs) / 1000

    if (!c.text.trim()) {
      issues.push({ cueIndex: i + 1, type: 'empty', message: `Cue ${c.index}: Empty subtitle text`, severity: 'error' })
    }
    if (endMs <= startMs) {
      issues.push({ cueIndex: i + 1, type: 'bad-timing', message: `Cue ${c.index}: End time before start time`, severity: 'error' })
    }
    // Overlap check
    if (i + 1 < cues.length) {
      const nextStart = parseTimeToMs(cues[i + 1].startTime)
      if (endMs > nextStart) {
        issues.push({ cueIndex: i + 1, type: 'overlap', message: `Cue ${c.index} overlaps with cue ${cues[i + 1].index}`, severity: 'error' })
      }
    }
    // Long line check
    const longestLine = c.text.split('\n').reduce((max, l) => Math.max(max, l.length), 0)
    if (longestLine > 42) {
      issues.push({ cueIndex: i + 1, type: 'long-line', message: `Cue ${c.index}: Line too long (${longestLine} chars, max 42)`, severity: 'warning' })
    }
    // Reading speed
    const chars = c.text.replace(/\n/g, ' ').length
    const cps = durationSec > 0 ? chars / durationSec : 0
    if (cps > 21) {
      issues.push({ cueIndex: i + 1, type: 'fast-reading', message: `Cue ${c.index}: Too fast (${cps.toFixed(1)} CPS, max 21)`, severity: 'warning' })
    }
  }
  return issues
}

// ─── File download helper ─────────────────────────────────────────────────────

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Strip HTML tags from subtitle text */
export function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '')
}
