import WebSocket, { WebSocketServer } from 'ws'
import type { RawData } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import { DeepgramClient } from '@deepgram/sdk'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

/** Shape we care about from Deepgram's Results message */
interface DeepgramResult {
  type: string
  is_final?: boolean
  speech_final?: boolean
  channel?: {
    alternatives?: Array<{ transcript: string; confidence: number }>
  }
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  const exact = new Set(['https://videotext.io', 'https://www.videotext.io'])
  if (exact.has(origin)) return true
  if (origin.endsWith('.vercel.app')) return true
  const envOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
  if (envOrigins.includes(origin)) return true
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

/**
 * Attach a WebSocket server to the existing HTTP server for live transcription.
 *
 * Client connects to: ws[s]://host/api/live-transcription?sample_rate=44100&language=en-US
 * - Sends raw linear16 PCM audio frames
 * - Receives JSON: { type: 'ready' } | { type: 'transcript', text, is_final, speech_final } | { type: 'error', message }
 *
 * Requires DEEPGRAM_API_KEY environment variable. Silently skips setup if absent.
 */
export function attachLiveTranscription(server: Server): void {
  const wss = new WebSocketServer({ noServer: true })

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

    const url = new URL(req.url!, 'http://localhost')
    const rawRate = parseInt(url.searchParams.get('sample_rate') ?? '44100', 10)
    const sampleRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 44100
    const language = url.searchParams.get('language') ?? 'en-US'

    log.info({ msg: '[live-transcription] session started', sampleRate, language })

    let deepgramOpen = false

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
        endpointing: 300,
        utterance_end_ms: '1000' as never,
        Authorization: `Token ${apiKey}`,
      })

      dgSocket.on('open', () => {
        deepgramOpen = true
        log.info({ msg: '[live-transcription] Deepgram WebSocket open' })
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ready' }))
        }
      })

      dgSocket.on('message', (data) => {
        const result = data as DeepgramResult
        if (result.type !== 'Results') return
        const transcript = result.channel?.alternatives?.[0]?.transcript
        if (!transcript) return
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(
          JSON.stringify({
            type: 'transcript',
            text: transcript,
            is_final: result.is_final ?? false,
            speech_final: result.speech_final ?? false,
          })
        )
      })

      dgSocket.on('error', (err) => {
        log.warn({ msg: '[live-transcription] Deepgram error', error: err.message })
      })

      dgSocket.on('close', () => {
        deepgramOpen = false
        log.info({ msg: '[live-transcription] Deepgram session closed' })
      })

      // Forward raw PCM audio from client → Deepgram
      ws.on('message', (data: RawData) => {
        if (!deepgramOpen) return
        try {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
          dgSocket.sendMedia(buf)
        } catch (err) {
          log.warn({ msg: '[live-transcription] audio forward error', error: String(err) })
        }
      })

      ws.on('close', () => {
        log.info({ msg: '[live-transcription] client disconnected' })
        try { dgSocket.close() } catch { /* ignore */ }
      })

      ws.on('error', (err) => {
        log.warn({ msg: '[live-transcription] WS client error', error: err.message })
        try { dgSocket.close() } catch { /* ignore */ }
      })
    } catch (err) {
      log.error({ msg: '[live-transcription] failed to create Deepgram session', error: String(err) })
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to start live transcription' }))
        ws.close(1011, 'Setup failed')
      }
    }
  })

  log.info({ msg: '[live-transcription] WebSocket server attached' })
}
