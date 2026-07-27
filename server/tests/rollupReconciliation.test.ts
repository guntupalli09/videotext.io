import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyMonotonicCount, classifyNonMonotonic } from '../src/services/rollupReconciliation'

// ── classifyMonotonicCount (totalUsers/newUsers/activeUsers/jobsCreated/jobsCompleted/jobsFailed) ──

test('classifyMonotonicCount: equal values -> IDENTICAL', () => {
  assert.equal(classifyMonotonicCount(409, 409), 'IDENTICAL')
  assert.equal(classifyMonotonicCount(0, 0), 'IDENTICAL')
})

test('classifyMonotonicCount: canonical strictly less than legacy -> EXPECTED_DIVERGENCE', () => {
  // Exactly the Sprint 2/4 shape: canonical excludes guests + 4 known accounts.
  assert.equal(classifyMonotonicCount(409, 405), 'EXPECTED_DIVERGENCE')
  assert.equal(classifyMonotonicCount(1383, 583), 'EXPECTED_DIVERGENCE')
})

test('classifyMonotonicCount: canonical greater than legacy -> UNEXPLAINED', () => {
  // Structurally impossible for a true subset -- would indicate a query bug.
  assert.equal(classifyMonotonicCount(100, 105), 'UNEXPLAINED')
})

test('classifyMonotonicCount: negative value on either side -> UNEXPLAINED', () => {
  assert.equal(classifyMonotonicCount(-1, 0), 'UNEXPLAINED')
  assert.equal(classifyMonotonicCount(5, -1), 'UNEXPLAINED')
})

// ── classifyNonMonotonic (avgProcessingMs/p95ProcessingMs) ──

test('classifyNonMonotonic: equal values (including both null) -> IDENTICAL', () => {
  assert.equal(classifyNonMonotonic(100, 100), 'IDENTICAL')
  assert.equal(classifyNonMonotonic(null, null), 'IDENTICAL')
})

test('classifyNonMonotonic: unequal finite values in either direction -> EXPECTED_DIVERGENCE', () => {
  assert.equal(classifyNonMonotonic(22074, 17836), 'EXPECTED_DIVERGENCE')
  assert.equal(classifyNonMonotonic(17836, 22074), 'EXPECTED_DIVERGENCE')
})

test('classifyNonMonotonic: legacy has a value, canonical is null -> EXPECTED_DIVERGENCE (subset can shrink to zero)', () => {
  assert.equal(classifyNonMonotonic(5000, null), 'EXPECTED_DIVERGENCE')
})

test('classifyNonMonotonic: canonical has a value while legacy is null -> UNEXPLAINED (structurally impossible)', () => {
  assert.equal(classifyNonMonotonic(null, 5000), 'UNEXPLAINED')
})

test('classifyNonMonotonic: non-finite values -> UNEXPLAINED', () => {
  assert.equal(classifyNonMonotonic(NaN, 100), 'UNEXPLAINED')
  assert.equal(classifyNonMonotonic(100, Infinity), 'UNEXPLAINED')
})
