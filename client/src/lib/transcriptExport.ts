/**
 * Client-side transcript export utilities.
 *
 * ZERO server round-trips — all formats are generated entirely in the browser
 * from the current editableSegments + speakerNameMap state. This preserves the
 * zero-data-retention guarantee: edited content never leaves the device.
 *
 * Single source of truth: every export format derives from these two inputs:
 *   - segments: Segment[]            (text, timestamps, raw speaker label)
 *   - speakerNameMap: SpeakerNameMap (rawLabel → user-defined name)
 */

import type { Segment } from './srtExport'
import { formatTimestamp } from './srtExport'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Maps raw backend speaker labels (e.g. "SPEAKER_00") to user-defined names (e.g. "Alice"). */
export type SpeakerNameMap = Record<string, string>

/** A segment with the speaker field already resolved to a display name. */
export interface ResolvedSegment {
  start: number
  end: number
  text: string
  /** Resolved display name (custom or auto "Speaker N"), only set when diarization was enabled. */
  speaker?: string
}

// ─── Speaker resolution ───────────────────────────────────────────────────────

/**
 * Returns the ordered list of unique raw speaker labels from segments.
 * Order is first-appearance so "Speaker 1" always refers to the first voice heard.
 */
export function uniqueSpeakerLabels(segments: Segment[]): string[] {
  const seen: string[] = []
  for (const seg of segments) {
    const raw = seg.speaker?.trim()
    if (raw && !seen.includes(raw)) seen.push(raw)
  }
  return seen
}

/**
 * Resolves a raw backend label to its display name.
 * Priority: user-defined name → auto "Speaker N" fallback.
 */
export function resolveSpeakerName(
  rawLabel: string,
  nameMap: SpeakerNameMap,
  orderedLabels: string[],
): string {
  if (nameMap[rawLabel]) return nameMap[rawLabel]
  const idx = orderedLabels.indexOf(rawLabel)
  return `Speaker ${idx >= 0 ? idx + 1 : '?'}`
}

/**
 * Returns a copy of segments where each `speaker` field is replaced by the
 * resolved display name. Segments without a speaker are unchanged.
 * Only attaches a speaker when there are ≥2 distinct speakers (diarized audio).
 */
export function withResolvedSpeakers(
  segments: Segment[],
  nameMap: SpeakerNameMap,
): ResolvedSegment[] {
  const labels = uniqueSpeakerLabels(segments)
  const isDiarized = labels.length >= 2
  return segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
    speaker:
      isDiarized && seg.speaker?.trim()
        ? resolveSpeakerName(seg.speaker.trim(), nameMap, labels)
        : undefined,
  }))
}

// ─── Full transcript text ─────────────────────────────────────────────────────

/**
 * Joins segment texts into a single string.
 * Uses double-newline between segments so paragraphs are preserved.
 */
export function buildFullTranscript(segments: Segment[]): string {
  return segments.map((s) => s.text.trim()).filter(Boolean).join('\n\n')
}

// ─── TXT ──────────────────────────────────────────────────────────────────────

/**
 * Builds a human-readable plain-text transcript.
 *
 * When speakers are present (diarized):
 *   Alice (0:00)
 *   Hello, how are you?
 *
 *   Bob (0:05)
 *   Doing well, thanks.
 *
 * When no speakers:
 *   Hello, how are you?
 *   Doing well, thanks.
 */
