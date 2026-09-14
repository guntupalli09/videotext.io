/**
 * Regression tests for the Video-to-Subtitles completed-state invariant.
 *
 * Incident: job c9fbe063 (2026-09-14) completed on the backend, the user saw an
 * empty Studio, and the app still logged a successful result view. Root cause:
 * the auth gate set `result = { downloadUrl: '' }` — truthy — so the
 * post-signup recovery believed a result was already loaded.
 *
 * Invariant: the UI must never present a successful completed/result-viewed
 * state, and first_output_seen must never fire, unless usable subtitle rows
 * exist.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  parseSubtitlesToRows,
  hasRenderableSubtitleResult,
  shouldEmitFirstOutputSeen,
  needsResultRefetchAfterClaim,
  resolvedJobIsSuccessful,
} from '../src/lib/subtitleResultReadiness'
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
  return { status: 'completed', progress: 100, ...partial }
}

function deps(overrides: Partial<ResolveCompletedJobDeps> = {}): ResolveCompletedJobDeps {
  return {
    getAuthToken: overrides.getAuthToken ?? (() => 'token'),
    getJobStatus: overrides.getJobStatus ?? (async () => completed()),
    ensureGuestJobClaimed: overrides.ensureGuestJobClaimed ?? (async () => undefined),
    sleep: overrides.sleep ?? (async () => undefined),
  }
}

const VALID_SRT = `1
00:00:00,000 --> 00:00:02,000
Hello there

2
00:00:02,000 --> 00:00:04,000
Second cue`

// ── The exact incident ──────────────────────────────────────────────────────

test('INCIDENT: the auth-gate placeholder is truthy but never counts as a result', () => {
  const placeholder = { downloadUrl: '' }
  assert.ok(placeholder, 'placeholder is truthy — this is what fooled `if (result)`')
  assert.equal(hasRenderableSubtitleResult(placeholder, 0), false)
  assert.equal(
    needsResultRefetchAfterClaim(placeholder, 0),
    true,
    'after claiming, a withheld result must be re-fetched, not assumed loaded',
  )
})

test('INCIDENT: backend completed + result withheld emits no first_output_seen', () => {
  assert.equal(
    shouldEmitFirstOutputSeen({ status: 'completed', subtitleRowCount: 0, alreadyTracked: false }),
    false,
  )
})

// ── backend completed + result unavailable ──────────────────────────────────

test('backend completed with no result resolves to auth-gate for a guest, not ready', async () => {
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    completed({ requiresAuth: true }),
    deps({ getAuthToken: () => null }),
    0,
  )
  assert.equal(resolved.kind, 'auth-gate')
  assert.equal(resolvedJobIsSuccessful(resolved), false)
})

test('backend completed with no result resolves to missing for a logged-in owner', async () => {
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    completed(),
    deps({ getJobStatus: async () => completed() }),
    2,
  )
  assert.equal(resolved.kind, 'missing')
  assert.equal(resolvedJobIsSuccessful(resolved), false)
})

// ── requiresAuth / claim failure ────────────────────────────────────────────

test('claim failure leaves the job unresolved and not successful', async () => {
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    completed({ requiresAuth: true }),
    deps({
      ensureGuestJobClaimed: async () => {
        throw new Error('claim rejected')
      },
      getJobStatus: async () => completed({ requiresAuth: true }),
    }),
    1,
  )
  assert.equal(resolved.kind, 'missing')
  assert.equal(resolvedJobIsSuccessful(resolved), false)
})

// ── result resolution timeout ───────────────────────────────────────────────

test('result resolution timeout never yields a successful state', async () => {
  let calls = 0
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    undefined,
    deps({
      getJobStatus: async () => {
        calls++
        throw new Error('network')
      },
    }),
    3,
  )
  assert.equal(resolved.kind, 'missing')
  assert.ok(calls > 1, 'should have retried before giving up')
  assert.equal(resolvedJobIsSuccessful(resolved), false)
})

// ── downloadUrl missing ─────────────────────────────────────────────────────

test('a result object without downloadUrl is not renderable', () => {
  assert.equal(hasRenderableSubtitleResult({}, 5), false)
  assert.equal(hasRenderableSubtitleResult({ downloadUrl: '' }, 5), false)
  assert.equal(hasRenderableSubtitleResult(null, 5), false)
  assert.equal(hasRenderableSubtitleResult(undefined, 5), false)
})

// ── preview fetch 404 / network failure → zero rows ─────────────────────────

test('preview fetch failure leaves zero rows, so no success state and no event', () => {
  // loadCompletedPreview() catches and does setSubtitleRows([]) + previewError.
  const rowsAfterFailedPreview = 0
  assert.equal(
    hasRenderableSubtitleResult({ downloadUrl: '/api/download/a.srt' }, rowsAfterFailedPreview),
    false,
    'a downloadUrl alone must not count as a rendered result',
  )
  assert.equal(
    shouldEmitFirstOutputSeen({
      status: 'completed',
      subtitleRowCount: rowsAfterFailedPreview,
      alreadyTracked: false,
    }),
    false,
  )
})

test('a 404 preview body does not parse into cues', () => {
  assert.equal(parseSubtitlesToRows('Not Found').length, 0)
  assert.equal(parseSubtitlesToRows('{"message":"File not found"}').length, 0)
})

// ── SRT parses to zero rows ─────────────────────────────────────────────────

test('SRT parsing to zero rows blocks the success state and the event', () => {
  assert.equal(parseSubtitlesToRows('').length, 0)
  assert.equal(parseSubtitlesToRows('   \n\n  ').length, 0)
  assert.equal(
    parseSubtitlesToRows('1\n\n2\n\n3').length,
    0,
    'indices with no timing lines are not cues',
  )
  assert.equal(
    shouldEmitFirstOutputSeen({ status: 'completed', subtitleRowCount: 0, alreadyTracked: false }),
    false,
  )
})

// ── successful completed job with valid rows ────────────────────────────────

test('a valid SRT parses into cues and unlocks the success state', () => {
  const rows = parseSubtitlesToRows(VALID_SRT)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].startTime, '00:00:00,000')
  assert.equal(rows[0].endTime, '00:00:02,000')
  assert.equal(rows[0].text, 'Hello there')
  assert.equal(rows[1].index, 2)

  assert.equal(hasRenderableSubtitleResult({ downloadUrl: '/api/download/a.srt' }, rows.length), true)
  assert.equal(
    needsResultRefetchAfterClaim({ downloadUrl: '/api/download/a.srt' }, rows.length),
    false,
  )
})

test('WebVTT cues parse as well', () => {
  const rows = parseSubtitlesToRows('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nCaption text')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].text, 'Caption text')
})

test('a ready resolution with a result is successful', async () => {
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    completed({ result: { downloadUrl: '/api/download/a.srt', fileName: 'a.srt' } }),
    deps(),
    0,
  )
  assert.equal(resolved.kind, 'ready')
  assert.equal(resolvedJobIsSuccessful(resolved), true)
})

// ── correct first_output_seen emission ──────────────────────────────────────

test('first_output_seen fires exactly once for a genuinely usable result', () => {
  assert.equal(
    shouldEmitFirstOutputSeen({ status: 'completed', subtitleRowCount: 2, alreadyTracked: false }),
    true,
  )
  assert.equal(
    shouldEmitFirstOutputSeen({ status: 'completed', subtitleRowCount: 2, alreadyTracked: true }),
    false,
    'must stay deduplicated per session',
  )
})

test('first_output_seen never fires before completion, even with rows present', () => {
  for (const status of ['queued', 'processing', 'failed', 'idle']) {
    assert.equal(
      shouldEmitFirstOutputSeen({ status, subtitleRowCount: 5, alreadyTracked: false }),
      false,
      `must not fire while status is ${status}`,
    )
  }
})

// ── post-claim recovery ─────────────────────────────────────────────────────

test('post-claim recovery re-fetches whenever rows are missing', () => {
  assert.equal(needsResultRefetchAfterClaim({ downloadUrl: '' }, 0), true)
  assert.equal(needsResultRefetchAfterClaim(null, 0), true)
  assert.equal(needsResultRefetchAfterClaim({ downloadUrl: '/api/download/a.srt' }, 0), true)
  assert.equal(needsResultRefetchAfterClaim({ downloadUrl: '/api/download/a.srt' }, 3), false)
})

// ── call-site guards ────────────────────────────────────────────────────────
// The helpers above are pure, so they cannot catch the page reverting to the
// original buggy expressions. These read the source to keep the incident
// non-regressable.

const testDir = path.dirname(fileURLToPath(import.meta.url))
const pageSrc = fs.readFileSync(
  path.resolve(testDir, '..', 'src', 'pages', 'VideoToSubtitles.tsx'),
  'utf8',
)

test('onAuthSuccess does not treat the truthy empty placeholder as a loaded result', () => {
  assert.equal(
    /if\s*\(\s*result\s*\)\s*\{/.test(pageSrc),
    false,
    'the auth gate sets { downloadUrl: "" }, which is truthy; a bare ' +
      '`if (result)` skips post-claim recovery and strands an empty Studio',
  )
  assert.ok(
    pageSrc.includes('needsResultRefetchAfterClaim'),
    'post-claim recovery must go through the tested readiness predicate',
  )
})

test('first_output_seen is not emitted from the job-completion handler', () => {
  // It belongs in the effect gated on subtitleRows, not next to setStatus.
  const completionHandler = pageSrc.slice(
    pageSrc.indexOf("trackEvent('job_completed'"),
    pageSrc.indexOf("trackEvent('processing_completed'"),
  )
  assert.ok(completionHandler.length > 0, 'completion handler should be locatable')
  assert.equal(
    /first_output_seen/.test(completionHandler.replace(/\/\/[^\n]*/g, '')),
    false,
    'first_output_seen must not fire on backend completion alone',
  )
  assert.ok(
    /subtitleRows\.length === 0\) return[\s\S]{0,400}first_output_seen/.test(pageSrc),
    'first_output_seen must be gated on rendered subtitle rows',
  )
})

test('after signing in, a claimed guest job resolves to a usable result', async () => {
  const statuses = [
    completed({ requiresAuth: true }),
    completed({ result: { downloadUrl: '/api/download/a.srt', fileName: 'a.srt' } }),
  ]
  let claimed = false
  const resolved = await resolveCompletedJobResultWith(
    'job-1',
    'tok',
    statuses[0],
    deps({
      ensureGuestJobClaimed: async () => {
        claimed = true
      },
      getJobStatus: async () => (claimed ? statuses[1] : statuses[0]),
    }),
    2,
  )
  assert.equal(claimed, true)
  assert.equal(resolved.kind, 'ready')
  assert.equal(resolvedJobIsSuccessful(resolved), true)
})
