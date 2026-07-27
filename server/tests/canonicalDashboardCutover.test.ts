import test from 'node:test'
import assert from 'node:assert/strict'

import {
  tryCutoverField,
  isFiniteNonNegativeNumber,
  isFiniteRate,
  isCountArray,
} from '../src/services/canonicalDashboardCutover'

// ── Validators ──────────────────────────────────────────────────────────

test('isFiniteNonNegativeNumber: accepts 0 and positive finite numbers', () => {
  assert.equal(isFiniteNonNegativeNumber(0), true)
  assert.equal(isFiniteNonNegativeNumber(42), true)
  assert.equal(isFiniteNonNegativeNumber(3.14), true)
})

test('isFiniteNonNegativeNumber: rejects negative, NaN, Infinity, non-numbers', () => {
  assert.equal(isFiniteNonNegativeNumber(-1), false)
  assert.equal(isFiniteNonNegativeNumber(NaN), false)
  assert.equal(isFiniteNonNegativeNumber(Infinity), false)
  assert.equal(isFiniteNonNegativeNumber('5'), false)
  assert.equal(isFiniteNonNegativeNumber(null), false)
  assert.equal(isFiniteNonNegativeNumber(undefined), false)
})

test('isFiniteRate: accepts values in [0,1]', () => {
  assert.equal(isFiniteRate(0), true)
  assert.equal(isFiniteRate(0.5), true)
  assert.equal(isFiniteRate(1), true)
})

test('isFiniteRate: rejects values outside [0,1] and non-numbers', () => {
  assert.equal(isFiniteRate(1.5), false)
  assert.equal(isFiniteRate(-0.1), false)
  assert.equal(isFiniteRate(NaN), false)
  assert.equal(isFiniteRate('0.5'), false)
})

test('isCountArray: accepts a well-formed array of {keyField, count}', () => {
  assert.equal(isCountArray([{ toolType: 'a', count: 3 }, { toolType: 'b', count: 0 }], 'toolType'), true)
  assert.equal(isCountArray([], 'toolType'), true) // empty array is structurally valid
})

test('isCountArray: rejects non-arrays, missing key field, negative/non-numeric count', () => {
  assert.equal(isCountArray({ toolType: 'a', count: 3 }, 'toolType'), false) // not an array
  assert.equal(isCountArray([{ count: 3 }], 'toolType'), false) // missing key field
  assert.equal(isCountArray([{ toolType: 'a', count: -1 }], 'toolType'), false) // negative count
  assert.equal(isCountArray([{ toolType: 'a', count: '3' }], 'toolType'), false) // count not a number
  assert.equal(isCountArray(null, 'toolType'), false)
})

// ── tryCutoverField: fallback/timeout/validation behavior ──────────────
// This is the exact mechanism requirement 8 describes: "If the canonical
// query fails, times out, or returns structurally invalid data, serve the
// legacy value and emit a critical diagnostic event." Tested here with fake
// compute/apply functions -- no live database needed, and no dependency on
// canonicalDashboardCutover.ts's real Prisma-backed field computations.

test('tryCutoverField: canonical succeeds and is valid -> apply() is called with the canonical value', async () => {
  let applied: number | null = null
  await tryCutoverField(
    'test.field',
    async () => 42,
    (v) => v > 0,
    (v) => { applied = v }
  )
  assert.equal(applied, 42)
})

test('tryCutoverField: canonical computation throws -> apply() is never called (legacy value preserved)', async () => {
  let applyCalled = false
  await assert.doesNotReject(
    tryCutoverField(
      'test.field',
      async () => { throw new Error('simulated query failure') },
      () => true,
      () => { applyCalled = true }
    )
  )
  assert.equal(applyCalled, false)
})

test('tryCutoverField: canonical computation times out -> apply() is never called', async () => {
  let applyCalled = false
  await assert.doesNotReject(
    tryCutoverField(
      'test.field',
      () => new Promise((resolve) => setTimeout(() => resolve(1), 500)), // slower than the test's 50ms timeout
      () => true,
      () => { applyCalled = true },
      50 // short timeout for the test, not the real 8s production value
    )
  )
  assert.equal(applyCalled, false)
})

test('tryCutoverField: canonical returns structurally invalid data -> apply() is never called', async () => {
  let applyCalled = false
  await assert.doesNotReject(
    tryCutoverField(
      'test.field',
      async () => -5, // succeeds, but fails validation
      (v: number) => v >= 0,
      () => { applyCalled = true }
    )
  )
  assert.equal(applyCalled, false)
})

test('tryCutoverField: never throws even when compute() rejects and there is no caller-level catch', async () => {
  // This directly proves the "never affects the response's success" guarantee --
  // a caller can await this with zero try/catch of its own.
  await tryCutoverField(
    'test.field',
    async () => { throw new Error('boom') },
    () => true,
    () => { throw new Error('apply should never run') }
  )
  // If we reach this line, tryCutoverField swallowed the error as designed.
  assert.ok(true)
})
