/**
 * Guards for the PostHog identity gap behind the 2026-09-14 investigation.
 *
 * A user signed up, their guest job was claimed, Job.userId became their real
 * id, and the founder dashboard showed their Gmail — while PostHog had neither
 * the email nor the user id. Two causes:
 *
 *   1. identify() ran from exactly one place, trackPlanUpgraded, so a FREE
 *      user's email never reached PostHog at all. Measured: only 10-25% of new
 *      persons per day carried an email, against 159 completed signups in 14
 *      days.
 *   2. POST /jobs/:id/claim reconciled Postgres and the usage counters but
 *      never told PostHog the guest id and the user id were the same person,
 *      so the guest's job events stayed on an orphan profile.
 *
 * These are source-level assertions. The failure mode is a call site being
 * dropped or an email stopping being passed, which is what reading the wiring
 * catches; exercising it for real needs a live PostHog client, Postgres and
 * Redis, none of which belong in a unit test.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..', '..')
const read = (...p: string[]) => fs.readFileSync(path.join(repoRoot, ...p), 'utf8')

const analyticsSrc = read('server', 'src', 'utils', 'analytics.ts')
const authSrc = read('server', 'src', 'routes', 'auth.ts')
const jobsSrc = read('server', 'src', 'routes', 'jobs.ts')
const clientAnalyticsSrc = read('client', 'src', 'lib', 'analytics.ts')

/** Strip comments so prose about a rule cannot satisfy the rule's own guard. */
function code(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

// ── identity is set server-side, not only on upgrade ────────────────────────

test('identify is no longer reachable only through trackPlanUpgraded', () => {
  const body = code(analyticsSrc)
  assert.ok(
    body.includes('export function identifyAuthenticatedUser'),
    'a reusable server-side identify helper must exist',
  )
  const identifyCalls = [...body.matchAll(/\bidentify\(/g)]
  assert.ok(
    identifyCalls.length >= 2,
    'identify must be called from more than the plan-upgrade path',
  )
})

/** Slice a function body out of one consistently-stripped source. */
function fnBody(src: string, startMarker: string, endMarker: string): string {
  const stripped = code(src)
  const start = stripped.indexOf(startMarker)
  assert.ok(start > -1, `missing ${startMarker}`)
  const end = stripped.indexOf(endMarker, start + startMarker.length)
  return stripped.slice(start, end > -1 ? end : undefined)
}

test('identifyAuthenticatedUser sets the email and aliases prior ids', () => {
  const body = fnBody(
    analyticsSrc,
    'export function identifyAuthenticatedUser',
    'function capture',
  )
  assert.ok(/email/.test(body), 'must attach the email')
  assert.ok(/alias\(params\.user_id, params\.anonymous_id\)/.test(body), 'must alias the browser id')
  assert.ok(/alias\(params\.user_id, params\.guest_user_id\)/.test(body), 'must alias the guest id')
})

test('alias points the old id at the canonical one, and never at itself', () => {
  const fn = analyticsSrc.slice(analyticsSrc.indexOf('function alias('))
  const body = fn.slice(0, fn.indexOf('\n/**', 1))
  assert.ok(
    /distinctId:\s*canonicalId/.test(body) && /alias:\s*previousId/.test(body),
    'posthog-node shape is { distinctId: <canonical>, alias: <old> }',
  )
  assert.ok(
    /canonicalId === previousId/.test(body),
    'aliasing an id to itself must be a no-op',
  )
})

// ── every authenticated entry point identifies ──────────────────────────────

test('Google auth passes the email through to PostHog', () => {
  const body = code(authSrc)
  const calls = [...body.matchAll(/trackGoogleAuthCompleted\(\{[^}]*\}\)/g)]
  assert.ok(calls.length >= 2, 'both the new-user and existing-user paths')
  for (const [call] of calls) {
    assert.ok(/email:/.test(call), `Google auth must send the email: ${call}`)
  }
  const googleFn = fnBody(
    analyticsSrc,
    'export function trackGoogleAuthCompleted',
    'export function trackDemoLoginStarted',
  )
  assert.ok(
    /identifyAuthenticatedUser\(/.test(googleFn),
    'trackGoogleAuthCompleted must identify before capturing',
  )
  assert.ok(
    googleFn.indexOf('identifyAuthenticatedUser(') < googleFn.indexOf('capture('),
    'identify must run before the capture so the person exists first',
  )
})

test('complete-signup identifies the new account', () => {
  const body = code(authSrc)
  const signupIdx = body.indexOf("router.post('/complete-signup'")
  assert.ok(signupIdx > -1)
  const handler = body.slice(signupIdx, signupIdx + 4000)
  assert.ok(
    /identifyAuthenticatedUser\(\{[\s\S]*?email:/.test(handler),
    'a completed signup must attach the email to its PostHog person',
  )
})

// ── the claim endpoint stitches the guest identity ──────────────────────────

test('claiming a guest job tells PostHog the two ids are one person', () => {
  const body = code(jobsSrc)
  const claimIdx = body.indexOf("router.post('/:jobId/claim'")
  assert.ok(claimIdx > -1, 'claim endpoint should exist')
  const handler = body.slice(claimIdx, body.indexOf('router.', claimIdx + 10))

  assert.ok(
    /prisma\.job\.updateMany/.test(handler),
    'sanity: the handler still reconciles Postgres',
  )
  assert.ok(
    /identifyAuthenticatedUser\(/.test(handler),
    'reconciling Postgres without telling PostHog is the original bug',
  )
  assert.ok(
    /guest_user_id:/.test(handler),
    'the guest id must be aliased so its job events stitch on',
  )
  assert.ok(
    /anonymous_id:\s*readAnonymousId\(req\)/.test(handler),
    'the browser id must be aliased so pre-signup events stitch on',
  )
})

test('analytics failures never fail a claim', () => {
  const body = code(jobsSrc)
  const claimIdx = body.indexOf("router.post('/:jobId/claim'")
  const handler = body.slice(claimIdx, body.indexOf('router.', claimIdx + 10))
  const identifyIdx = handler.indexOf('identifyAuthenticatedUser(')
  const before = handler.slice(0, identifyIdx)
  assert.ok(
    before.lastIndexOf('try {') > before.lastIndexOf('} catch'),
    'the identify call must sit inside a try block',
  )
})

// ── the client probe must not silence slow connections ──────────────────────

test('the ad-block probe fails open on a timeout', () => {
  const body = code(clientAnalyticsSrc)
  const fn = body.slice(body.indexOf('function probeAndOptOutIfBlocked'))
  const probe = fn.slice(0, fn.indexOf('export function startAdBlockProbe'))

  assert.ok(/timedOut/.test(probe), 'a timeout must be distinguishable from a block')
  assert.ok(
    /if \(timedOut\) return/.test(probe),
    'a timeout must NOT opt out — that silenced slow connections permanently',
  )

  const timeoutMs = probe.match(/controller\.abort\(\),\s*(\d+)\)/)
  assert.ok(timeoutMs, 'probe should have an explicit timeout')
  assert.ok(
    Number(timeoutMs[1]) >= 10000,
    `probe timeout ${timeoutMs[1]}ms is too tight for a slow link mid-upload`,
  )
})
