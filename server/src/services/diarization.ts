import fs from 'fs'
import path from 'path'
import { extractAudio } from './ffmpeg'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

export interface DiarizedSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

/**
 * Upload audio buffer to Replicate Files API.
 * Returns a temporary URL (valid 24 h) passed as `file` (Path type) so Cog handles auth.
 * This avoids any base64 size limitation and works for arbitrarily large audio files.
 */
async function uploadAudioToReplicate(audioBuf: Buffer, token: string): Promise<string | null> {
  try {
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(audioBuf)], { type: 'audio/mpeg' })
    formData.append('content', blob, 'audio.mp3')

    const res = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: AbortSignal.timeout(120_000), // 2 min — generous for large files
    })
    if (!res.ok) {
      const body = await res.text()
      log.warn({ msg: 'replicate file upload failed', status: res.status, body })
      return null
    }
    const data = (await res.json()) as { urls?: { get: string } }
    return data.urls?.get ?? null
  } catch (err) {
    log.warn({ msg: 'replicate file upload error', error: (err as Error)?.message ?? String(err) })
    return null
  }
}

function buildSegments(raw: Array<{ start: unknown; end: unknown; text: unknown; speaker?: unknown }>): DiarizedSegment[] {
  return raw.map((s) => ({
    start: Number(s.start),
    end: Number(s.end),
    text: String(s.text),
    speaker: typeof s.speaker === 'string' ? s.speaker : undefined,
  }))
}

/**
 * Optional speaker diarization via Replicate (thomasmol/whisper-diarization).
 * Set REPLICATE_API_TOKEN to enable. Returns segments with raw speaker IDs or null on skip/failure.
 *
 * Uses POST /v1/predictions with a pinned version hash as required by the Replicate API
 * for community models.
 *
 * Audio is uploaded via the Replicate Files API (auto-expires in 24 h), which removes
 * the previous ~18 MB base64 ceiling and supports videos of any length.
 */
