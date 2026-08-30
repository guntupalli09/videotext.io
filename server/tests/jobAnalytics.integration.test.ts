/**
 * Integration tests for the Job terminal-state rule enforced by
 * lib/jobAnalytics.ts, plus the defense-in-depth `failureReason: null`
 * filter added to the GET /api/v1/transcriptions status=completed query
 * (routes/apiV1.ts) that feeds the Zapier "New Completed Transcription"
 * trigger.
 *
 * Runs against a real Postgres instance (server/.env.development /
 * DATABASE_URL), same pattern as tests/founderNotify.test.ts and
 * tests/adminConversionIntent.integration.test.ts. Skips itself cleanly
 * if DATABASE_URL isn't reachable.
 *
 * Terminal-state rule under test:
 *   queued     -> processing  OK
 *   queued     -> completed   OK
 *   processing -> completed   OK
 *   queued     -> failed      OK
 *   processing -> failed      OK
 *   failed     -> completed   REJECTED (updateJobCompleted no-ops)
 *   completed  -> failed      REJECTED (updateJobFailed no-ops)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'

import { prisma } from '../src/db'
import { updateJobCompleted, updateJobFailed } from '../src/lib/jobAnalytics'

let dbAvailable = true

function uniqueId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

function baseJobFields(overrides: Partial<{
  id: string
  userId: string
  toolType: string
  status: string
  failureReason: string | null
}>) {
  return {
    id: overrides.id!,
    userId: overrides.userId ?? 'test-user',
    toolType: overrides.toolType ?? 'video-to-transcript',
    status: overrides.status ?? 'queued',
    failureReason: overrides.failureReason ?? null,
  }
}

const seededIds: string[] = []

async function seedJob(overrides: Parameters<typeof baseJobFields>[0]) {
  const data = baseJobFields(overrides)
  seededIds.push(data.id)
  await prisma.job.create({ data })
  return data
}

test('setup: connect to test DB', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbAvailable = false
  }
})

test('failed -> updateJobCompleted() remains failed', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')

  const id = uniqueId('job')
  await seedJob({ id, status: 'failed', failureReason: 'ffmpeg crashed' })

  await updateJobCompleted(id, 1234, 'output.txt')

  const row = await prisma.job.findUniqueOrThrow({ where: { id } })
  assert.equal(row.status, 'failed')
  assert.equal(row.failureReason, 'ffmpeg crashed')
  assert.equal(row.completedAt, null)
  assert.equal(row.resultFilename, null)
})

test('completed -> updateJobFailed() remains completed', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')

  const id = uniqueId('job')
  await seedJob({ id, status: 'completed', failureReason: null })

  await updateJobFailed(id, 'late worker retry failure')

  const row = await prisma.job.findUniqueOrThrow({ where: { id } })
  assert.equal(row.status, 'completed')
  assert.equal(row.failureReason, null)
})

test('successful completion clears failureReason', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')

  // Simulates a job that recorded a transient failureReason (e.g. from a
  // prior failed attempt state) while still queued/processing, then goes
  // on to complete successfully.
  const id = uniqueId('job')
  await seedJob({ id, status: 'processing', failureReason: 'transient retry warning' })

  await updateJobCompleted(id, 5000, 'output.srt')

  const row = await prisma.job.findUniqueOrThrow({ where: { id } })
  assert.equal(row.status, 'completed')
  assert.equal(row.failureReason, null)
  assert.equal(row.resultFilename, 'output.srt')
  assert.ok(row.completedAt)
})

test('status=completed polling excludes failureReason != null', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')

  const userId = uniqueId('user')
  const cleanId = uniqueId('job')
  const inconsistentId = uniqueId('job')

  await seedJob({ id: cleanId, userId, status: 'completed', failureReason: null })
  // Historically-inconsistent row (e.g. the March rows): status=completed
  // but failureReason still set from a pre-fix race.
  await seedJob({ id: inconsistentId, userId, status: 'completed', failureReason: 'stale failure text' })

  // Mirrors the where-clause built in routes/apiV1.ts for status=completed.
  const where: Record<string, unknown> = { userId, status: 'completed', failureReason: null }
  const rows = await prisma.job.findMany({ where, select: { id: true } })
  const ids = rows.map((r) => r.id)

  assert.ok(ids.includes(cleanId))
  assert.ok(!ids.includes(inconsistentId))
})

test('teardown', async (t) => {
  if (!dbAvailable) return t.skip('DATABASE_URL not reachable')
  await prisma.job.deleteMany({ where: { id: { in: seededIds } } })
  await prisma.$disconnect()
})
