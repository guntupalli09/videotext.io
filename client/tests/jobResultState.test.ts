/**
 * Regression tests for the burn-subtitles "Download is not ready yet" bug.
 *
 * A guest ran burn-subtitles, the worker succeeded, and GET /api/job/:jobId
 * correctly withheld the payload (`requiresAuth: true`, no `result`) because the
 * job was still guest-owned. The page stored the auth-gate placeholder
 * `{ downloadUrl: '' }`, which is TRUTHY, then took an `else if (result)` branch
 * that concluded the result was already loaded and never re-fetched it after the
 * job was claimed. The UI showed "Video ready" with an enabled Download button
 * over a blank URL; clicking it threw DownloadNotReadyError without ever issuing
 * a request.
 *
 * These tests pin the three invariants that make that combination impossible.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canDownloadResult,
  hasDownloadableResult,
  needsResultRefetchAfterClaim,
  phaseForResolvedJob,
  phaseRecoveryCopy,
  type JobResultPhase,
} from '../src/lib/jobResultState'
import type { ResolvedCompletedJob } from '../src/lib/resolveCompletedJob'

const AUTH_GATE_PLACEHOLDER = { downloadUrl: '' }
const USABLE = { downloadUrl: '/api/download/clip_video_with_subtitles_burned_in.mp4' }

test('the auth-gate placeholder is truthy but is not a downloadable result', () => {
  // The exact trap: a plain `if (result)` passes on this object.
  assert.equal(Boolean(AUTH_GATE_PLACEHOLDER), true)
  assert.equal(hasDownloadableResult(AUTH_GATE_PLACEHOLDER), false)
})

test('hasDownloadableResult rejects null, undefined, empty and whitespace URLs', () => {
  assert.equal(hasDownloadableResult(null), false)
  assert.equal(hasDownloadableResult(undefined), false)
  assert.equal(hasDownloadableResult({}), false)
  assert.equal(hasDownloadableResult({ downloadUrl: '' }), false)
  assert.equal(hasDownloadableResult({ downloadUrl: '   ' }), false)
  assert.equal(hasDownloadableResult(USABLE), true)
})

test('needsResultRefetchAfterClaim is true for the placeholder the auth gate stores', () => {
  // This is the assertion that would have caught the shipped bug: the page
  // must re-resolve after claiming, not conclude "already in memory".
  assert.equal(needsResultRefetchAfterClaim(AUTH_GATE_PLACEHOLDER), true)
  assert.equal(needsResultRefetchAfterClaim(null), true)
  assert.equal(needsResultRefetchAfterClaim(USABLE), false)
})

test('a withheld guest result maps to authentication-required, never ready', () => {
  const resolved: ResolvedCompletedJob = {
    kind: 'auth-gate',
    status: { status: 'completed', progress: 100, requiresAuth: true } as never,
  }
  assert.equal(phaseForResolvedJob(resolved), 'authentication-required')
})

test('a resolution that ran out of retries maps to completed-awaiting-result', () => {
  const resolved: ResolvedCompletedJob = {
    kind: 'missing',
    status: { status: 'completed', progress: 100 } as never,
  }
  assert.equal(phaseForResolvedJob(resolved), 'completed-awaiting-result')
})

test('a ready job carrying no downloadUrl must not be treated as ready', () => {
  // Backend completion is not client readiness. `kind: 'ready'` alone is not
  // enough — the payload has to carry a URL the download endpoint can be called
  // with, or the page would enable a button over a blank string again.
  const resolved: ResolvedCompletedJob = {
    kind: 'ready',
    status: { status: 'completed', progress: 100, result: AUTH_GATE_PLACEHOLDER } as never,
  }
  assert.equal(phaseForResolvedJob(resolved), 'completed-awaiting-result')
})

test('a ready job carrying a usable downloadUrl is the only path to ready', () => {
  const resolved: ResolvedCompletedJob = {
    kind: 'ready',
    status: { status: 'completed', progress: 100, result: USABLE } as never,
  }
  assert.equal(phaseForResolvedJob(resolved), 'ready')
})

test('Download is enabled only in the ready phase AND with a usable URL', () => {
  // The precise combination the user hit: phase says ready, URL is blank.
  assert.equal(canDownloadResult('ready', AUTH_GATE_PLACEHOLDER), false)
  assert.equal(canDownloadResult('ready', null), false)
  // And the mirror image: a usable URL still behind a non-ready phase.
  assert.equal(canDownloadResult('authentication-required', USABLE), false)
  assert.equal(canDownloadResult('completed-awaiting-result', USABLE), false)
  assert.equal(canDownloadResult('processing', USABLE), false)
  assert.equal(canDownloadResult('failed', USABLE), false)
  assert.equal(canDownloadResult('idle', USABLE), false)
  // Only this one.
  assert.equal(canDownloadResult('ready', USABLE), true)
})

test('no phase other than ready can ever authorize a download', () => {
  const phases: JobResultPhase[] = [
    'idle',
    'processing',
    'completed-awaiting-result',
    'authentication-required',
    'failed',
  ]
  for (const phase of phases) {
    assert.equal(canDownloadResult(phase, USABLE), false, `${phase} must not be downloadable`)
  }
})

test('both non-success terminal phases offer distinct, actionable recovery copy', () => {
  const awaiting = phaseRecoveryCopy('completed-awaiting-result')
  const needsAuth = phaseRecoveryCopy('authentication-required')
  assert.ok(awaiting && awaiting.title && awaiting.detail)
  assert.ok(needsAuth && needsAuth.title && needsAuth.detail)
  assert.notEqual(awaiting!.title, needsAuth!.title)
  // Success and pre-terminal phases have nothing to recover from.
  assert.equal(phaseRecoveryCopy('ready'), null)
  assert.equal(phaseRecoveryCopy('processing'), null)
})
