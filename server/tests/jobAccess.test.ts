/**
 * Security regression tests for job status disclosure and claiming.
 *
 * Context: burn-subtitles jobs started by a logged-out visitor are owned by a
 * synthesized `guest_<uuid>` id. GET /api/job/:jobId then correctly returns
 * `status: 'completed'` with `requiresAuth: true` and NO result, because a job
 * token authorizes observation but never disclosure. The client's job is to
 * claim the job after sign-in and re-fetch.
 *
 * The tempting "fix" for the resulting empty download is to reveal the result
 * to any token holder. These tests exist to make that regression loud: the job
 * token travels in URLs and sessionStorage, so token-based disclosure would
 * hand out finished files with no account at all.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isGuestUserId,
  resolveJobAccess,
  resolveClaimDecision,
} from '../src/utils/jobAccess'

const OWNER = 'user_abc123'
const OTHER_USER = 'user_zzz999'
const GUEST = 'guest_e6dd21be-51a2-46da-aede-27f5077c5073'
const TOKEN = 'jt_5f3c9a1b'
const OTHER_TOKEN = 'jt_deadbeef'

test('guest ids are recognized, real ids are not', () => {
  assert.equal(isGuestUserId(GUEST), true)
  assert.equal(isGuestUserId(OWNER), false)
  assert.equal(isGuestUserId(null), false)
  assert.equal(isGuestUserId(undefined), false)
  assert.equal(isGuestUserId(''), false)
})

test('the authenticated owner sees the result', () => {
  const access = resolveJobAccess({
    requestUserId: OWNER,
    jobUserId: OWNER,
    clientJobToken: undefined,
    jobToken: TOKEN,
  })
  assert.equal(access.allowed, true)
  assert.equal(access.allowedByUser, true)
  assert.equal(access.revealResults, true)
})

test('a token-only caller may observe status but NEVER sees the result', () => {
  const access = resolveJobAccess({
    requestUserId: null,
    jobUserId: GUEST,
    clientJobToken: TOKEN,
    jobToken: TOKEN,
  })
  assert.equal(access.allowed, true, 'status polling must still work for guests')
  assert.equal(access.allowedByUser, false)
  assert.equal(
    access.revealResults,
    false,
    'a job token must never disclose the result payload',
  )
})

test('an authenticated non-owner holding the token still does not see the result', () => {
  // The exact shape of the burn-subtitles bug: signed in, job still guest-owned.
  const access = resolveJobAccess({
    requestUserId: OWNER,
    jobUserId: GUEST,
    clientJobToken: TOKEN,
    jobToken: TOKEN,
  })
  assert.equal(access.allowed, true)
  assert.equal(access.allowedByUser, false)
  assert.equal(access.revealResults, false, 'claim first; disclosure follows ownership')
})

test('a caller with neither ownership nor a matching token is refused', () => {
  const access = resolveJobAccess({
    requestUserId: OTHER_USER,
    jobUserId: OWNER,
    clientJobToken: OTHER_TOKEN,
    jobToken: TOKEN,
  })
  assert.equal(access.allowed, false)
  assert.equal(access.revealResults, false)
})

test('two absent identities must not match each other', () => {
  // A nullish requestUserId against a nullish jobUserId would otherwise make an
  // anonymous caller the "owner" of an ownerless job.
  const bothNull = resolveJobAccess({
    requestUserId: null,
    jobUserId: null,
    clientJobToken: null,
    jobToken: null,
  })
  assert.equal(bothNull.allowedByUser, false)
  assert.equal(bothNull.allowedByToken, false)
  assert.equal(bothNull.allowed, false)
  assert.equal(bothNull.revealResults, false)

  const bothEmpty = resolveJobAccess({
    requestUserId: '',
    jobUserId: '',
    clientJobToken: '',
    jobToken: '',
  })
  assert.equal(bothEmpty.allowed, false)
  assert.equal(bothEmpty.revealResults, false)
})

test('revealResults is never granted by a token, under any combination', () => {
  const jobUsers = [GUEST, OWNER, null, '']
  for (const jobUserId of jobUsers) {
    const access = resolveJobAccess({
      requestUserId: null,
      jobUserId,
      clientJobToken: TOKEN,
      jobToken: TOKEN,
    })
    assert.equal(
      access.revealResults,
      false,
      `token-only disclosure leaked for jobUserId=${String(jobUserId)}`,
    )
  }
})

// ── Claiming ────────────────────────────────────────────────────────────────

test('an authenticated user with the token may claim a guest job', () => {
  const decision = resolveClaimDecision({
    requestUserId: OWNER,
    jobUserId: GUEST,
    clientJobToken: TOKEN,
    jobToken: TOKEN,
  })
  assert.deepEqual(decision, { kind: 'allow' })
})

test('an anonymous caller cannot claim, even with the correct token', () => {
  assert.equal(
    resolveClaimDecision({
      requestUserId: null,
      jobUserId: GUEST,
      clientJobToken: TOKEN,
      jobToken: TOKEN,
    }).kind,
    'unauthenticated',
  )
})

test('a guest identity cannot claim', () => {
  assert.equal(
    resolveClaimDecision({
      requestUserId: 'guest_someone-else',
      jobUserId: GUEST,
      clientJobToken: TOKEN,
      jobToken: TOKEN,
    }).kind,
    'unauthenticated',
  )
})

test('an authenticated user cannot claim a job without the matching token', () => {
  // Authentication alone must not let one user claim a job they never ran.
  assert.equal(
    resolveClaimDecision({
      requestUserId: OTHER_USER,
      jobUserId: GUEST,
      clientJobToken: OTHER_TOKEN,
      jobToken: TOKEN,
    }).kind,
    'invalid-token',
  )
  assert.equal(
    resolveClaimDecision({
      requestUserId: OTHER_USER,
      jobUserId: GUEST,
      clientJobToken: undefined,
      jobToken: TOKEN,
    }).kind,
    'invalid-token',
  )
})

test('a job already owned by a real account cannot be re-claimed by anyone', () => {
  assert.equal(
    resolveClaimDecision({
      requestUserId: OTHER_USER,
      jobUserId: OWNER,
      clientJobToken: TOKEN,
      jobToken: TOKEN,
    }).kind,
    'already-claimed',
  )
  // Including by its own owner — the route maps this to 409, which the client
  // treats as success since the job is attached either way.
  assert.equal(
    resolveClaimDecision({
      requestUserId: OWNER,
      jobUserId: OWNER,
      clientJobToken: TOKEN,
      jobToken: TOKEN,
    }).kind,
    'already-claimed',
  )
})

test('after a successful claim the new owner sees the result', () => {
  // Post-claim the job data carries the real userId; this is the state the
  // client must re-fetch into after calling POST /api/job/:jobId/claim.
  const access = resolveJobAccess({
    requestUserId: OWNER,
    jobUserId: OWNER,
    clientJobToken: TOKEN,
    jobToken: TOKEN,
  })
  assert.equal(access.revealResults, true)
})
