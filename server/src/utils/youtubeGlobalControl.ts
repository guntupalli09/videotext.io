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

const LEASE_SET_KEY = 'yt_dlp_global_semaphore:leases'
const LEASE_META_KEY = 'yt_dlp_global_semaphore:owners'
const DYNAMIC_MAX_KEY = 'yt_dlp_global_semaphore:max_permits_dynamic'
const MAX_PERMITS = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
const ALLOW_UNSAFE_TTL_FOR_TESTS = process.env.YT_DLP_SEMAPHORE_ALLOW_UNSAFE_TTL_FOR_TESTS === '1'
const MIN_SAFE_TTL_MS = ALLOW_UNSAFE_TTL_FOR_TESTS
  ? Math.max(1_000, parseInt(process.env.YT_DLP_SEMAPHORE_MIN_TTL_MS || '5000', 10))
  : Math.max(180_000, parseInt(process.env.YT_DLP_SEMAPHORE_MIN_TTL_MS || '180000', 10))
const DEFAULT_EXPECTED_JOB_MS = Math.max(90_000, parseInt(process.env.YT_DLP_SEMAPHORE_EXPECTED_JOB_MS || '90000', 10))
const ACQUIRE_TIMEOUT_MS = Math.max(0, parseInt(process.env.YT_DLP_SEMAPHORE_ACQUIRE_TIMEOUT_MS || '0', 10))
const LOCAL_EMERGENCY_CAP = Math.min(2, Math.max(1, parseInt(process.env.YT_DLP_LOCAL_EMERGENCY_CAP || '1', 10)))
const LEASE_LOSS_POLICY = (process.env.YT_DLP_LEASE_LOSS_POLICY || 'continue').toLowerCase()
const HEARTBEAT_MAX_INTERVAL_MS = Math.max(500, parseInt(process.env.YT_DLP_SEMAPHORE_HEARTBEAT_MAX_INTERVAL_MS || '60000', 10))
const WORKER_ID = process.env.WORKER_ID || process.env.HOSTNAME || `pid-${process.pid}`
let lastDegradedLogAt = 0

export const acquireLua = `
local leases_key = KEYS[1]
local owners_key = KEYS[2]
local now_ms = tonumber(ARGV[1])
local lease_until = tonumber(ARGV[2])
local max_permits = tonumber(ARGV[3])
local token = ARGV[4]
local owner = ARGV[5]
local lease_id = ARGV[6]
local job_id = ARGV[7]
local key_ttl_ms = tonumber(ARGV[8])

local expired_tokens = redis.call('ZRANGEBYSCORE', leases_key, '-inf', now_ms)
if #expired_tokens > 0 then
  redis.call('ZREMRANGEBYSCORE', leases_key, '-inf', now_ms)
  for _, expired_token in ipairs(expired_tokens) do
    redis.call('HDEL', owners_key, expired_token)
  end
end

local count = redis.call('ZCARD', leases_key)
if count < max_permits then
  redis.call('ZADD', leases_key, lease_until, token)
  redis.call('HSET', owners_key, token, owner .. '|' .. lease_id .. '|' .. job_id)
  redis.call('PEXPIRE', leases_key, key_ttl_ms)
  redis.call('PEXPIRE', owners_key, key_ttl_ms)
  return 1
end
return 0
`

export const renewLua = `
local leases_key = KEYS[1]
local owners_key = KEYS[2]
local token = ARGV[1]
local owner = ARGV[2]
local lease_id = ARGV[3]
local lease_until = tonumber(ARGV[4])
local key_ttl_ms = tonumber(ARGV[5])

local meta = redis.call('HGET', owners_key, token)
if not meta then
  return 0
end
local expected = owner .. '|' .. lease_id
if string.sub(meta, 1, string.len(expected)) ~= expected then
  return 0
end
if not redis.call('ZSCORE', leases_key, token) then
  redis.call('HDEL', owners_key, token)
  return 0
end
redis.call('ZADD', leases_key, lease_until, token)
redis.call('PEXPIRE', leases_key, key_ttl_ms)
redis.call('PEXPIRE', owners_key, key_ttl_ms)
return 1
`