export async function transcribeWithDiarization(
  videoPath: string,
  language?: string,
  options?: { isAlreadyAudio?: boolean; prompt?: string; numSpeakers?: number }
): Promise<{ text: string; segments: DiarizedSegment[] } | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token?.trim()) return null

  const isAlreadyAudio = options?.isAlreadyAudio === true
  const tempDir = path.dirname(videoPath)
  const audioPath = isAlreadyAudio ? videoPath : path.join(tempDir, `audio-diar-${Date.now()}.mp3`)

  try {
    if (!isAlreadyAudio) {
      await extractAudio(videoPath, audioPath)
    }

    const audioBuf = fs.readFileSync(audioPath)

    // Clean up temp audio file as soon as it is read — no longer needed
    if (!isAlreadyAudio) {
      try { fs.unlinkSync(audioPath) } catch { /* ignore */ }
    }

    // Upload to Replicate Files API — handles any file size, no base64 overhead
    const fileUrl = await uploadAudioToReplicate(audioBuf, token)
    if (!fileUrl) return null

    if (!fileUrl.startsWith('https://')) {
      throw new Error(`Invalid audio URL from Files API: ${fileUrl}`)
    }

    // `file` (Path type) accepts a URL — matches the official API docs example
    const input: Record<string, unknown> = { file: fileUrl }
    if (language?.trim()) input.language = language.trim()
    if (options?.numSpeakers && options.numSpeakers >= 1 && options.numSpeakers <= 50) input.num_speakers = options.numSpeakers
    // `prompt` acts as a hotwords list in this model — boosts accuracy for proper nouns / jargon
    if (options?.prompt?.trim()) input.prompt = options.prompt.trim().slice(0, 1500)

    // Community models require version in "owner/name:version_id" format; Prefer wait=N (1-60 s)
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        version: 'thomasmol/whisper-diarization:1495a9cddc83b2203b0d8d3516e38b80fd1572ebc4bc5700ac1da56a9b3ed886',
        input,
      }),
      signal: AbortSignal.timeout(70_000), // slightly over the 60 s server wait
    })

    if (!createRes.ok) {
      const body = await createRes.text()
      log.warn({ msg: 'replicate prediction create failed', status: createRes.status, body })
      return null
    }

    const pred = (await createRes.json()) as {
      id?: string
      urls?: { get: string }
      status?: string
      output?: { segments?: Array<{ start: unknown; end: unknown; text: unknown; speaker?: unknown }>; text?: unknown }
    }

    // Handle immediate result (fast predictions)
    if (pred.status === 'succeeded' && pred.output?.segments) {
      const segs = buildSegments(pred.output.segments)
      const text = typeof pred.output.text === 'string' ? pred.output.text : segs.map((s) => s.text).join(' ')
      return { text, segments: segs }
    }

    const getUrl = pred.urls?.get
    if (!getUrl) return null

    // Poll for up to 15 minutes — enough headroom for 2-hour videos (~10 min on A40 GPU)
    for (let i = 0; i < 900; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const statusRes = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      })
      const status = (await statusRes.json()) as {
        status: string
        output?: { segments?: Array<{ start: unknown; end: unknown; text: unknown; speaker?: unknown }>; text?: unknown }
      }

      if (status.status === 'succeeded' && status.output?.segments) {
        const segs = buildSegments(status.output.segments)
        const text = typeof status.output.text === 'string' ? status.output.text : segs.map((s) => s.text).join(' ')
        return { text, segments: segs }
      }

      if (status.status === 'failed' || status.status === 'canceled') {
        log.warn({ msg: 'replicate prediction ended', status: status.status })
        break
      }
    }

    return null
  } catch (err) {
    log.warn({ msg: 'diarization error', error: (err as Error)?.message ?? String(err) })
    if (!isAlreadyAudio) {
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * Build a map from raw Replicate speaker IDs (e.g. "SPEAKER_00") to display names.
 * Uses detected names where available, falls back to "Speaker 1", "Speaker 2", …
 */
function buildSpeakerMap(speakerIds: string[], detectedNames: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {}
  let fallbackIdx = 1
  for (const id of speakerIds) {
    const name = detectedNames[id]?.trim()
    map[id] = name || `Speaker ${fallbackIdx++}`
  }
  return map
}

function applyFallbackLabels(segments: DiarizedSegment[]): DiarizedSegment[] {
  const ids = [...new Set(segments.map((s) => s.speaker?.trim()).filter(Boolean))] as string[]
  const map = buildSpeakerMap(ids, {})
  return segments.map((s) => ({
    ...s,
    speaker: s.speaker ? (map[s.speaker.trim()] ?? s.speaker) : undefined,
  }))
}

// Patterns ordered from most explicit to least explicit.
// Each entry is [regex, captureGroupIndex] where the capture group holds the name.
const NAME_PATTERNS: Array<[RegExp, number]> = [
  // Self-introductions — explicit
  [/\bmy name is ([A-Z][a-z]+)/i, 1],
  [/\bi(?:'m| am) ([A-Z][a-z]+)/i, 1],
  [/\bthis is ([A-Z][a-z]+)\b/i, 1],
  [/\bmy name's ([A-Z][a-z]+)/i, 1],
  [/\bthey call me ([A-Z][a-z]+)/i, 1],
  [/\beveryone calls me ([A-Z][a-z]+)/i, 1],
  [/\bpeople call me ([A-Z][a-z]+)/i, 1],
  [/\byou can call me ([A-Z][a-z]+)/i, 1],
  [/\bi go by ([A-Z][a-z]+)/i, 1],
  // Host/interviewer introducing guest
  [/\bjoining (?:us|me) (?:today |now )?is ([A-Z][a-z]+)/i, 1],
  [/\bwelcome[,\s]+([A-Z][a-z]+)\b/i, 1],
  [/\bintroducing ([A-Z][a-z]+)\b/i, 1],
  [/\bour (?:guest|speaker) (?:today )?is ([A-Z][a-z]+)/i, 1],
  [/\bi(?:'d| would) like to (?:introduce|welcome) ([A-Z][a-z]+)/i, 1],
  [/\bplease welcome ([A-Z][a-z]+)/i, 1],
  // Direct address — speaker being addressed by another
  [/^([A-Z][a-z]+)[,!]\s/m, 1],
  [/\s([A-Z][a-z]+)[,!]\s/m, 1],
  [/\bthank you[,\s]+([A-Z][a-z]+)\b/i, 1],
  [/\bthanks[,\s]+([A-Z][a-z]+)\b/i, 1],
  [/\bover to you[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bback to you[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bwhat do you think[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bwhat(?:'s| is) your (?:take|view|opinion)[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bgreat point[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bgood point[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bexactly[,\s]+([A-Z][a-z]+)/i, 1],
  [/\bright[,\s]+([A-Z][a-z]+)[?.,]/i, 1],
  // Third-person references from another speaker
  [/\bas ([A-Z][a-z]+) (?:said|mentioned|pointed out|noted|explained)/i, 1],
  [/\baccording to ([A-Z][a-z]+)\b/i, 1],
  [/\b([A-Z][a-z]+) (?:said|mentioned|pointed out|noted|explained|told us|was saying)/i, 1],
  [/\b([A-Z][a-z]+)'s (?:point|question|idea|comment|thought)\b/i, 1],
]

// Common English words that are capitalized and could be falsely matched as names
const FALSE_POSITIVE_NAMES = new Set([
  'I', 'The', 'A', 'An', 'And', 'But', 'Or', 'So', 'As', 'At', 'By', 'In', 'Of', 'On',
  'To', 'Up', 'It', 'He', 'She', 'We', 'You', 'My', 'Hi', 'Hey', 'Oh', 'Ok', 'Okay',
  'Yes', 'No', 'Not', 'Now', 'Just', 'Very', 'Well', 'Good', 'Great', 'Right', 'Sure',
  'This', 'That', 'These', 'Those', 'Here', 'There', 'When', 'Where', 'What', 'How',
  'Who', 'Why', 'All', 'Any', 'Some', 'Our', 'Your', 'Their', 'Its', 'Us', 'Me',
  'Also', 'Even', 'Still', 'Then', 'Than', 'Both', 'Each', 'Few', 'More', 'Most',
  'Other', 'Such', 'Into', 'Over', 'After', 'Before', 'Above', 'Below', 'Between',
  'Today', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'June', 'July', 'August', 'September',
  'October', 'November', 'December',
])

function extractNameFromText(text: string): string | null {
  for (const [pattern, group] of NAME_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const candidate = m[group]
      if (candidate && !FALSE_POSITIVE_NAMES.has(candidate) && candidate.length >= 2) {
        return candidate
      }
    }
  }
  return null
}

/**
 * Identify real speaker names from transcript content using regex pattern matching.
 * Scans each speaker's lines for introductions, direct address, and third-person references.
 * Falls back to "Speaker 1", "Speaker 2", … for any unidentified speaker.
 */
export function resolveSpeakerNames(segments: DiarizedSegment[]): DiarizedSegment[] {
  const speakerIds = [...new Set(segments.map((s) => s.speaker?.trim()).filter(Boolean))] as string[]
  if (speakerIds.length === 0) return applyFallbackLabels(segments)

  const detected: Record<string, string> = {}

  for (const id of speakerIds) {
    // Lines said BY this speaker
    const ownLines = segments.filter((s) => s.speaker?.trim() === id).map((s) => s.text)
    for (const line of ownLines) {
      const name = extractNameFromText(line)
      if (name) { detected[id] = name; break }
    }
    if (detected[id]) continue

    // Lines said BY OTHER speakers that may address or mention this speaker
    const otherLines = segments.filter((s) => s.speaker?.trim() !== id).map((s) => s.text)
    for (const line of otherLines) {
      const name = extractNameFromText(line)
      if (name) { detected[id] = name; break }
    }
  }

  const map = buildSpeakerMap(speakerIds, detected)
  return segments.map((s) => ({
    ...s,
    speaker: s.speaker ? (map[s.speaker.trim()] ?? s.speaker) : undefined,
  }))
}
