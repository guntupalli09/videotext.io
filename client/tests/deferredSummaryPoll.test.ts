import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyDeferredSummary,
  pollDeferredSummary,
  type DeferredSummaryResponse,
  type PollDeferredSummaryDeps,
} from '../src/lib/deferredSummaryPoll'

class FakeSessionExpired extends Error {}

function mockDeps(
  responses: (DeferredSummaryResponse | Error)[],
  overrides: Partial<PollDeferredSummaryDeps> = {},
): PollDeferredSummaryDeps & { attempts: number; slept: number; clock: () => number } {
  const queue = [...responses]
  let attempts = 0
  let elapsed = 0
  let slept = 0
  const deps = {
    fetchSummary: async () => {
      attempts++
      const next = queue.length > 1 ? queue.shift()! : (queue[0] ?? {})
      if (next instanceof Error) throw next
      return next
    },
    sleep: async (ms: number) => {
      slept++
      elapsed += ms
    },
    now: () => elapsed,
    isCancelled: () => false,
    isSessionExpired: (err: unknown) => err instanceof FakeSessionExpired,
    ...overrides,
  }
  return Object.defineProperties(deps as never, {
    attempts: { get: () => attempts },
    slept: { get: () => slept },
    clock: { value: () => elapsed },
  }) as never
}

test('classifyDeferredSummary separates ready, requires-auth, and pending', () => {
  assert.equal(classifyDeferredSummary({ summary: { summary: 'hi' } }), 'ready')
  assert.equal(classifyDeferredSummary({ chapters: [{ title: 'a', startTime: 0 }] }), 'ready')
  assert.equal(classifyDeferredSummary({ requiresAuth: true }), 'requires-auth')
  assert.equal(classifyDeferredSummary({}), 'pending')
  assert.equal(classifyDeferredSummary(undefined), 'pending')
})

test('requiresAuth wins over a stale payload on the same response', () => {
  assert.equal(
    classifyDeferredSummary({ requiresAuth: true, summary: { summary: 'leak' } }),
    'requires-auth',
  )
})

test('returns ready as soon as a summary arrives', async () => {
  const deps = mockDeps([{}, {}, { summary: { summary: 'done', bullets: ['a'] } }])
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'ready')
  assert.deepEqual(
    outcome.kind === 'ready' ? outcome.payload.summary : null,
    { summary: 'done', bullets: ['a'] },
  )
  assert.equal(deps.attempts, 3)
})

test('chapters alone count as ready', async () => {
  const outcome = await pollDeferredSummary(
    mockDeps([{ chapters: [{ title: 'Intro', startTime: 0 }] }]),
  )
  assert.equal(outcome.kind, 'ready')
  assert.equal(outcome.kind === 'ready' ? outcome.payload.summary : 'set', undefined)
})

test('a never-ready job terminates instead of polling forever', async () => {
  const deps = mockDeps([{}])
  const outcome = await pollDeferredSummary(deps, { timeoutMs: 10_000, intervalMs: 2000 })
  assert.equal(outcome.kind, 'exhausted')
  assert.ok(deps.attempts <= 6, `expected a bounded number of attempts, got ${deps.attempts}`)
})

test('the attempt cap bounds the poll even when time never advances', async () => {
  const deps = mockDeps([{}], { sleep: async () => {}, now: () => 0 })
  const outcome = await pollDeferredSummary(deps, { maxAttempts: 4 })
  assert.equal(outcome.kind, 'exhausted')
  assert.equal(deps.attempts, 4)
})

test('requiresAuth claims the job once, then retries', async () => {
  let claims = 0
  const deps = mockDeps([{ requiresAuth: true }, { summary: { summary: 'after claim' } }], {
    claimJob: async () => {
      claims++
    },
  })
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'ready')
  assert.equal(claims, 1)
})

test('a second requiresAuth is terminal rather than an endless spinner', async () => {
  let claims = 0
  const deps = mockDeps([{ requiresAuth: true }], {
    claimJob: async () => {
      claims++
    },
  })
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'requires-auth')
  assert.equal(claims, 1)
  assert.equal(deps.attempts, 2)
})

test('requiresAuth with no way to claim is terminal immediately', async () => {
  const deps = mockDeps([{ requiresAuth: true }])
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'requires-auth')
  assert.equal(deps.attempts, 1)
})

test('a failed claim is terminal, not a retry loop', async () => {
  const deps = mockDeps([{ requiresAuth: true }], {
    claimJob: async () => {
      throw new Error('claim rejected')
    },
  })
  assert.equal((await pollDeferredSummary(deps)).kind, 'requires-auth')
})

test('session expiry short-circuits the poll', async () => {
  const deps = mockDeps([new FakeSessionExpired('gone')])
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'session-expired')
  assert.equal(deps.attempts, 1)
})

test('transient errors are retried, not treated as terminal', async () => {
  const deps = mockDeps([new Error('network'), { summary: { summary: 'recovered' } }])
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'ready')
  assert.equal(deps.attempts, 2)
})

test('cancellation stops the poll without a result', async () => {
  let cancelled = false
  const deps = mockDeps([{}], {
    isCancelled: () => cancelled,
    sleep: async () => {
      cancelled = true
    },
  })
  const outcome = await pollDeferredSummary(deps)
  assert.equal(outcome.kind, 'cancelled')
})

test('a result arriving after cancellation is discarded', async () => {
  const deps = mockDeps([{ summary: { summary: 'late' } }], { isCancelled: () => true })
  assert.equal((await pollDeferredSummary(deps)).kind, 'cancelled')
})
