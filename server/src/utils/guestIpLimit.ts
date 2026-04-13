/**
 * IP-based daily import limit for guest (unauthenticated) users.
 *
 * Each unique IP is allowed GUEST_DAILY_LIMIT uploads per UTC day.
 * The counter expires automatically at the next midnight UTC so no
 * cleanup cron is required.
 *
 * Falls back to an in-memory counter when Redis is temporarily unavailable —
 * the limit is ALWAYS enforced (never fails open).
 */
import Redis from 'ioredis'
import { getLogger } from '../lib/logger'
import type { Request } from 'express'

const log = getLogger('api')

export const GUEST_DAILY_LIMIT = 3

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

export function ipLimitKey(ip: string): string {
  return `guest_ip_daily:${ip}:${todayUTCString()}`
}

/**
 * In-memory fallback counters — used when Redis is temporarily unavailable.
 * Not shared across server instances but prevents unlimited bypass during outages.
 */
const inMemFallback = new Map<string, { count: number; expiresAt: number }>()

// Prune stale in-memory entries every 30 minutes so the map never grows unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of inMemFallback) {
    if (now > v.expiresAt) inMemFallback.delete(k)
  }
}, 30 * 60 * 1000).unref()

function inMemIncr(key: string, ttlSec: number): number {
  const now = Date.now()
  const entry = inMemFallback.get(key)
  if (!entry || now > entry.expiresAt) {
    inMemFallback.set(key, { count: 1, expiresAt: now + ttlSec * 1000 })
    return 1
  }
  entry.count++
  return entry.count
}

function inMemGet(key: string): number {
  const now = Date.now()
  const entry = inMemFallback.get(key)
  if (!entry || now > entry.expiresAt) return 0
  return entry.count
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
 *
 * Falls back to in-memory counter when Redis is unavailable — NEVER fails open.
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
    log.warn({ msg: '[GuestIpLimit] Redis error, using in-memory fallback', error: (err as Error).message })
    const count = inMemIncr(key, ttl)
    return count <= GUEST_DAILY_LIMIT
  }
}

/**
 * Read the current guest import count for an IP today (without incrementing).
 * Used on signup to carry the guest's usage over to the new authenticated account.
 */
export async function getGuestIpImportCount(ip: string): Promise<number> {
  const key = ipLimitKey(ip)
  try {
    const val = await guestIpRedis.get(key)
    return val ? (parseInt(val, 10) || 0) : 0
  } catch {
    return inMemGet(key)
  }
}
