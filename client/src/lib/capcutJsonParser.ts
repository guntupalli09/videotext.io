/** Parse CapCut / caption JSON exports into subtitle cues (browser-only). */

import { msToSrtTime, type SubtitleCue } from './subtitleUtils'

type RawCue = { startMs: number; endMs: number; text: string }

function toMs(value: unknown, fallbackUnit: 'ms' | 's' = 'ms'): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return fallbackUnit === 's' ? Math.round(value * 1000) : Math.round(value)
}

function pickText(obj: Record<string, unknown>): string {
  for (const key of ['text', 'content', 'subtitle', 'caption', 'words']) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function pickTiming(obj: Record<string, unknown>): { startMs: number; endMs: number } | null {
  const text = pickText(obj)
  if (!text) return null

  // seconds
  if ('start' in obj || 'end' in obj) {
    const start = toMs(obj.start, 's')
    const end = toMs(obj.end, 's')
    if (end > start) return { startMs: start, endMs: end }
  }

  // milliseconds (_time suffix common in CapCut drafts)
  for (const [sKey, eKey, unit] of [
    ['start_time', 'end_time', 'ms'],
    ['startTime', 'endTime', 'ms'],
    ['begin', 'end', 'ms'],
    ['start_ms', 'end_ms', 'ms'],
  ] as const) {
    if (sKey in obj && eKey in obj) {
      const startMs = toMs(obj[sKey], unit)
      const endMs = toMs(obj[eKey], unit)
      if (endMs > startMs) return { startMs, endMs }
    }
  }

  // duration + start
  if ('start_time' in obj && 'duration' in obj) {
    const startMs = toMs(obj.start_time, 'ms')
    const endMs = startMs + toMs(obj.duration, 'ms')
    if (endMs > startMs) return { startMs, endMs }
  }

  return null
}

function flattenObjects(node: unknown, out: RawCue[]): void {
  if (node == null) return

  if (Array.isArray(node)) {
    for (const item of node) flattenObjects(item, out)
    return
  }

  if (typeof node !== 'object') return
  const obj = node as Record<string, unknown>

  const timing = pickTiming(obj)
  if (timing) {
    out.push({ ...timing, text: pickText(obj) })
  }

  for (const key of ['utterances', 'captions', 'subtitles', 'texts', 'segments', 'items', 'data', 'materials']) {
    if (key in obj) flattenObjects(obj[key], out)
  }

  // CapCut draft: materials.texts[] with nested content
  if (obj.materials && typeof obj.materials === 'object') {
    flattenObjects((obj.materials as Record<string, unknown>).texts, out)
  }
}

export function parseCapCutJson(jsonText: string): SubtitleCue[] {
  const parsed = JSON.parse(jsonText) as unknown
  const raw: RawCue[] = []
  flattenObjects(parsed, raw)

  if (raw.length === 0) {
    throw new Error('No caption cues found. Paste CapCut caption JSON with text and start/end times.')
  }

  raw.sort((a, b) => a.startMs - b.startMs)

  return raw.map((c, i) => ({
    index: i + 1,
    startTime: msToSrtTime(c.startMs),
    endTime: msToSrtTime(c.endMs),
    text: c.text,
  }))
}
