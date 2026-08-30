/**
 * Integration test for GET /api/admin/conversion-intent against a real
 * Postgres instance (server/.env.development / DATABASE_URL). Skips itself
 * cleanly if DATABASE_URL isn't reachable, rather than reporting a false
 * pass or crashing the whole run.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'

import { prisma } from '../src/db'
import { signAuthToken } from '../src/utils/auth'
import conversionIntentRouter from '../src/routes/adminConversionIntent'
import type { User } from '../src/models/User'

const FOUNDER_EMAIL = 'santhoshguntupalli06@gmail.com'
const RUN_ID = `citest_${Date.now()}`

function baseUserFields(overrides: Partial<{
  id: string; email: string; plan: string; subscriptionStatus: string | null
}>) {
  const now = new Date()
  return {
    id: overrides.id!,
    email: overrides.email!,
    plan: overrides.plan ?? 'free',
    subscriptionStatus: overrides.subscriptionStatus ?? null,
    usageThisMonth: {},
    limits: {},
    overagesThisMonth: {},
    createdAt: now,
    updatedAt: now,
  }
}

function tokenFor(user: { id: string; stripeCustomerId?: string | null; plan: string }): string {
  return signAuthToken({ ...user, plan: user.plan } as unknown as User)
}

let server: http.Server
let baseUrl: string
let dbAvailable = true

test('setup: connect to test DB and seed fixtures', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbAvailable = false
    return
  }

  const app = express()
  app.use(express.json())
  app.use('/api/admin', conversionIntentRouter)
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  baseUrl = `http://127.0.0.1:${port}`

  // Founder
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_founder`, email: FOUNDER_EMAIL, plan: 'business' }) })
  // Ordinary non-founder authenticated user
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_plain`, email: `${RUN_ID}_plain@example.com`, plan: 'free' }) })
  // Free user with only a pricing_page_view (LOW)
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_low`, email: `${RUN_ID}_low@example.com`, plan: 'free' }) })
  // Free user with upgrade_clicked (MEDIUM) -> should be a Hot Lead
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_medium`, email: `${RUN_ID}_medium@example.com`, plan: 'free' }) })
  // Free user with checkout_started (HIGH) -> should be a Hot Lead, and has duplicate events
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_high`, email: `${RUN_ID}_high@example.com`, plan: 'free' }) })
  // Converted (Pro) user who also has an upgrade_clicked event -> CONVERTED, NOT a Hot Lead
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_converted`, email: `${RUN_ID}_converted@example.com`, plan: 'pro', subscriptionStatus: 'active' }) })
  // Old event outside the 24h/7d window (for range filtering)
  await prisma.user.create({ data: baseUserFields({ id: `${RUN_ID}_old`, email: `${RUN_ID}_old@example.com`, plan: 'free' }) })

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  await prisma.eventLog.createMany({
    data: [
      { eventName: 'pricing_page_view', userId: `${RUN_ID}_low`, sessionId: 's1', metadata: { source: 'pricing_page' }, createdAt: daysAgo(0.1) },
      { eventName: 'upgrade_clicked', userId: `${RUN_ID}_medium`, sessionId: 's2', metadata: { source: 'free_plan_nudge', tool: 'transcript', remaining_imports: 1 }, createdAt: daysAgo(0.1) },
      // Duplicate events for the same user -> must collapse to one people-list row
      { eventName: 'pricing_page_view', userId: `${RUN_ID}_high`, sessionId: 's3', metadata: { source: 'pricing_page' }, createdAt: daysAgo(0.2) },
      { eventName: 'checkout_started', userId: `${RUN_ID}_high`, sessionId: 's3', metadata: { source: 'pricing_page', billing_interval: 'monthly' }, createdAt: daysAgo(0.1) },
      { eventName: 'checkout_started', userId: `${RUN_ID}_high`, sessionId: 's3', metadata: { source: 'pricing_page', billing_interval: 'monthly' }, createdAt: daysAgo(0.05) },
      { eventName: 'upgrade_clicked', userId: `${RUN_ID}_converted`, sessionId: 's4', metadata: { source: 'paywall_modal' }, createdAt: daysAgo(0.1) },
      // Old event, well outside 24h/7d/30d windows
      { eventName: 'pricing_page_view', userId: `${RUN_ID}_old`, sessionId: 's5', metadata: {}, createdAt: daysAgo(90) },
    ],
  })
})

test('rejects unauthenticated requests with 401', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const res = await fetch(`${baseUrl}/api/admin/conversion-intent`)
  assert.equal(res.status, 401)
})

test('rejects authenticated non-founder requests with 403 (cannot access conversion intent data)', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const token = tokenFor({ id: `${RUN_ID}_plain`, plan: 'free' })
  const res = await fetch(`${baseUrl}/api/admin/conversion-intent`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 403)
})

test('founder request succeeds and returns funnel + people + hotLeads', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const token = tokenFor({ id: `${RUN_ID}_founder`, plan: 'business' })
  const res = await fetch(`${baseUrl}/api/admin/conversion-intent?range=30d`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(Array.isArray(body.people))
  assert.ok(Array.isArray(body.hotLeads))
  assert.equal(typeof body.funnel.anonymousVisitorNote, 'string')
  assert.ok(body.funnel.anonymousVisitorNote.length > 0)

  const byId = new Map(body.people.map((p: { userId: string }) => [p.userId, p]))

  const low = byId.get(`${RUN_ID}_low`)
  assert.equal(low.intentLevel, 'LOW')
  assert.equal(low.converted, false)

  const medium = byId.get(`${RUN_ID}_medium`)
  assert.equal(medium.intentLevel, 'MEDIUM')

  const high = byId.get(`${RUN_ID}_high`)
  assert.equal(high.intentLevel, 'HIGH')
  // Duplicate checkout_started events for the same user collapse to one row's event list of 3 (1 pricing_page_view + 2 checkout_started), not extra people rows
  assert.equal(high.events.length, 3)

  const converted = byId.get(`${RUN_ID}_converted`)
  assert.equal(converted.intentLevel, 'CONVERTED')
  assert.equal(converted.converted, true)
  assert.equal(converted.plan, 'pro')

  // Duplicate collapse: exactly one row per userId in the whole people list
  const ids = body.people.map((p: { userId: string }) => p.userId)
  assert.equal(new Set(ids).size, ids.length)

  // Hot Leads: medium + high (not converted, MEDIUM/HIGH intent); converted user excluded
  const hotLeadIds = new Set(body.hotLeads.map((p: { userId: string }) => p.userId))
  assert.ok(hotLeadIds.has(`${RUN_ID}_medium`))
  assert.ok(hotLeadIds.has(`${RUN_ID}_high`))
  assert.ok(!hotLeadIds.has(`${RUN_ID}_converted`))
  assert.ok(!hotLeadIds.has(`${RUN_ID}_low`))
})

test('current plan in the response comes from User.plan, not a client-submitted event', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const token = tokenFor({ id: `${RUN_ID}_founder`, plan: 'business' })
  const res = await fetch(`${baseUrl}/api/admin/conversion-intent?range=all`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  const converted = body.people.find((p: { userId: string }) => p.userId === `${RUN_ID}_converted`)
  // This user only ever fired upgrade_clicked (no checkout_completed-style event exists anywhere
  // in this pipeline); CONVERTED must still be true because it is read from User.plan = 'pro'.
  assert.equal(converted.intentLevel, 'CONVERTED')
  assert.equal(converted.plan, 'pro')
})

test('time-range filtering: 24h excludes the 90-day-old event, "all" includes it', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const token = tokenFor({ id: `${RUN_ID}_founder`, plan: 'business' })

  const res24h = await fetch(`${baseUrl}/api/admin/conversion-intent?range=24h`, { headers: { Authorization: `Bearer ${token}` } })
  const body24h = await res24h.json()
  assert.ok(!body24h.people.some((p: { userId: string }) => p.userId === `${RUN_ID}_old`))

  const resAll = await fetch(`${baseUrl}/api/admin/conversion-intent?range=all`, { headers: { Authorization: `Bearer ${token}` } })
  const bodyAll = await resAll.json()
  assert.ok(bodyAll.people.some((p: { userId: string }) => p.userId === `${RUN_ID}_old`))
})

test('missing/null historical properties do not crash the endpoint and are surfaced as null', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  const token = tokenFor({ id: `${RUN_ID}_founder`, plan: 'business' })
  const res = await fetch(`${baseUrl}/api/admin/conversion-intent?range=all`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(res.status, 200)
  const body = await res.json()
  const low = body.people.find((p: { userId: string }) => p.userId === `${RUN_ID}_low`)
  assert.equal(low.remainingImports, null)
  assert.equal(low.tool, null)
})

test('teardown: remove fixtures and close server', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable in this environment')
  await prisma.eventLog.deleteMany({ where: { userId: { startsWith: RUN_ID } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: RUN_ID } } })
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.$disconnect()
})
