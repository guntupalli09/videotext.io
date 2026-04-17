import Redis from 'ioredis'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

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
  log.warn({ msg: 'yt_proxy_pool_redis_error', error: err.message })
})

const FAIL_THRESHOLD = Math.max(2, parseInt(process.env.YT_PROXY_FAIL_THRESHOLD || '3', 10))
const COOLDOWN_MIN = Math.max(1, parseInt(process.env.YT_PROXY_COOLDOWN_MINUTES || '10', 10))
const POOL_DEGRADED_HEALTHY_RATIO = Math.max(0.05, Math.min(0.9, Number(process.env.YT_PROXY_POOL_MIN_HEALTHY_RATIO || '0.25')))
const POOL_DEGRADED_TTL_MS = Math.max(60_000, parseInt(process.env.YT_PROXY_POOL_DEGRADED_TTL_MS || '300000', 10))
const GLOBAL_DISABLE_RATE_WINDOW = Math.max(20, parseInt(process.env.YT_PROXY_GLOBAL_DISABLE_WINDOW || '60', 10))
const GLOBAL_DISABLE_MIN_SUCCESS_RATE = Math.max(0.3, Math.min(0.95, Number(process.env.YT_PROXY_GLOBAL_DISABLE_MIN_SUCCESS_RATE || '0.7')))
const GLOBAL_DISABLE_TTL_MS = Math.min(5 * 60_000, Math.max(2 * 60_000, parseInt(process.env.YT_PROXY_GLOBAL_DISABLE_TTL_MS || '180000', 10)))
const GLOBAL_DISABLE_MIN_SAMPLE = Math.max(20, parseInt(process.env.YT_PROXY_GLOBAL_DISABLE_MIN_SAMPLE || '20', 10))
const GLOBAL_DISABLE_DECAY = Math.max(0.75, Math.min(0.99, Number(process.env.YT_PROXY_GLOBAL_DISABLE_DECAY || '0.92')))

export interface ProxyEndpoint {
  id: string
  url: string
}

export interface ProxySelection {
  id: string
  url: string
  degraded: boolean
}

function parseProxyPool(): ProxyEndpoint[] {
  const raw = process.env.YOUTUBE_PROXY_POOL?.trim()
  if (raw) {
    return raw
      .split(',')
      .map((entry, idx) => {
        const [left, ...rest] = entry.split('=')
        if (!rest.length) return { id: `proxy_${idx + 1}`, url: left.trim() }
        return { id: left.trim(), url: rest.join('=').trim() }
      })
      .filter((p) => p.id && p.url)
  }
  const single = process.env.YOUTUBE_PROXY?.trim()
  return single ? [{ id: 'proxy_default', url: single }] : []
}

function keyStats(proxyId: string): string {
  return `yt_proxy:${proxyId}:stats`
}

function keyCooldown(proxyId: string): string {
  return `yt_proxy:${proxyId}:cooldown_until`
}

function keyPointer(): string {
  return 'yt_proxy:rr_pointer'
}

function keyPoolDegraded(): string {
  return 'yt_proxy:pool_degraded_until'
}

function keyGlobalDisable(): string {
  return 'yt_proxy:global_disabled_until'
}

function keyRollingResults(): string {
  return 'yt_proxy:rolling_results'
}

async function proxyHealth(proxyId: string): Promise<{ success: number; failure: number; cooldownUntil: number }> {
  try {
    const [stats, cooldownRaw] = await Promise.all([
      redis.hgetall(keyStats(proxyId)),
      redis.get(keyCooldown(proxyId)),
    ])
    return {
      success: Number(stats.success || 0),
      failure: Number(stats.failure || 0),
      cooldownUntil: Number(cooldownRaw || 0),
    }
  } catch {
    return { success: 0, failure: 0, cooldownUntil: 0 }
  }
}

function scoreHealth(success: number, failure: number): number {
  const total = success + failure
  if (total === 0) return 0.6
  const successRate = success / total
  const penalty = Math.min(0.6, failure * 0.05)
  return successRate - penalty
}

