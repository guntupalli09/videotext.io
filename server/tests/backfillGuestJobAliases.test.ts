/**
 * Tests for the guest-job alias backfill's selection rules.
 *
 * selectAliasPairs() decides exactly what --apply writes into PostHog, and a
 * merge has no documented reversal — so the rules are tested here rather than
 * discovered against production. The IO around it (Prisma, the HogQL read, the
 * alias emit) is not unit-tested; the dry run is what verifies that, against
 * real data, before anything is written.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  selectAliasPairs,
  type GuestJob,
} from '../scripts/backfillGuestJobAliases'

const GUEST_A = 'guest_03d63740-ffe0-4e0e-9d57-82c3f8b1669b'
const USER_A = '6c55fdb7-1947-436f-b6af-c6d98356d7cc'
const JOB_A = 'c9fbe063-40d5-48a8-825e-0510aa36ab6e'

function jobs(...rows: [string, string][]): GuestJob[] {
  return rows.map(([job_id, guest_distinct_id]) => ({ job_id, guest_distinct_id }))
}

test('the incident job produces exactly one alias pair', () => {
  const res = selectAliasPairs(
    jobs([JOB_A, GUEST_A]),
    new Map([[JOB_A, USER_A]]),
    new Set(),
  )
  assert.equal(res.pairs.length, 1)
  assert.deepEqual(res.pairs[0], {
    job_id: JOB_A,
    guest_distinct_id: GUEST_A,
    user_id: USER_A,
  })
})

test('an unclaimed job is never aliased — there is no account to merge onto', () => {
  const res = selectAliasPairs(jobs([JOB_A, GUEST_A]), new Map(), new Set())
  assert.equal(res.pairs.length, 0)
  assert.equal(res.skippedUnclaimed, 1)
})

test('a job still owned by a guest id counts as unclaimed', () => {
  // Defence in depth: resolveClaimedOwners already filters these out, but a
  // guest-to-guest alias would corrupt identities, so the selector refuses too.
  const res = selectAliasPairs(
    jobs([JOB_A, GUEST_A]),
    new Map([[JOB_A, 'guest_someone-else']]),
    new Set(),
  )
  assert.equal(res.pairs.length, 0)
  assert.equal(res.skippedUnclaimed, 1)
})

test('an already-backfilled job is skipped, so a re-run is not a re-merge', () => {
  const res = selectAliasPairs(
    jobs([JOB_A, GUEST_A]),
    new Map([[JOB_A, USER_A]]),
    new Set([JOB_A]),
  )
  assert.equal(res.pairs.length, 0)
  assert.equal(res.skippedDone, 1)
})

test('a self-alias is impossible: the owner would be guest-shaped', () => {
  // Caught by the guest-owner rule, which is why there is no separate
  // self-alias branch — one would be unreachable.
  const res = selectAliasPairs(
    jobs([JOB_A, GUEST_A]),
    new Map([[JOB_A, GUEST_A]]),
    new Set(),
  )
  assert.equal(res.pairs.length, 0)
  assert.equal(res.skippedUnclaimed, 1)
})

test('a mixed batch partitions into exactly the right buckets', () => {
  const res = selectAliasPairs(
    jobs(
      ['job-claimed-1', 'guest_1'],
      ['job-claimed-2', 'guest_2'],
      ['job-unclaimed', 'guest_3'],
      ['job-done', 'guest_4'],
      ['job-self', 'guest_5'],
      ['job-guest-owner', 'guest_6'],
    ),
    new Map([
      ['job-claimed-1', 'user-1'],
      ['job-claimed-2', 'user-2'],
      ['job-done', 'user-3'],
      ['job-self', 'guest_5'],
      ['job-guest-owner', 'guest_other'],
      // 'job-unclaimed' deliberately absent
    ]),
    new Set(['job-done']),
  )
  assert.equal(res.pairs.length, 2)
  assert.deepEqual(
    res.pairs.map((p) => p.user_id).sort(),
    ['user-1', 'user-2'],
  )
  assert.equal(res.skippedUnclaimed, 3, 'absent owner + guest-shaped owner + self')
  assert.equal(res.skippedDone, 1)
})

test('every selected pair aliases a guest id onto a non-guest id', () => {
  const res = selectAliasPairs(
    jobs(['j1', 'guest_a'], ['j2', 'guest_b'], ['j3', 'guest_c']),
    new Map([
      ['j1', 'user-1'],
      ['j2', 'user-2'],
      ['j3', 'guest_nope'],
    ]),
    new Set(),
  )
  for (const p of res.pairs) {
    assert.ok(p.guest_distinct_id.startsWith('guest_'), 'alias side must be the guest id')
    assert.ok(!p.user_id.startsWith('guest_'), 'canonical side must be a real account')
    assert.notEqual(p.guest_distinct_id, p.user_id)
  }
})

test('nothing is selected from an empty input', () => {
  const res = selectAliasPairs([], new Map(), new Set())
  assert.deepEqual(res, { pairs: [], skippedUnclaimed: 0, skippedDone: 0 })
})

test('counts always account for every input row', () => {
  const input = jobs(
    ['a', 'guest_a'],
    ['b', 'guest_b'],
    ['c', 'guest_c'],
    ['d', 'guest_d'],
  )
  const res = selectAliasPairs(
    input,
    new Map([
      ['a', 'user-1'],
      ['b', 'guest_b'],
      ['c', 'user-3'],
    ]),
    new Set(['c']),
  )
  const total = res.pairs.length + res.skippedUnclaimed + res.skippedDone
  assert.equal(total, input.length, 'no row may be silently dropped')
})
