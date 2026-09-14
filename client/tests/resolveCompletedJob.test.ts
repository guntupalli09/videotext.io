import test from 'node:test'
import assert from 'node:assert/strict'

import { jobHasUsableResult } from '../src/lib/hydrateTranscriptResult'
import {
  resolveCompletedJobResultWith,
  type ResolveCompletedJobDeps,
} from '../src/lib/resolveCompletedJob'

type JobStatus = {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  requiresAuth?: boolean
  result?: { downloadUrl: string; fileName?: string }
}

function completed(partial: Partial<JobStatus> = {}): JobStatus {
  return {
    status: 'completed',
    progress: 100,
    ...partial,
  }
}

function mockDeps(overrides: Partial<ResolveCompletedJobDeps> & {
  statuses?: JobStatus[]
} = {}): ResolveCompletedJobDeps {
  const statuses = [...(overrides.statuses ?? [])]
  return {
    getAuthToken: overrides.getAuthToken ?? (() => 'token'),
    getJobStatus:
      overrides.getJobStatus ??
      (async () => {
        const next = statuses.shift()
        if (!next) throw new Error('no more statuses')
        return next
      }),
    ensureGuestJobClaimed: overrides.ensureGuestJobClaimed ?? (async () => undefined),
    sleep: overrides.sleep ?? (async () => undefined),
  }
}

test('jobHasUsableResult is true for a file download, including zip', () => {
  assert.equal(jobHasUsableResult({ downloadUrl: '/api/download/out.mp4' }), true)
  assert.equal(
    jobHasUsableResult({ downloadUrl: '/api/download/talk.zip', fileName: 'talk.zip' }),
    true,
  )
})

test('jobHasUsableResult is true for analyze findings even without a file', () => {
  assert.equal(jobHasUsableResult({ downloadUrl: '', issues: [] }), true)
  assert.equal(jobHasUsableResult({ downloadUrl: '', issues: [{ line: 1 }] }), true)
})

test('jobHasUsableResult is false for the stripped SSE completed payload', () => {
  assert.equal(jobHasUsableResult(undefined), false)
  assert.equal(jobHasUsableResult({ downloadUrl: '' }), false)
})

test('resolveCompletedJobResult returns ready when the payload already has a result', async () => {
  const incoming = completed({
    result: { downloadUrl: '/api/download/out.srt', fileName: 'out.srt' },
  })
  const resolved = await resolveCompletedJobResultWith('job-1', 'tok', incoming, mockDeps(), 0)
  assert.equal(resolved.kind, 'ready')
  if (resolved.kind === 'ready') {
    assert.equal(resolved.status.result?.downloadUrl, '/api/download/out.srt')
  }
})

test('resolveCompletedJobResult returns auth-gate when the guest is not logged in', async () => {
  const incoming = completed({ requiresAuth: true })
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    incoming,
    mockDeps({ getAuthToken: () => null }),
    0,
  )
  assert.equal(resolved.kind, 'auth-gate')
})

test('resolveCompletedJobResult claims a guest job for a logged-in user then returns the file', async () => {
  let claimed = false
  const incoming = completed({ requiresAuth: true })
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    incoming,
    mockDeps({
      ensureGuestJobClaimed: async () => {
        claimed = true
      },
      getJobStatus: async () =>
        completed({
          result: { downloadUrl: '/api/download/burned.mp4', fileName: 'burned.mp4' },
        }),
    }),
    0,
  )
  assert.equal(claimed, true)
  assert.equal(resolved.kind, 'ready')
  if (resolved.kind === 'ready') {
    assert.equal(resolved.status.result?.downloadUrl, '/api/download/burned.mp4')
  }
})

test('resolveCompletedJobResult retries until the result URL is attached', async () => {
  const incoming = completed({})
  let sleeps = 0
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    incoming,
    mockDeps({
      statuses: [
        completed({}),
        completed({ result: { downloadUrl: '/api/download/late.srt' } }),
      ],
      sleep: async () => {
        sleeps += 1
      },
    }),
    3,
  )
  assert.equal(resolved.kind, 'ready')
  assert.ok(sleeps >= 1)
})

test('resolveCompletedJobResult returns missing after retries for a logged-in owner', async () => {
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    completed({ requiresAuth: true }),
    mockDeps({
      getJobStatus: async () => completed({ requiresAuth: true }),
    }),
    2,
  )
  assert.equal(resolved.kind, 'missing')
})
