import Redis from 'ioredis'
import { randomUUID } from 'crypto'
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
  log.warn({ msg: 'yt_global_control_redis_error', error: err.message })
})

const HOLDER_KEY = 'yt_dlp_global_semaphore'
const DYNAMIC_MAX_KEY = 'yt_dlp_global_semaphore:max_permits_dynamic'
const MAX_PERMITS = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
const LEASE_MS = Math.max(10_000, parseInt(process.env.YT_DLP_SEMAPHORE_LEASE_MS || '90000', 10))
const ACQUIRE_TIMEOUT_MS = Math.max(0, parseInt(process.env.YT_DLP_SEMAPHORE_ACQUIRE_TIMEOUT_MS || '0', 10))
const LOCAL_EMERGENCY_CAP = Math.min(2, Math.max(1, parseInt(process.env.YT_DLP_LOCAL_EMERGENCY_CAP || '1', 10)))
let lastDegradedLogAt = 0

const acquireLua = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local lease_until = tonumber(ARGV[2])
local max_permits = tonumber(ARGV[3])
local token = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now)
local count = redis.call('ZCARD', key)
if count < max_permits then
  redis.call('ZADD', key, lease_until, token)
  redis.call('PEXPIRE', key, tonumber(ARGV[5]))
  return 1
end
return 0
`

const renewLua = `
local key = KEYS[1]
local token = ARGV[1]
local lease_until = tonumber(ARGV[2])
if redis.call('ZSCORE', key, token) then
  redis.call('ZADD', key, lease_until, token)
  return 1
end
return 0
`

export interface GlobalPermit {
  token: string
  release: () => Promise<void>
  isLeaseValid: () => boolean
}

class LocalEmergencySemaphore {
  private inUse = 0
  private queue: Array<() => void> = []
  constructor(private readonly max: number) {}
  async acquire(): Promise<() => void> {
    if (this.inUse < this.max) {
      this.inUse += 1
      return this.release.bind(this)
    }
    await new Promise<void>((resolve) => this.queue.push(resolve))
    this.inUse += 1
    return this.release.bind(this)
  }
  private release(): void {
    this.inUse = Math.max(0, this.inUse - 1)
    const next = this.queue.shift()
    if (next) next()
  }
}

const emergencySemaphore = new LocalEmergencySemaphore(LOCAL_EMERGENCY_CAP)
const DEGRADED_MODE = (process.env.YT_DLP_DEGRADED_MODE || 'fail_closed').toLowerCase()

async function tryAcquire(token: string): Promise<boolean> {
  const now = Date.now()
  const leaseUntil = now + LEASE_MS
  const pttl = LEASE_MS * 2
  const dynamicRaw = await redis.get(DYNAMIC_MAX_KEY)
  const dynamicCap = Number(dynamicRaw || MAX_PERMITS)
  const effectiveCap = Math.max(1, Math.min(MAX_PERMITS, dynamicCap))
  const res = await redis.eval(acquireLua, 1, HOLDER_KEY, now, leaseUntil, effectiveCap, token, pttl)
  return Number(res) === 1
}

async function renew(token: string): Promise<boolean> {
  const leaseUntil = Date.now() + LEASE_MS
  const res = await redis.eval(renewLua, 1, HOLDER_KEY, token, leaseUntil)
  return Number(res) === 1
}

async function releaseToken(token: string): Promise<void> {
  try {
    await redis.zrem(HOLDER_KEY, token)
  } catch {
    /* fail-open */
  }
}

export async function acquireGlobalYtDlpPermit(context: string): Promise<GlobalPermit> {
  const startedAt = Date.now()
  const token = `${process.pid}:${context}:${randomUUID()}`
  let attempt = 0
  const hasAcquireTimeout = ACQUIRE_TIMEOUT_MS > 0
  while (!hasAcquireTimeout || (Date.now() - startedAt < ACQUIRE_TIMEOUT_MS)) {
    attempt += 1
    try {
      const ok = await tryAcquire(token)
      if (ok) {
        let released = false
        let leaseValid = true
        const heartbeat = setInterval(async () => {
          try {
            const alive = await renew(token)
            if (!alive) {
              leaseValid = false
              log.warn({ msg: 'yt_global_semaphore_lease_lost', token })
            }
          } catch (err) {
            leaseValid = false
            log.warn({ msg: 'yt_global_semaphore_renew_failed', token, error: (err as Error).message })
          }
        }, Math.max(5_000, Math.floor(LEASE_MS / 3)))
        heartbeat.unref?.()
        return {
          token,
          isLeaseValid: () => leaseValid,
          release: async () => {
            if (released) return
            released = true
            clearInterval(heartbeat)
            await releaseToken(token)
          },
        }
      }
    } catch (err) {
      const now = Date.now()
      if (now - lastDegradedLogAt > 30_000) {
        lastDegradedLogAt = now
        log.error({
          msg: 'yt_global_semaphore_degraded_mode',
          context,
          localCap: LOCAL_EMERGENCY_CAP,
          mode: DEGRADED_MODE,
          reason: (err as Error).message,
        })
      }
      if (DEGRADED_MODE === 'local') {
        const localRelease = await emergencySemaphore.acquire()
        let released = false
        return {
          token: `local:${token}`,
          isLeaseValid: () => true,
          release: async () => {
            if (released) return
            released = true
            localRelease()
          },
        }
      }
    }

    const backoff = Math.min(500, 40 + attempt * 20) + Math.floor(Math.random() * 40)
    await new Promise((r) => setTimeout(r, backoff))
  }

  throw new Error('Global yt-dlp semaphore acquire timeout (set YT_DLP_SEMAPHORE_ACQUIRE_TIMEOUT_MS=0 for queue-based wait)')
}

export async function applyYtRequestPacing(): Promise<void> {
  const minMs = 80
  const maxMs = 500
  const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1))
  await new Promise((resolve) => setTimeout(resolve, delay))
}

export async function applyYtRequestPacingSeeded(seed?: string): Promise<void> {
  if (!seed) return applyYtRequestPacing()
  const minMs = 80
  const maxMs = 500
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
  }
  const base = Math.abs(hash) % (maxMs - minMs + 1)
  const jitter = Math.floor(Math.random() * 60)
  const delay = minMs + Math.min(maxMs - minMs, base + jitter)
  await new Promise((resolve) => setTimeout(resolve, delay))
}
