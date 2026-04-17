import test from 'node:test'
import assert from 'node:assert/strict'

process.env.YT_DLP_SEMAPHORE_ALLOW_UNSAFE_TTL_FOR_TESTS = '1'
process.env.YT_DLP_SEMAPHORE_MIN_TTL_MS = '3000'
process.env.YT_DLP_SEMAPHORE_HEARTBEAT_MAX_INTERVAL_MS = '900'
process.env.YT_DLP_LEASE_LOSS_POLICY = 'continue'

const modPromise = import('../src/utils/youtubeGlobalControl')

class FakeRedis {
  public unavailable = false
  public latencyMs = 0
  private dynamicCap: string | null = null
  private leases = new Map<string, number>()
  private owners = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    if (this.unavailable) throw new Error('redis down')
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs))
    if (key.endsWith(':max_permits_dynamic')) return this.dynamicCap
    return null
  }

  setDynamicCap(n: number) {
    this.dynamicCap = String(n)
  }

  expireToken(token: string) {
    this.leases.delete(token)
    this.owners.delete(token)
  }

  ownerCount(): number {
    return this.owners.size
  }

  async eval(script: string, _numberOfKeys: number, ...args: Array<string | number>): Promise<unknown> {
    if (this.unavailable) throw new Error('redis down')
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs))

    const mod = await modPromise
    if (script === mod.acquireLua) {
      const now = Number(args[2])
      const leaseUntil = Number(args[3])
      const maxPermits = Number(args[4])
      const token = String(args[5])
      const owner = String(args[6])
      const leaseId = String(args[7])
      const jobId = String(args[8])
      for (const [t, until] of [...this.leases.entries()]) {
        if (until <= now) {
          this.leases.delete(t)
          this.owners.delete(t)
        }
      }
      if (this.leases.size < maxPermits) {
        this.leases.set(token, leaseUntil)
        this.owners.set(token, `${owner}|${leaseId}|${jobId}`)
        return 1
      }
      return 0
    }

    if (script === mod.renewLua) {
      const token = String(args[2])
      const owner = String(args[3])
      const leaseId = String(args[4])
      const leaseUntil = Number(args[5])
      const meta = this.owners.get(token)
      const expected = `${owner}|${leaseId}`
      if (!meta || !meta.startsWith(expected)) return 0
      if (!this.leases.has(token)) {
        this.owners.delete(token)
        return 0
      }
      this.leases.set(token, leaseUntil)
      return 1
    }

    if (script === mod.releaseLua) {
      const token = String(args[2])
      const owner = String(args[3])
      const leaseId = String(args[4])
      const meta = this.owners.get(token)
      if (!meta) {
        this.leases.delete(token)
        return 1
      }
      const expected = `${owner}|${leaseId}`
      if (!meta.startsWith(expected)) return 0
      this.leases.delete(token)
      this.owners.delete(token)
      return 1
    }

    throw new Error('unknown script')
  }
}

test('1) long-running job remains valid with heartbeat renewal', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  const permit = await mod.acquireGlobalYtDlpPermit({
    context: 'audio-long',
    expectedDurationMs: 5_000,
    redisClient: redis,
    jobId: 'job-long',
  })
  await new Promise((r) => setTimeout(r, 2_100))
  assert.equal(permit.isLeaseValid(), true)
  await permit.release()
})

test('2) redis latency spike does not immediately lose lease', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  const permit = await mod.acquireGlobalYtDlpPermit({ context: 'latency', expectedDurationMs: 4_500, redisClient: redis, jobId: 'job-latency' })
  redis.latencyMs = 500
  await new Promise((r) => setTimeout(r, 1_300))
  assert.equal(permit.isLeaseValid(), true)
  await permit.release()
})

test('3) worker crash is auto-released via expiry cleanup path', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  const p1 = await mod.acquireGlobalYtDlpPermit({ context: 'crash-a', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-crash-a' })
  redis.expireToken(p1.token)
  const p2 = await mod.acquireGlobalYtDlpPermit({ context: 'crash-b', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-crash-b' })
  assert.equal(p2.isLeaseValid(), true)
  await p2.release()
})

test('4) multiple workers compete and only max permits are active', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  redis.setDynamicCap(2)
  const first = await mod.acquireGlobalYtDlpPermit({ context: 'multi-1', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-m1', workerId: 'w1' })
  const second = await mod.acquireGlobalYtDlpPermit({ context: 'multi-2', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-m2', workerId: 'w2' })

  let thirdAcquired = false
  const third = mod.acquireGlobalYtDlpPermit({ context: 'multi-3', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-m3', workerId: 'w3' })
    .then(async (permit: typeof first) => {
      thirdAcquired = true
      await permit.release()
    })

  await new Promise((r) => setTimeout(r, 350))
  assert.equal(thirdAcquired, false)

  await first.release()
  await second.release()
  await third
})

test('5) heartbeat failure eventually marks lease lost', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  const permit = await mod.acquireGlobalYtDlpPermit({ context: 'hb-fail', expectedDurationMs: 3_500, redisClient: redis, jobId: 'job-hb' })
  redis.unavailable = true
  await new Promise((r) => setTimeout(r, 8_800))
  assert.equal(permit.hasLeaseBeenLost(), true)
  assert.equal(permit.isLeaseValid(), false)
  redis.unavailable = false
  await permit.release()
})

test('6) lease expiration edge case: release is idempotent and owner-safe', async () => {
  const mod = await modPromise
  const redis = new FakeRedis()
  const permit = await mod.acquireGlobalYtDlpPermit({ context: 'edge', expectedDurationMs: 4_000, redisClient: redis, jobId: 'job-edge' })
  redis.expireToken(permit.token)
  await permit.release()
  await permit.release()
  assert.equal(redis.ownerCount(), 0)
})
