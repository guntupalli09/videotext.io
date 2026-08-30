/**
 * End-to-end regression test for the Zapier reviewer entitlement path.
 *
 * Reproduces the exact bug reported against integration-testing@zapier.com:
 * a DB user with plan='pro', billingPeriodEnd=null, subscriptionId=null
 * (precisely what provision-zapier-reviewer.ts writes) was rejected by
 * POST /api/api-keys with "API keys are a Pro feature" because
 * hasPaidAccess() (server/src/utils/subscriptionGuard.ts) required either a
 * subscriptionId or a future billingPeriodEnd — an invariant
 * enforceSubscriptionState() itself does not hold (it treats an unset
 * billingPeriodEnd as "never expires").
 *
 * Exercises the real /api/api-keys HTTP route for create/list/revoke, and
 * calls resolveApiKeyDetailed() + enforceSubscriptionState() + hasPaidAccess()
 * directly for key authentication — the exact sequence
 * routes/apiV1.ts's requireApiKeyAuth runs before every /api/v1/* route
 * (including GET /api/v1/me). The full apiV1 router is intentionally not
 * mounted here: importing it pulls in the upload/queue stack, which opens
 * eager (non-lazy) Redis connections at module load time — unrelated to the
 * entitlement bug this test targets and not available in every environment
 * that does have Postgres.
 *
 * Runs against a real Postgres instance (server/.env.development or
 * DATABASE_URL). Skips itself cleanly if DATABASE_URL isn't reachable,
 * rather than reporting a false pass or crashing the whole run (same
 * pattern as tests/adminConversionIntent.integration.test.ts).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import bcrypt from 'bcryptjs'

import { prisma } from '../src/db'
import { getPlanLimits } from '../src/utils/limits'
import { signAuthToken } from '../src/utils/auth'
import { enforceSubscriptionState, hasPaidAccess } from '../src/utils/subscriptionGuard'
import { resolveApiKeyDetailed } from '../src/models/ApiKey'
import { getUser, saveUser } from '../src/models/User'
import apiKeysRouter from '../src/routes/apiKeys'
import type { User } from '../src/models/User'

const RUN_ID = `reviewer_prov_test_${Date.now()}`
const REVIEWER_ID = `${RUN_ID}_reviewer`
const REVIEWER_EMAIL = `${RUN_ID}@zapier.example.com`

let server: http.Server
let baseUrl: string
let dbAvailable = true

function fetchJson(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init).then(async (res) => ({
    status: res.status,
    body: await res.json().catch(() => null),
  }))
}

test('setup: connect to test DB and provision reviewer-shaped user', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbAvailable = false
    return
  }

  const app = express()
  app.use(express.json())
  app.use('/api/api-keys', apiKeysRouter)
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  baseUrl = `http://127.0.0.1:${port}`

  // Exactly the state provision-zapier-reviewer.ts writes — built and saved
  // via the same models/User.ts saveUser() the script itself calls, so this
  // fixture can't drift from what the script actually persists: plan=pro,
  // no subscriptionId, no billingPeriodEnd, limits from getPlanLimits('pro').
  const now = new Date()
  const limits = getPlanLimits('pro')
  const reviewer: User = {
    id: REVIEWER_ID,
    email: REVIEWER_EMAIL,
    passwordHash: await bcrypt.hash('irrelevant-test-password', 4),
    plan: 'pro',
    stripeCustomerId: undefined,
    subscriptionId: undefined,
    paymentMethodId: undefined,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      importCount: 0,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      importCountToday: 0,
      importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      dailyMinutesToday: 0,
      dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    limits,
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    createdAt: now,
    updatedAt: now,
  }
  await saveUser(reviewer)
})

test('A: DB user resolves plan=pro with authoritative Pro limits (not founder/admin)', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  const user = await prisma.user.findUnique({ where: { id: REVIEWER_ID } })
  assert.equal(user?.plan, 'pro')
  assert.equal(user?.subscriptionId, null)
  assert.equal(user?.billingPeriodEnd, null)
  assert.deepEqual(user?.limits, getPlanLimits('pro'))
})

test('B: enforceSubscriptionState does not downgrade the reviewer and hasPaidAccess reports paid', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  const user = await getUser(REVIEWER_ID)
  assert.ok(user)
  const enforced = await enforceSubscriptionState(user!)
  assert.equal(enforced.plan, 'pro')
  assert.equal(hasPaidAccess(enforced), true)
})

let sessionToken: string
let createdRawKey: string
let createdKeyId: string

test('C: reviewer can POST /api/api-keys successfully via session auth', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  sessionToken = signAuthToken({ id: REVIEWER_ID, email: REVIEWER_EMAIL, plan: 'pro' } as unknown as User)

  const res = await fetchJson('/api/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ name: 'Zapier reviewer key', clientType: 'zapier' }),
  })
  assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`)
  assert.match(res.body.key, /^vt_live_/)
  createdRawKey = res.body.key
  createdKeyId = res.body.id
})

test('C2: reviewer can GET /api/api-keys and sees the created key', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  const res = await fetchJson('/api/api-keys', {
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  assert.equal(res.status, 200)
  assert.ok(res.body.data.some((k: { id: string }) => k.id === createdKeyId))
})

test('D: the newly-created vt_live_ key authenticates via the same path requireApiKeyAuth uses for /api/v1/me', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  const resolved = await resolveApiKeyDetailed(createdRawKey)
  assert.equal(resolved.status, 'ok')
  if (resolved.status !== 'ok') return
  assert.equal(resolved.key.userId, REVIEWER_ID)

  const user = await getUser(resolved.key.userId)
  assert.ok(user)
  await enforceSubscriptionState(user!)
  // This is exactly requireApiKeyAuth's gate — if this is false, /api/v1/me
  // (and every other /api/v1 route) returns 401 UPGRADE_REQUIRED.
  assert.equal(hasPaidAccess(user!) || user!.plan === 'business', true)
  assert.equal(user!.plan, 'pro')
  const limits = user!.limits ?? getPlanLimits(user!.plan)
  assert.deepEqual(limits, getPlanLimits('pro'))
})

test('E: revoking the key makes it fail the same auth path (401-equivalent) and DELETE succeeds', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  const revokeRes = await fetchJson(`/api/api-keys/${createdKeyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  assert.equal(revokeRes.status, 200)

  const resolved = await resolveApiKeyDetailed(createdRawKey)
  assert.equal(resolved.status, 'revoked')
})

test('teardown: remove reviewer test fixture and close server', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  await prisma.apiKey.deleteMany({ where: { userId: REVIEWER_ID } })
  await prisma.user.delete({ where: { id: REVIEWER_ID } })
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.$disconnect()
})