export function buildTxt(segments: Segment[], nameMap: SpeakerNameMap): string {
  const resolved = withResolvedSpeakers(segments, nameMap)
  const lines: string[] = []
  for (const seg of resolved) {
    if (seg.speaker) {
      lines.push(`${seg.speaker} (${formatTimestamp(seg.start)})`)
      lines.push(seg.text.trim())
      lines.push('')
    } else {
      lines.push(seg.text.trim())
    }
  }
  return lines.join('\n').trimEnd()
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Builds a CSV with columns: start, end, speaker, text
 * The speaker column is omitted when the transcript is not diarized.
 */
export function buildCsv(segments: Segment[], nameMap: SpeakerNameMap): string {
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)

  const header = hasSpeakers ? 'start,end,speaker,text' : 'start,end,text'
  const rows = resolved.map((seg) => {
    const cols = [
      seg.start.toFixed(3),
      seg.end.toFixed(3),
      ...(hasSpeakers ? [csvCell(seg.speaker ?? '')] : []),
      csvCell(seg.text),
    ]
    return cols.join(',')
  })
  return [header, ...rows].join('\n')
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export interface TranscriptJsonExport {
  fullTranscript: string
  segments: Array<{ start: number; end: number; text: string; speaker?: string }>
  speakers?: Array<{ speaker: string; text: string }>
  summary?: unknown
  chapters?: unknown
  highlights?: unknown
  keywords?: unknown
}

/**
 * Builds a structured JSON export.
 * Always includes fullTranscript + segments.
 * Adds a `speakers` array when diarization data is present.
 */
export function buildJson(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  extras: {
    summary?: unknown
    chapters?: unknown
    highlights?: unknown
    keywords?: unknown
  } = {},
): string {
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)

  const payload: TranscriptJsonExport = {
    fullTranscript: buildFullTranscript(segments),
    segments: resolved.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      ...(hasSpeakers && s.speaker ? { speaker: s.speaker } : {}),
    })),
    ...(hasSpeakers
      ? {
          speakers: resolved
            .filter((s) => s.speaker)
            .map((s) => ({ speaker: s.speaker!, text: s.text })),
        }
      : {}),
    ...extras,
  }
  return JSON.stringify(payload, null, 2)
}

// ─── Notion ───────────────────────────────────────────────────────────────────

/**
 * Builds a Notion-compatible block array (paragraph blocks).
 * Speaker turns are prefixed: "[Alice] Hello there."
 */
export function buildNotion(segments: Segment[], nameMap: SpeakerNameMap): string {
  const resolved = withResolvedSpeakers(segments, nameMap)
  const blocks = resolved.map((seg) => ({
    type: 'paragraph',
    rich_text: [
      {
        type: 'text',
        text: {
          content: seg.speaker ? `[${seg.speaker}] ${seg.text}` : seg.text,
        },
      },
    ],
  }))
  return JSON.stringify(blocks, null, 2)
}

// ─── PDF (client-side, jsPDF) ─────────────────────────────────────────────────

/**
 * Generates and triggers download of a PDF transcript.
 * Lazy-loads jsPDF to avoid adding it to the initial bundle.
 *
 * Layout:
 *   Title line, then for each segment:
 *     SPEAKER (0:00)   [bold, colored when diarized]
 *     Transcript text  [normal weight, indented]
 *
 * Long documents automatically paginate.
 */
export async function exportToPdf(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  watermark?: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const textWidth = pageW - margin * 2
  const lineH = 6
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) addPage()
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Video Transcript', margin, y)
  y += lineH * 1.8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('Generated by VideoText.io', margin, y)
  y += lineH * 2
  doc.setTextColor(0)

  // Segments
  doc.setFontSize(11)
  for (const seg of resolved) {
    const bodyLines = doc.splitTextToSize(seg.text.trim() || ' ', textWidth)
    const blockH = hasSpeakers && seg.speaker ? lineH + lineH * bodyLines.length + lineH * 0.6 : lineH * bodyLines.length + lineH * 0.4
    ensureSpace(blockH)

    if (hasSpeakers && seg.speaker) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 40, 160) // violet
      doc.text(`${seg.speaker}  (${formatTimestamp(seg.start)})`, margin, y)
      doc.setTextColor(0)
      y += lineH
    }

    doc.setFont('helvetica', 'normal')
    doc.text(bodyLines, margin, y)
    y += lineH * bodyLines.length + lineH * 0.6
  }

  // Watermark footer on every page
  if (watermark) {
    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(160)
      doc.text(watermark, margin, pageH - 8)
      doc.setTextColor(0)
    }
  }

  doc.save(filename)
}