export const releaseLua = `
local leases_key = KEYS[1]
local owners_key = KEYS[2]
local token = ARGV[1]
local owner = ARGV[2]
local lease_id = ARGV[3]

local meta = redis.call('HGET', owners_key, token)
if not meta then
  redis.call('ZREM', leases_key, token)
  return 1
end
local expected = owner .. '|' .. lease_id
if string.sub(meta, 1, string.len(expected)) ~= expected then
  return 0
end
redis.call('ZREM', leases_key, token)
redis.call('HDEL', owners_key, token)
return 1
`

interface RedisLike {
  get(key: string): Promise<string | null>
  eval(script: string, numberOfKeys: number, ...args: Array<string | number>): Promise<unknown>
}

export interface PermitAcquireOptions {
  context: string
  jobId?: string | number
  expectedDurationMs?: number
  workerId?: string
  redisClient?: RedisLike
  leaseLostPolicy?: 'continue' | 'abort'
}

export interface LeaseLossInfo {
  workerId: string
  leaseId: string
  token: string
  jobId: string
  ttlMs: number
  context: string
  policy: 'continue' | 'abort'
}

export interface GlobalPermit {
  token: string
  leaseId: string
  workerId: string
  jobId: string
  ttlMs: number
  isLeaseValid: () => boolean
  hasLeaseBeenLost: () => boolean
  leaseLossPolicy: 'continue' | 'abort'
  release: () => Promise<void>
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

function resolveTtlMs(expectedDurationMs?: number): number {
  const minExpectedMs = ALLOW_UNSAFE_TTL_FOR_TESTS ? 100 : 10_000
  const expected = Math.max(minExpectedMs, expectedDurationMs ?? DEFAULT_EXPECTED_JOB_MS)
  return Math.max(MIN_SAFE_TTL_MS, expected * 2)
}

async function tryAcquire(
  client: RedisLike,
  token: string,
  workerId: string,
  leaseId: string,
  jobId: string,
  ttlMs: number,
): Promise<boolean> {
  const now = Date.now()
  const leaseUntil = now + ttlMs
  const keyTtl = ttlMs * 3
  const dynamicRaw = await client.get(DYNAMIC_MAX_KEY)
  const dynamicCap = Number(dynamicRaw || MAX_PERMITS)
  const effectiveCap = Math.max(1, Math.min(MAX_PERMITS, dynamicCap))
  const res = await client.eval(
    acquireLua,
    2,
    LEASE_SET_KEY,
    LEASE_META_KEY,
    now,
    leaseUntil,
    effectiveCap,
    token,
    workerId,
    leaseId,
    jobId,
    keyTtl,
  )
  return Number(res) === 1
}

async function renew(
  client: RedisLike,
  token: string,
  workerId: string,
  leaseId: string,
  ttlMs: number,
): Promise<boolean> {
  const leaseUntil = Date.now() + ttlMs
  const keyTtl = ttlMs * 3
  const res = await client.eval(renewLua, 2, LEASE_SET_KEY, LEASE_META_KEY, token, workerId, leaseId, leaseUntil, keyTtl)
  return Number(res) === 1
}

async function releaseToken(client: RedisLike, token: string, workerId: string, leaseId: string): Promise<boolean> {
  try {
    const res = await client.eval(releaseLua, 2, LEASE_SET_KEY, LEASE_META_KEY, token, workerId, leaseId)
    return Number(res) === 1
  } catch {
    return false
  }
}

function normalizePermitInput(input: string | PermitAcquireOptions): PermitAcquireOptions {
  if (typeof input === 'string') return { context: input }
  return input
}

export async function acquireGlobalYtDlpPermit(input: string | PermitAcquireOptions): Promise<GlobalPermit> {
  const startedAt = Date.now()
  const options = normalizePermitInput(input)
  const context = options.context
  const workerId = options.workerId || WORKER_ID
  const jobId = String(options.jobId ?? context)
  const ttlMs = resolveTtlMs(options.expectedDurationMs)
  const token = `${workerId}:${jobId}:${randomUUID()}`
  const leaseId = randomUUID()
  const client = options.redisClient || redis
  const leaseLossPolicy = (options.leaseLostPolicy || LEASE_LOSS_POLICY) === 'abort' ? 'abort' : 'continue'
  let attempt = 0
  const hasAcquireTimeout = ACQUIRE_TIMEOUT_MS > 0

  while (!hasAcquireTimeout || (Date.now() - startedAt < ACQUIRE_TIMEOUT_MS)) {
    attempt += 1
    try {
      const ok = await tryAcquire(client, token, workerId, leaseId, jobId, ttlMs)
      if (ok) {
        log.info({ msg: 'semaphore_acquired', workerId, leaseId, ttlMs, jobId, context, token })
        let released = false
        let leaseValid = true
        let leaseLost = false
        let lastRenewAt = Date.now()
        const heartbeatBaseIntervalMs = Math.min(HEARTBEAT_MAX_INTERVAL_MS, Math.max(500, Math.floor(ttlMs / 3)))
        let heartbeatTimer: NodeJS.Timeout | null = null

        const markLeaseLost = (reason: string, error?: string) => {
          if (leaseLost) return
          leaseLost = true
          leaseValid = false
          const payload: LeaseLossInfo = { workerId, leaseId, token, jobId, ttlMs, context, policy: leaseLossPolicy }
          log.error({ msg: 'semaphore_lease_lost', reason, error, ...payload })
          log.error({ msg: 'yt_global_semaphore_lease_lost', reason, error, ...payload })
        }

        const scheduleHeartbeat = () => {
          if (released) return
          const jitter = Math.floor(Math.random() * 250)
          heartbeatTimer = setTimeout(runHeartbeat, heartbeatBaseIntervalMs + jitter)
          heartbeatTimer.unref?.()
        }

        const runHeartbeat = async () => {
          if (released) return
          try {
            const alive = await renew(client, token, workerId, leaseId, ttlMs)
            if (alive) {
              lastRenewAt = Date.now()
              if (!leaseLost) {
                log.debug({ msg: 'semaphore_renewed', workerId, leaseId, ttlMs, jobId, context })
              }
            } else {
              markLeaseLost('not_owner_or_expired')
            }
          } catch (err) {
            const elapsed = Date.now() - lastRenewAt
            log.warn({
              msg: 'yt_global_semaphore_renew_failed',
              workerId,
              leaseId,
              jobId,
              context,
              ttlMs,
              elapsedSinceRenewMs: elapsed,
              error: (err as Error).message,
            })
            if (elapsed >= ttlMs) markLeaseLost('redis_unavailable', (err as Error).message)
          } finally {
            scheduleHeartbeat()
          }
        }

        scheduleHeartbeat()

        return {
          token,
          leaseId,
          workerId,
          jobId,
          ttlMs,
          leaseLossPolicy,
          isLeaseValid: () => leaseValid,
          hasLeaseBeenLost: () => leaseLost,
          release: async () => {
            if (released) return
            released = true
            if (heartbeatTimer) {
              clearTimeout(heartbeatTimer)
              heartbeatTimer = null
            }
            const releasedRemote = await releaseToken(client, token, workerId, leaseId)
            log.info({
              msg: 'semaphore_released',
              workerId,
              leaseId,
              ttlMs,
              jobId,
              context,
              token,
              releasedRemote,
              leaseLost,
            })
          },
        }
      }
    } catch (err) {
      const now = Date.now()
      if (now - lastDegradedLogAt > 30_000) {
        lastDegradedLogAt = now
        log.error({
          msg: 'semaphore_fallback_mode',
          context,
          localCap: LOCAL_EMERGENCY_CAP,
          mode: DEGRADED_MODE,
          reason: (err as Error).message,
          workerId,
          leaseId,
          ttlMs,
          jobId,
        })
        log.error({
          msg: 'yt_global_semaphore_degraded_mode',
          context,
          localCap: LOCAL_EMERGENCY_CAP,
          mode: DEGRADED_MODE,
          reason: (err as Error).message,
          workerId,
          leaseId,
          ttlMs,
          jobId,
        })
      }

      if (DEGRADED_MODE === 'local') {
        const localRelease = await emergencySemaphore.acquire()
        let released = false
        return {
          token: `local:${token}`,
          leaseId,
          workerId,
          jobId,
          ttlMs,
          leaseLossPolicy,
          isLeaseValid: () => true,
          hasLeaseBeenLost: () => false,
          release: async () => {
            if (released) return
            released = true
            localRelease()
            log.info({ msg: 'semaphore_released', workerId, leaseId, ttlMs, jobId, context, token: `local:${token}`, releasedRemote: true, leaseLost: false })
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
