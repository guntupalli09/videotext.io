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

// ─── SBV (YouTube) ────────────────────────────────────────────────────────────

/**
 * Parse SBV (YouTube SubViewer) format → cues.
 * Timestamps: 0:00:01.000,0:00:03.000 (no block numbers)
 */
export function parseSbv(text: string): SubtitleCue[] {
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split(/\n\n+/)
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    const tm = lines[0].trim().match(/(\d+:\d+:\d+\.\d+),(\d+:\d+:\d+\.\d+)/)
    if (!tm) continue
    const text = lines.slice(1).join('\n').trim()
    if (!text) continue
    cues.push({
      index: cues.length + 1,
      startTime: sbvTimeToSrt(tm[1]),
      endTime: sbvTimeToSrt(tm[2]),
      text,
    })
  }
  return cues
}

/** Convert SBV timestamp (0:00:01.000) → SRT timestamp (00:00:01,000) */
function sbvTimeToSrt(t: string): string {
  const parts = t.split(':')
  const h = parts.length === 3 ? parts[0].padStart(2, '0') : '00'
  const rest = parts.length === 3 ? parts.slice(1) : parts
  const m = rest[0].padStart(2, '0')
  const sec = rest[1].replace('.', ',')
  return `${h}:${m}:${sec}`
}

/** Convert SRT timestamp (00:00:01,000) → SBV timestamp (0:00:01.000) */
function srtTimeToSbv(t: string): string {
  return t.replace(',', '.').replace(/^0/, '')
}

/** Cues → SBV string */
export function cuesToSbv(cues: SubtitleCue[]): string {
  const lines: string[] = []
  for (const c of cues) {
    lines.push(`${srtTimeToSbv(c.startTime)},${srtTimeToSbv(c.endTime)}`)
    lines.push(c.text)
    lines.push('')
  }
  return lines.join('\n')
}

// ─── ASS / SSA ────────────────────────────────────────────────────────────────

/** Strip ASS override tags like {\an8}, {\pos(x,y)}, {\c&H...&}, etc. */
function stripAssTags(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '')   // remove all {...} blocks
    .replace(/\\N/g, '\n')        // soft line breaks
    .replace(/\\n/g, '\n')        // hard line breaks
    .replace(/\\h/g, ' ')         // non-breaking space
    .trim()
}

/** Parse ASS timestamp (H:MM:SS.cc) → SRT timestamp (HH:MM:SS,mmm) */
function assTimeToSrt(t: string): string {
  const m = t.trim().match(/(\d+):(\d+):(\d+)\.(\d+)/)
  if (!m) return '00:00:00,000'
  const h = m[1].padStart(2, '0')
  const min = m[2].padStart(2, '0')
  const sec = m[3].padStart(2, '0')
  const cs = m[4].padEnd(3, '0').slice(0, 3) // centiseconds → milliseconds
  return `${h}:${min}:${sec},${cs}`
}

/**
 * Parse ASS/SSA subtitle format → cues.
 * Handles both v4 and v4+ styles. Extracts Dialogue events only.
 */
