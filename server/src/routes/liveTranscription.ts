import WebSocket, { WebSocketServer } from 'ws'
import type { RawData } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import { DeepgramClient } from '@deepgram/sdk'
import { getLogger } from '../lib/logger'
import { verifyAuthToken } from '../utils/auth'

const log = getLogger('api')

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionState {
  startTime: number
  lastFinalText: string   // deduplication: skip repeated identical finals
}

interface DeepgramResult {
  type: string
  is_final?: boolean
  speech_final?: boolean
  channel?: {
    alternatives?: Array<{
      transcript: string
      confidence: number
      words?: Array<{ word: string; start: number; end: number; speaker?: number }>
    }>
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Usage cap in seconds per session, keyed by plan. */
const SESSION_CAP_SECONDS: Record<string, number> = {
  anon: 600,      // 10 min (unauthenticated)
  free: 600,      // 10 min
  pro: 3600,      // 60 min
  agency: 3600,   // 60 min
  lifetime: 3600, // 60 min
}

function getSessionCap(plan: string): number {
  return SESSION_CAP_SECONDS[plan] ?? 600
}

/** In-memory registry of active sessions (trimmed on session close). */
const activeSessions = new Map<string, SessionState>()

// ── Helpers ──────────────────────────────────────────────────────────────────

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  const exact = new Set(['https://videotext.io', 'https://www.videotext.io'])
  if (exact.has(origin)) return true
  if (origin.endsWith('.vercel.app')) return true
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (envOrigins.includes(origin)) return true
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

/**
 * Extract the dominant speaker index from Deepgram word-level diarization.
 * Returns the speaker number that appears most frequently in the utterance.
 */
function getDominantSpeaker(
  words?: Array<{ speaker?: number }>
): number | undefined {
  if (!words?.length) return undefined
  const counts = new Map<number, number>()
  for (const w of words) {
    if (w.speaker != null) counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1)
  }
  if (!counts.size) return undefined
  let top = 0
  let topCount = 0
  for (const [spk, cnt] of counts) {
    if (cnt > topCount) { topCount = cnt; top = spk }
  }
  return top
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Attach a WebSocket server to the existing HTTP server for live transcription.
 *
 * Client connects to: ws[s]://host/api/live-transcription
 *   ?sample_rate=44100
 *   &session_id=<uuid>      (for reconnect continuity on the client side)
 *   &language=en-US         (optional, defaults to en-US)
 *   &token=<jwt>            (optional, enables paid-plan caps)
 *
 * Protocol (client → server):  raw linear16 PCM audio frames (ArrayBuffer)
 * Protocol (server → client):  JSON messages —
 *   { type: 'ready' }
 *   { type: 'transcript', text, is_final, speech_final, speaker? }
 *   { type: 'error', message }
 *
 * Requires DEEPGRAM_API_KEY environment variable. No-ops gracefully if absent.
 */
export function attachLiveTranscription(server: Server): void {
  const wss = new WebSocketServer({ noServer: true })

  // Intercept HTTP → WebSocket upgrade for our path only
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!request.url?.startsWith('/api/live-transcription')) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    if (!isAllowedOrigin(request.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Live transcription not configured' }))
        ws.close(1011, 'Not configured')
      }
      return
    }

    // ── Parse connection parameters ──────────────────────────────────────────
    const url = new URL(req.url!, 'http://localhost')
    const rawRate = parseInt(url.searchParams.get('sample_rate') ?? '44100', 10)
    const sampleRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 44100
    const language = url.searchParams.get('language') ?? 'en-US'
    const sessionId = url.searchParams.get('session_id') ?? `${Date.now()}-${Math.random()}`
    const tokenParam = url.searchParams.get('token')

    // Determine plan for usage cap
    let plan = 'anon'
    if (tokenParam) {
      const auth = verifyAuthToken(tokenParam)
      if (auth?.plan) plan = auth.plan
    }
    const capSeconds = getSessionCap(plan)

    const session: SessionState = { startTime: Date.now(), lastFinalText: '' }
    activeSessions.set(sessionId, session)

    log.info({ msg: '[live] session started', sessionId, sampleRate, language, plan, capSeconds })

    // ── State ────────────────────────────────────────────────────────────────
    let deepgramOpen = false
    let keepAliveTimer: ReturnType<typeof setInterval> | null = null
    let capCheckTimer: ReturnType<typeof setInterval> | null = null

    function cleanup() {
      if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
      if (capCheckTimer) { clearInterval(capCheckTimer); capCheckTimer = null }
      activeSessions.delete(sessionId)
    }

    // ── Deepgram session ─────────────────────────────────────────────────────
    try {
      const deepgram = new DeepgramClient({ apiKey })

      const dgSocket = await deepgram.listen.v1.connect({
        model: 'nova-2',
        language: language as never,
        encoding: 'linear16' as never,
        sample_rate: sampleRate,
        channels: 1,
        punctuate: 'true' as never,
        smart_format: 'true' as never,
        interim_results: 'true' as never,
        diarize: 'true' as never,            // speaker detection
        endpointing: 500,                    // 500ms — handles varied speech pace better than 300ms
        utterance_end_ms: '1500' as never,  // sentence boundary detection
        Authorization: `Token ${apiKey}`,
      })

      dgSocket.on('open', () => {
        deepgramOpen = true
        log.info({ msg: '[live] Deepgram open', sessionId })

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ready' }))
        }

        // Keep-alive: prevent Deepgram from timing out during silence (>10s gap)
        keepAliveTimer = setInterval(() => {
          if (!deepgramOpen) return
          try { dgSocket.sendKeepAlive({ type: 'KeepAlive' }) } catch { /* ignore */ }
        }, 8_000)

        // Usage cap: check elapsed time every 10s
        capCheckTimer = setInterval(() => {
          const elapsed = (Date.now() - session.startTime) / 1000
          if (elapsed < capSeconds) return
          log.info({ msg: '[live] cap reached', sessionId, elapsed, capSeconds, plan })
          if (ws.readyState === WebSocket.OPEN) {
            const isPaid = plan !== 'anon' && plan !== 'free'
            ws.send(
              JSON.stringify({
                type: 'error',
                message: isPaid
                  ? 'Session limit reached (60 min).'
                  : 'Session limit reached (10 min). Upgrade to Pro for unlimited live transcription.',
              })
            )
            ws.close(1000, 'Cap reached')
          }
        }, 10_000)
      })

      dgSocket.on('message', (data) => {
        const result = data as DeepgramResult
        if (result.type !== 'Results') return

        const alt = result.channel?.alternatives?.[0]
        if (!alt?.transcript) return
        if (ws.readyState !== WebSocket.OPEN) return

        // Deduplicate: Deepgram can re-emit the same final text (e.g., after Finalize)
        if (result.is_final) {
          if (alt.transcript === session.lastFinalText) return
          session.lastFinalText = alt.transcript
        }

        const speaker = getDominantSpeaker(alt.words)

        ws.send(
          JSON.stringify({
            type: 'transcript',
            text: alt.transcript,
            is_final: result.is_final ?? false,
            speech_final: result.speech_final ?? false,
            speaker,  // undefined when diarization hasn't assigned speakers yet
          })
        )
      })

      dgSocket.on('error', (err) => {
        log.warn({ msg: '[live] Deepgram error', sessionId, error: err.message })
      })

      dgSocket.on('close', () => {
        deepgramOpen = false
        cleanup()
        log.info({ msg: '[live] Deepgram closed', sessionId })
      })

      // Forward raw PCM audio from browser → Deepgram
      ws.on('message', (rawData: RawData) => {
        if (!deepgramOpen) return
        try {
          const buf = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer)
          dgSocket.sendMedia(buf)
        } catch (err) {
          log.warn({ msg: '[live] audio fwd error', error: String(err) })
        }
      })

      ws.on('close', () => {
        log.info({ msg: '[live] client disconnected', sessionId })
        cleanup()
        try { dgSocket.close() } catch { /* ignore */ }
      })

      ws.on('error', (err) => {
        log.warn({ msg: '[live] WS error', sessionId, error: err.message })
        cleanup()
        try { dgSocket.close() } catch { /* ignore */ }
      })
    } catch (err) {
      cleanup()
      log.error({ msg: '[live] setup failed', error: String(err) })
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to start live transcription' }))
        ws.close(1011, 'Setup failed')
      }
    }
  })

  log.info({ msg: '[live] WebSocket server attached' })
}
