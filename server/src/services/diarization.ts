import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
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
 * Returns a temporary URL (valid 24 h) that Replicate models accept as `file_url`.
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
      log.warn({ msg: 'replicate file upload failed', status: res.status })
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
      log.warn({ msg: 'replicate prediction create failed', status: createRes.status })
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

/**
 * After diarization, attempt to identify real speaker names from the transcript content.
 *
 * Looks for:
 *   - Self-introductions: "I'm Max", "My name is Alex"
 *   - Direct address:     "Thank you, Max", "Alex, what do you think?"
 *   - Third-person refs:  "As Alex mentioned…"
 *
 * Returns segments with real names substituted where found (e.g. "Max", "Alex").
 * Falls back to "Speaker 1", "Speaker 2", … for any speaker whose name cannot be determined.
 *
 * Requires OPENAI_API_KEY. If unavailable or the GPT call fails, falls back gracefully.
 */
export async function resolveSpeakerNames(segments: DiarizedSegment[]): Promise<DiarizedSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) return applyFallbackLabels(segments)

  const speakerIds = [...new Set(segments.map((s) => s.speaker?.trim()).filter(Boolean))] as string[]
  if (speakerIds.length === 0) return applyFallbackLabels(segments)

  // Sample the first ~120 segments (enough to catch introductions without burning tokens)
  const sample = segments
    .slice(0, 120)
    .map((s) => `[${s.speaker ?? 'UNKNOWN'}] ${s.text.trim()}`)
    .join('\n')
    .slice(0, 4000)

  try {
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'You identify speaker names from transcript excerpts. ' +
            'Look for self-introductions ("I\'m Max", "my name is Alex"), ' +
            'direct address ("Thank you, Max", "Alex, what do you think?"), ' +
            'and third-person references ("As Alex said"). ' +
            'Return ONLY a JSON object mapping speaker IDs to first names, ' +
            'e.g. {"SPEAKER_00":"Max","SPEAKER_01":"Alex"}. ' +
            'If a speaker cannot be identified, omit them. If no names are found at all, return {}.',
        },
        {
          role: 'user',
          content: `Speaker IDs present: ${speakerIds.join(', ')}\n\nTranscript excerpt:\n${sample}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
    // Safely extract JSON even if GPT wraps it in a markdown code block
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const detected: Record<string, string> = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    const map = buildSpeakerMap(speakerIds, detected)
    return segments.map((s) => ({
      ...s,
      speaker: s.speaker ? (map[s.speaker.trim()] ?? s.speaker) : undefined,
    }))
  } catch (err) {
    log.warn({ msg: 'speaker name resolution error', error: (err as Error)?.message ?? String(err) })
    return applyFallbackLabels(segments)
  }
}