export function parseAss(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: SubtitleCue[] = []

  // Find Events section and Format line
  let inEvents = false
  let startIdx = -1
  let endIdx = -1
  let textIdx = -1

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\[Events\]/i.test(trimmed)) { inEvents = true; continue }
    if (inEvents && /^Format:/i.test(trimmed)) {
      const fields = trimmed.replace(/^Format:\s*/i, '').split(',').map((f) => f.trim().toLowerCase())
      startIdx = fields.indexOf('start')
      endIdx = fields.indexOf('end')
      textIdx = fields.indexOf('text')
      continue
    }
    if (inEvents && /^Dialogue:/i.test(trimmed) && startIdx >= 0 && textIdx >= 0) {
      const content = trimmed.replace(/^Dialogue:\s*/i, '')
      // Split on commas but only up to (textIdx+1) fields — rest is text (may contain commas)
      const maxFields = Math.max(startIdx, endIdx, textIdx) + 1
      const parts: string[] = []
      let remaining = content
      for (let i = 0; i < maxFields - 1; i++) {
        const comma = remaining.indexOf(',')
        if (comma === -1) break
        parts.push(remaining.slice(0, comma))
        remaining = remaining.slice(comma + 1)
      }
      parts.push(remaining)

      const start = parts[startIdx]?.trim()
      const end = parts[endIdx]?.trim()
      const rawText = parts[textIdx]?.trim() ?? ''
      if (!start || !end || !rawText) continue

      cues.push({
        index: cues.length + 1,
        startTime: assTimeToSrt(start),
        endTime: assTimeToSrt(end),
        text: stripAssTags(rawText),
      })
    }
  }

  // Sort by start time (ASS files are usually already sorted, but not always)
  cues.sort((a, b) => parseTimeToMs(a.startTime) - parseTimeToMs(b.startTime))
  cues.forEach((c, i) => { c.index = i + 1 })
  return cues
}

// ─── TTML (Netflix / EBU-TT) ──────────────────────────────────────────────────

/** Parse TTML offset time expression (e.g. "1.5s", "1500ms") → ms */
function ttmlOffsetToMs(val: string): number {
  const s = val.trim()
  if (/^\d+(\.\d+)?s$/.test(s)) return Math.round(parseFloat(s) * 1000)
  if (/^\d+(\.\d+)?ms$/.test(s)) return Math.round(parseFloat(s))
  if (/^\d+(\.\d+)?f$/.test(s)) return Math.round(parseFloat(s) * (1000 / 25)) // assume 25fps
  if (/^\d+:\d+:\d+(\.\d+)?$/.test(s)) {
    const [h, m, rest] = s.split(':')
    const secParts = rest.split('.')
    return (
      parseInt(h) * 3_600_000 +
      parseInt(m) * 60_000 +
      parseInt(secParts[0]) * 1_000 +
      parseInt((secParts[1] ?? '0').padEnd(3, '0').slice(0, 3))
    )
  }
  // HH:MM:SS,mmm or HH:MM:SS.mmm
  return parseTimeToMs(s)
}

/**
 * Parse TTML (W3C Timed Text Markup Language) → cues.
 * Handles EBU-TT, SMPTE-TT, and standard TTML. Browser DOMParser for XML parsing.
 */
export function parseTtml(text: string): SubtitleCue[] {
  // Use browser DOMParser for reliable XML parsing
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    // Try as HTML as fallback
    const htmlDoc = parser.parseFromString(text, 'text/html')
    return extractTtmlCues(htmlDoc)
  }
  return extractTtmlCues(doc)
}

function extractTtmlCues(doc: Document): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  // Select all <p> elements with begin/end attributes (namespace-agnostic)
  const paragraphs = doc.querySelectorAll('p[begin][end], p[begin]')

  paragraphs.forEach((p) => {
    const begin = p.getAttribute('begin') ?? ''
    const end = p.getAttribute('end') ?? p.getAttribute('dur') ?? ''
    if (!begin) return

    const startMs = ttmlOffsetToMs(begin)
    let endMs = ttmlOffsetToMs(end)
    if (!end || endMs === 0) endMs = startMs + 2000 // fallback 2s

    // Extract text content, preserving <br> as newlines
    const rawHtml = p.innerHTML
    const textContent = rawHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<span[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    if (!textContent) return
    cues.push({
      index: cues.length + 1,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(endMs),
      text: textContent,
    })
  })

  return cues
}

/** Convert a numeric timestamp (seconds, or milliseconds if large) to ms. */
function numericTimeToMs(raw: string): number {
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return NaN
  // Heuristic: values above 4 hours in "seconds" are almost certainly already milliseconds.
  return n > 14400 ? n : n * 1000
}

