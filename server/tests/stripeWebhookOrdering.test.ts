import test from 'node:test'
import assert from 'node:assert/strict'

import { isStaleSubscriptionEvent } from '../src/utils/subscriptionEventOrdering'

test('isStaleSubscriptionEvent: no prior event applied -> never stale', () => {
  assert.equal(isStaleSubscriptionEvent(undefined, 1700000000), false)
})

test('isStaleSubscriptionEvent: event older than the last applied one -> stale (rejected)', () => {
  // Reproduces the exact production bug found in the 2026-08 revenue-leakage
  // audit: a customer.subscription.deleted (created T1) is applied first,
  // then an out-of-order customer.subscription.updated (created T0 < T1, an
  // earlier past_due notification) is delivered late.
  const lastAppliedAt = new Date('2026-07-15T10:49:35.686Z') // T1, already applied
  const olderEventCreated = Math.floor(new Date('2026-07-15T10:30:00.000Z').getTime() / 1000) // T0 < T1
  assert.equal(isStaleSubscriptionEvent(lastAppliedAt, olderEventCreated), true)
})

test('isStaleSubscriptionEvent: event newer than the last applied one -> not stale (applied)', () => {
  const lastAppliedAt = new Date('2026-07-15T10:30:00.000Z')
  const newerEventCreated = Math.floor(new Date('2026-07-15T10:49:35.686Z').getTime() / 1000)
  assert.equal(isStaleSubscriptionEvent(lastAppliedAt, newerEventCreated), false)
})

test('isStaleSubscriptionEvent: same-second event -> not stale (ties pass through)', () => {
  const at = new Date('2026-07-15T10:49:35.000Z')
  assert.equal(isStaleSubscriptionEvent(at, Math.floor(at.getTime() / 1000)), false)
})
