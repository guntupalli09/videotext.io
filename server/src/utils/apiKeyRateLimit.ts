/**
 * Per-API-key rate limiting for /api/v1.
 *
 * Zapier (and other external clients) share outbound IP ranges across many
 * customers, so IP-based limiting (the existing global `generalLimiter`) is
 * the wrong unit for external API traffic — one heavy integration could
 * throttle every other Zapier user. This limits by ApiKey.id instead, using
 * the same Redis sorted-set technique as utils/uploadRateLimit.ts, so one
 * key's usage never affects another key's quota or first-party web traffic.
 */
import Redis from 'ioredis'
import { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { sendApiError } from './apiErrors'

const rlLog = getLogger('api').child({ module: 'api-key-rate-limit' })

const WINDOW_MS = 60 * 1000
/** Configurable rather than a magic number scattered across routes. */
const MAX_REQUESTS_PER_WINDOW = Math.max(
  1,
  parseInt(process.env.API_V1_RATE_LIMIT_PER_MIN || '', 10) || 60
)

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const rlRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})
rlRedis.on('error', (err) => rlLog.error({ msg: '[ApiKeyRateLimit Redis] connection error', error: err.message }))

function rlKey(apiKeyId: string): string {
  return `api_v1_rl:${apiKeyId}`
}

interface RateLimitCheck {
  allowed: boolean
  retryAfterSeconds: number
}

/**
 * Returns whether the request is allowed and records the attempt.
 * Fails open if Redis is unavailable so an outage doesn't block all API traffic.
 */
export async function checkApiKeyRateLimit(apiKeyId: string): Promise<RateLimitCheck> {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const key = rlKey(apiKeyId)

  try {
    const pipeline = rlRedis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.pexpire(key, WINDOW_MS * 2)

    const results = await pipeline.exec()
    const countBeforeAdd = (results?.[1]?.[1] as number) ?? 0
    return {
      allowed: countBeforeAdd < MAX_REQUESTS_PER_WINDOW,
      retryAfterSeconds: 60,
    }
  } catch (err) {
    rlLog.warn({ msg: '[ApiKeyRateLimit] Redis error, failing open', error: (err as Error).message })
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

/** Express middleware form — expects req.apiKeyRecord to already be set (run after key resolution). */
export async function apiKeyRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKeyId = req.apiKeyRecord?.id
  if (!apiKeyId) return next()

  const check = await checkApiKeyRateLimit(apiKeyId)
  if (!check.allowed) {
    sendApiError(res, 'RATE_LIMITED', 'Too many requests for this API key. Please slow down.', {
      req,
      headers: { 'Retry-After': String(check.retryAfterSeconds) },
    })
    return
  }
  next()
}