export async function selectYoutubeProxy(): Promise<ProxySelection | null> {
  try {
    const pool = parseProxyPool()
    if (pool.length === 0) return null

    const now = Date.now()
    const globalDisabledUntil = Number(await redis.get(keyGlobalDisable()).catch(() => '0') || 0)
    if (globalDisabledUntil > now) return null
    if (globalDisabledUntil > 0 && globalDisabledUntil <= now) {
      await redis.del(keyGlobalDisable()).catch(() => {})
      log.info({ msg: 'proxy_reenabled', at: now })
    }
    const poolDegradedUntil = Number(await redis.get(keyPoolDegraded()).catch(() => '0') || 0)
    if (poolDegradedUntil > now) return null

    const states = await Promise.all(pool.map(async (p) => ({ p, h: await proxyHealth(p.id) })))
    const healthy = states.filter((s) => s.h.cooldownUntil <= now)
    const healthyRatio = healthy.length / Math.max(1, states.length)
    if (healthyRatio < POOL_DEGRADED_HEALTHY_RATIO) {
      const degradedUntil = now + POOL_DEGRADED_TTL_MS
      await redis.set(keyPoolDegraded(), String(degradedUntil), 'PX', POOL_DEGRADED_TTL_MS).catch(() => {})
      log.error({ msg: 'yt_proxy_pool_degraded', healthy: healthy.length, total: states.length, healthyRatio, degradedUntil })
      return null
    }
    const candidates = healthy.length > 0 ? healthy : states
    if (candidates.length === 0) return null

    candidates.sort((a, b) => {
      const sa = scoreHealth(a.h.success, a.h.failure)
      const sb = scoreHealth(b.h.success, b.h.failure)
      return sb - sa
    })

    const topScore = scoreHealth(candidates[0].h.success, candidates[0].h.failure)
    const topBucket = candidates.filter((c) => scoreHealth(c.h.success, c.h.failure) >= topScore - 0.05)
    const idxRaw = await redis.incr(keyPointer()).catch(() => Math.floor(Math.random() * 10000))
    const chosen = topBucket[idxRaw % topBucket.length]

    return {
      id: chosen.p.id,
      url: chosen.p.url,
      degraded: healthy.length === 0,
    }
  } catch (err) {
    log.warn({ msg: 'yt_proxy_select_fallback_no_redis', error: (err as Error).message })
    return null
  }
}

export async function recordYoutubeProxyResult(proxyId: string, success: boolean): Promise<void> {
  const statsKey = keyStats(proxyId)
  const cooldownKey = keyCooldown(proxyId)
  const now = Date.now()
  try {
    await redis
      .multi()
      .lpush(keyRollingResults(), success ? '1' : '0')
      .ltrim(keyRollingResults(), 0, GLOBAL_DISABLE_RATE_WINDOW - 1)
      .expire(keyRollingResults(), 24 * 60 * 60)
      .exec()
    const rolling = await redis.lrange(keyRollingResults(), 0, GLOBAL_DISABLE_RATE_WINDOW - 1)
    const totalRolling = rolling.length
    if (totalRolling >= GLOBAL_DISABLE_MIN_SAMPLE) {
      let weightedSuccess = 0
      let weightedTotal = 0
      for (let i = 0; i < rolling.length; i++) {
        const weight = Math.pow(GLOBAL_DISABLE_DECAY, i)
        weightedTotal += weight
        if (rolling[i] === '1') weightedSuccess += weight
      }
      const successRate = weightedTotal > 0 ? weightedSuccess / weightedTotal : 0
      if (successRate < GLOBAL_DISABLE_MIN_SUCCESS_RATE) {
        const disabledUntil = now + GLOBAL_DISABLE_TTL_MS
        await redis.set(keyGlobalDisable(), String(disabledUntil), 'PX', GLOBAL_DISABLE_TTL_MS)
        log.error({ msg: 'proxy_globally_disabled', successRate, weighted: true, totalRolling, threshold: GLOBAL_DISABLE_MIN_SUCCESS_RATE, disabledUntil })
      }
    }

    if (success) {
      await redis
        .multi()
        .hincrby(statsKey, 'success', 1)
        .hset(statsKey, 'last_success_ts', String(now))
        .hset(statsKey, 'consecutive_failure', '0')
        .expire(statsKey, 14 * 24 * 60 * 60)
        .del(cooldownKey)
        .exec()
      return
    }

    const nextFailure = await redis.hincrby(statsKey, 'consecutive_failure', 1)
    await redis
      .multi()
      .hincrby(statsKey, 'failure', 1)
      .hset(statsKey, 'last_failure_ts', String(now))
      .expire(statsKey, 14 * 24 * 60 * 60)
      .exec()

    if (nextFailure >= FAIL_THRESHOLD) {
      const cooldownUntil = now + COOLDOWN_MIN * 60 * 1000
      await redis.set(cooldownKey, String(cooldownUntil), 'PX', COOLDOWN_MIN * 60 * 1000)
      log.warn({ msg: 'yt_proxy_marked_unhealthy', proxyId, nextFailure, cooldownUntil })
    }
  } catch {
    /* fail-open */
  }
}

export async function isProxyPoolDegraded(): Promise<boolean> {
  try {
    const globalDisabledUntil = Number(await redis.get(keyGlobalDisable()).catch(() => '0') || 0)
    if (globalDisabledUntil > Date.now()) return true
    const until = Number(await redis.get(keyPoolDegraded()).catch(() => '0') || 0)
    return until > Date.now()
  } catch {
    return false
  }
}

export async function resetProxyPoolState(): Promise<void> {
  try {
    const pool = parseProxyPool()
    if (pool.length === 0) return
    const keys = [keyPointer(), keyPoolDegraded(), keyGlobalDisable(), keyRollingResults(), ...pool.map((p) => keyCooldown(p.id))]
    await redis.del(...keys).catch(() => {})
  } catch {
    /* no-op */
  }
}
