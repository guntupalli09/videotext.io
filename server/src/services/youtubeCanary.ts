import { getLogger } from '../lib/logger'
import { fetchYoutubeCaptions, getYoutubeMetadata, streamYoutubeAudioToFile, type YoutubeAttemptRecord } from './youtube'
import Redis from 'ioredis'
import fs from 'fs'

const log = getLogger('api')
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})
redis.on('error', (err) => {
  log.warn({ msg: 'yt_canary_redis_error', error: err.message })
})

interface CanaryCase {
  id: string
  videoId: string
  expected: 'captions' | 'audio' | 'blocked'
}

function parseCanaryCases(): CanaryCase[] {
  const env = process.env.YOUTUBE_CANARY_CASES?.trim()
  if (env) {
    return env
      .split(',')
      .map((part) => {
        const [id, videoId, expected] = part.split(':')
        return { id, videoId, expected: (expected || 'captions') as CanaryCase['expected'] }
      })
      .filter((c) => c.id && c.videoId)
  }
  return []
}

let lastRunDay = ''

export async function maybeRunYoutubeCanary(): Promise<void> {
  const enabled = process.env.YOUTUBE_CANARY_ENABLED === 'true'
  if (!enabled) return

  const today = new Date().toISOString().slice(0, 10)
  if (today === lastRunDay) return

  const lockKey = `yt_canary:daily_lock:${today}`
  const lockTtlMs = 26 * 60 * 60 * 1000
  const lock = await redis.set(lockKey, String(process.pid), 'PX', lockTtlMs, 'NX').catch(() => null)
  if (lock !== 'OK') {
    log.info({ msg: 'yt_canary_skipped_lock_not_acquired', date: today })
    return
  }

  const cases = parseCanaryCases()
  if (cases.length === 0) return

  lastRunDay = today
  const outputs: Array<Record<string, unknown>> = []

  for (const canary of cases) {
    const startedAt = Date.now()
    const attempts: YoutubeAttemptRecord[] = []
    let resolutionPath: string = 'audio_transcription'
    let errorCode: string | null = null
    let confidence = 0.5
    let tmpOut: string | null = null
    try {
      const url = `https://www.youtube.com/watch?v=${canary.videoId}`
      const meta = await getYoutubeMetadata(url)
      const capCollector = { attempts }
      const captions = await fetchYoutubeCaptions(url, '/tmp', 'en', meta.durationSec, meta.defaultLanguage, capCollector)
      if (captions && captions.segments.length > 0) {
        resolutionPath = 'captions'
        confidence = 0.9
      } else if (canary.expected !== 'blocked') {
        tmpOut = `/tmp/canary_${canary.id}_${Date.now()}.wav`
        const audioCollector = { attempts }
        await streamYoutubeAudioToFile(url, tmpOut, audioCollector)
        resolutionPath = 'audio_transcription'
        confidence = 0.72
      }
    } catch (err) {
      errorCode = (err as Error).message
      confidence = 0
      if (/region|geo|sign in|bot|403|429/i.test(errorCode)) resolutionPath = 'blocked'
    }

    outputs.push({
      id: canary.id,
      resolutionPath,
      latencyMs: Date.now() - startedAt,
      confidence,
      errorCode,
      attemptsCount: attempts.length,
      expected: canary.expected,
    })
    if (tmpOut) {
      try {
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
      } catch {
        /* ignore */
      }
    }
  }

  const successRate = outputs.filter((o) => o.errorCode === null).length / Math.max(outputs.length, 1)
  const fallbackRate = outputs.filter((o) => o.resolutionPath === 'audio_transcription').length / Math.max(outputs.length, 1)

  log.info({
    msg: 'yt_canary_daily_result',
    date: today,
    successRate,
    fallbackRate,
    outputs,
    regression: successRate < Number(process.env.YOUTUBE_CANARY_MIN_SUCCESS_RATE || '0.6') || fallbackRate > Number(process.env.YOUTUBE_CANARY_MAX_FALLBACK_RATE || '0.6'),
  })
}