// ─── DOCX (client-side, docx library) ────────────────────────────────────────

/**
 * Generates and triggers download of a DOCX transcript.
 * Lazy-loads the `docx` library to avoid adding it to the initial bundle.
 *
 * Layout:
 *   H1: "Video Transcript"
 *   For each segment:
 *     Bold paragraph: "Speaker (0:00)" [when diarized]
 *     Normal paragraph: transcript text
 */
export async function exportToDocx(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  watermark?: string,
): Promise<void> {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)

  const children: InstanceType<typeof Paragraph>[] = []

  // Title
  children.push(
    new Paragraph({
      text: 'Video Transcript',
      heading: HeadingLevel.HEADING_1,
    }),
  )

  if (watermark) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: watermark, italics: true, color: '888888', size: 18 })],
        spacing: { after: 240 },
      }),
    )
  }

  // Segments
  for (const seg of resolved) {
    if (hasSpeakers && seg.speaker) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${seg.speaker}  (${formatTimestamp(seg.start)})`,
              bold: true,
              color: '5028A0',
            }),
          ],
          spacing: { before: 160, after: 40 },
        }),
      )
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: seg.text.trim() })],
        spacing: { after: hasSpeakers && seg.speaker ? 120 : 80 },
      }),
    )
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── localStorage persistence (zero server retention) ────────────────────────

const LS_VERSION = 1

interface PersistedEdits {
  version: number
  /**
   * Fingerprint of the ORIGINAL segments at save time.
   * Used to reject stale edits when the transcript has changed (e.g. re-processed).
   * Built from segment count + total char count + first/last segment text snippet.
   */
  transcriptHash: string
  segments: Segment[]
  speakerNameMap: SpeakerNameMap
  savedAt: number
}

/**
 * Lightweight fingerprint of the original transcript segments.
 * Not cryptographic — only needs to catch the common cases:
 *   • re-processing the same file (different text → different hash)
 *   • diarization toggled (different speaker field count)
 */
export function computeTranscriptHash(segments: Segment[]): string {
  const n = segments.length
  if (n === 0) return '0'
  const totalChars = segments.reduce((acc, s) => acc + s.text.length, 0)
  const first = segments[0].text.slice(0, 24).replace(/\s+/g, ' ')
  const last = segments[n - 1].text.slice(0, 24).replace(/\s+/g, ' ')
  return `${n}:${totalChars}:${first}|${last}`
}

export function lsKey(jobId: string): string {
  return `vt_edits_v${LS_VERSION}_${jobId}`
}

export function saveEditsToStorage(
  jobId: string,
  segments: Segment[],
  speakerNameMap: SpeakerNameMap,
  transcriptHash: string,
): void {
  try {
    const payload: PersistedEdits = { version: LS_VERSION, transcriptHash, segments, speakerNameMap, savedAt: Date.now() }
    localStorage.setItem(lsKey(jobId), JSON.stringify(payload))
  } catch {
    // Storage full or unavailable — silently ignore (edits still work in-session)
  }
}

/**
 * Loads persisted edits for a job.
 * Returns null when:
 *   • nothing saved
 *   • version mismatch (old schema)
 *   • transcriptHash mismatch (transcript was re-processed — stale edits must be discarded)
 */
export function loadEditsFromStorage(jobId: string, expectedHash: string): PersistedEdits | null {
  try {
    const raw = localStorage.getItem(lsKey(jobId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEdits
    if (parsed.version !== LS_VERSION) return null
    if (parsed.transcriptHash !== expectedHash) return null
    return parsed
  } catch {
    return null
  }
}

export function clearEditsFromStorage(jobId: string): void {
  try {
    localStorage.removeItem(lsKey(jobId))
  } catch { /* ignore */ }
}
