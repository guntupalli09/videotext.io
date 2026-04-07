/**
 * IP-based daily import limit for guest (unauthenticated) users.
 *
 * Each unique IP is allowed GUEST_DAILY_LIMIT uploads per UTC day.
 * The counter expires automatically at the next midnight UTC so no
 * cleanup cron is required.
 *
 * Fails open (returns true) when Redis is unavailable so an outage
 * never blocks all uploads.
 */
import Redis from 'ioredis'
import { getLogger } from '../lib/logger'
import type { Request } from 'express'

const log = getLogger('api')

const GUEST_DAILY_LIMIT = 3

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const guestIpRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})
guestIpRedis.on('error', (err) =>
  log.error({ msg: '[GuestIpLimit Redis] connection error', error: err.message })
)

/** Seconds until next midnight UTC — used as TTL for the Redis key. */
function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  )
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 1000))
}

function todayUTCString(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function ipLimitKey(ip: string): string {
  return `guest_ip_daily:${ip}:${todayUTCString()}`
}

/**
 * Extract the real client IP, honouring X-Forwarded-For from trusted proxies.
 * Strips IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4) for consistent keying.
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  let ip: string
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(',')[0]
      .trim()
    ip = first || req.ip || 'unknown'
  } else {
    ip = req.ip || 'unknown'
  }
  // Normalise IPv6-mapped IPv4
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  return ip
}

/**
 * Increment the guest IP counter for today.
 * Returns true if the upload is allowed (counter ≤ limit after increment).
 * Returns false if the daily limit has been reached.
 */
export async function checkAndRecordGuestIpImport(ip: string): Promise<boolean> {
  const key = ipLimitKey(ip)
  const ttl = secondsUntilMidnightUTC()
  try {
    const pipeline = guestIpRedis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, ttl)
    const results = await pipeline.exec()
    const count = (results?.[0]?.[1] as number) ?? 1
    return count <= GUEST_DAILY_LIMIT
  } catch (err) {
    log.warn({ msg: '[GuestIpLimit] Redis error, failing open', error: (err as Error).message })
    return true
  }
}