/** Parse an HTML caption/transcript export into cues. Supports the common real-world shapes:
 *  1. Elements with data-start/data-start-ms + data-end/data-end-ms (caption-editor exports)
 *  2. Elements with begin/end attributes, HTML5-flavored TTML-in-HTML
 *  3. Plain-text blocks prefixed with a bracketed/parenthesized timestamp, e.g. "[00:00:12] Hello" */
export function parseHtmlCaptions(text: string): SubtitleCue[] {
  const doc = new DOMParser().parseFromString(text, 'text/html')

  const dataTimed = doc.querySelectorAll('[data-start], [data-start-ms], [data-time], [data-start-time]')
  if (dataTimed.length > 0) {
    const cues: SubtitleCue[] = []
    const nodes = Array.from(dataTimed)
    nodes.forEach((el, i) => {
      const startRaw = el.getAttribute('data-start-ms') ?? el.getAttribute('data-start') ?? el.getAttribute('data-time') ?? el.getAttribute('data-start-time') ?? ''
      const startMs = el.hasAttribute('data-start-ms') ? parseFloat(startRaw) : numericTimeToMs(startRaw)
      if (!Number.isFinite(startMs)) return
      const endRaw = el.getAttribute('data-end-ms') ?? el.getAttribute('data-end') ?? el.getAttribute('data-duration') ?? ''
      let endMs = el.hasAttribute('data-end-ms')
        ? parseFloat(endRaw)
        : el.hasAttribute('data-duration')
          ? startMs + numericTimeToMs(endRaw)
          : numericTimeToMs(endRaw)
      if (!Number.isFinite(endMs) || endMs <= startMs) {
        const next = nodes[i + 1]
        const nextStartRaw = next?.getAttribute('data-start-ms') ?? next?.getAttribute('data-start') ?? next?.getAttribute('data-time') ?? next?.getAttribute('data-start-time')
        const nextStartMs = nextStartRaw != null ? (next!.hasAttribute('data-start-ms') ? parseFloat(nextStartRaw) : numericTimeToMs(nextStartRaw)) : NaN
        endMs = Number.isFinite(nextStartMs) && nextStartMs > startMs ? nextStartMs : startMs + 3000
      }
      const textContent = (el.textContent ?? '').trim()
      if (!textContent) return
      cues.push({ index: cues.length + 1, startTime: msToSrtTime(startMs), endTime: msToSrtTime(endMs), text: textContent })
    })
    if (cues.length > 0) return cues
  }

  const beginEnd = doc.querySelectorAll('[begin]')
  if (beginEnd.length > 0) return extractTtmlCues(doc)

  // Fallback: plain-text blocks prefixed with a timestamp like [00:12], [1:02:03.456] or (00:00:12)
  const plain = (doc.body?.textContent ?? text).replace(/\r\n/g, '\n')
  const timestampRe = /[[(]\s*(\d{1,2}(?::\d{2}){1,2}(?:[.,]\d{1,3})?)\s*[\])]/g
  const matches = [...plain.matchAll(timestampRe)]
  if (matches.length === 0) return []

  const flexibleTimeToMs = (raw: string): number => {
    const [main, frac] = raw.replace(',', '.').split('.')
    const parts = main.split(':').map((p) => parseInt(p, 10))
    const ms = parts.length === 3
      ? parts[0] * 3_600_000 + parts[1] * 60_000 + parts[2] * 1_000
      : parts[0] * 60_000 + parts[1] * 1_000
    return ms + (frac ? parseInt(frac.padEnd(3, '0').slice(0, 3), 10) : 0)
  }

  const cues: SubtitleCue[] = []
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const startMs = flexibleTimeToMs(m[1])
    const segStart = m.index! + m[0].length
    const segEnd = i + 1 < matches.length ? matches[i + 1].index! : plain.length
    const segText = plain.slice(segStart, segEnd).trim()
    if (!segText) continue
    const nextStartMs = i + 1 < matches.length ? flexibleTimeToMs(matches[i + 1][1]) : startMs + 3000
    cues.push({
      index: cues.length + 1,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(Math.max(nextStartMs, startMs + 500)),
      text: segText,
    })
  }
  return cues
}
