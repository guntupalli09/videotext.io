import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isFlagEnabled,
  DASHBOARD_SHADOW_COMPUTE,
  DASHBOARD_CANONICAL_CUTOVER,
  MRR_EXTRACTION_V2_SHADOW,
  MRR_EXTRACTION_V2_WRITE,
  STRIPE_RECONCILIATION_ENABLED,
} from '../src/utils/featureFlags'

// ── Flag-parsing rule (the logic every exported flag is built from) ───────

test('isFlagEnabled: unset/undefined -> false', () => {
  assert.equal(isFlagEnabled(undefined), false)
})

test('isFlagEnabled: "true"/"1"/"yes" (any case, with whitespace) -> true', () => {
  assert.equal(isFlagEnabled('true'), true)
  assert.equal(isFlagEnabled('TRUE'), true)
  assert.equal(isFlagEnabled('True'), true)
  assert.equal(isFlagEnabled('1'), true)
  assert.equal(isFlagEnabled('yes'), true)
  assert.equal(isFlagEnabled('YES'), true)
  assert.equal(isFlagEnabled('  true  '), true)
})

test('isFlagEnabled: anything else (including "false", "0", "no", empty string, garbage) -> false', () => {
  assert.equal(isFlagEnabled('false'), false)
  assert.equal(isFlagEnabled('0'), false)
  assert.equal(isFlagEnabled('no'), false)
  assert.equal(isFlagEnabled(''), false)
  assert.equal(isFlagEnabled('enabled'), false)
  assert.equal(isFlagEnabled('2'), false)
})

// ── Sprint 6 requirement: "feature flags off by default" ─────────────────
// These assert the actual exported values in this process, which reflect
// the real environment this test suite runs in (no DASHBOARD_* or
// MRR_EXTRACTION_V2_*/STRIPE_RECONCILIATION_* env vars are set anywhere in
// this repo's default configuration) -- if any of these ever flip to `true`
// by default, this test fails loudly, which is exactly the point.

test('Sprint 5/6 dashboard flags default to false in this environment', () => {
  assert.equal(DASHBOARD_SHADOW_COMPUTE, false)
  assert.equal(DASHBOARD_CANONICAL_CUTOVER, false)
})

test('Sprint 1/3 MRR and reconciliation flags default to false in this environment', () => {
  assert.equal(MRR_EXTRACTION_V2_SHADOW, false)
  assert.equal(MRR_EXTRACTION_V2_WRITE, false)
  assert.equal(STRIPE_RECONCILIATION_ENABLED, false)
})
