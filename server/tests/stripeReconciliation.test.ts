import test from 'node:test'
import assert from 'node:assert/strict'

import { classify } from '../src/services/stripeReconciliation'

test('classify: write path disabled -> always info, regardless of divergence magnitude', () => {
  const result = classify({ mrrCents: 0, activeCount: 0 }, { mrrCents: 715000, activeCount: 5 }, false)
  assert.equal(result.severity, 'info')
  assert.equal(result.writePathEnabled, false)
})

test('classify: write path enabled, matching values -> ok', () => {
  const result = classify({ mrrCents: 100000, activeCount: 3 }, { mrrCents: 100000, activeCount: 3 }, true)
  assert.equal(result.severity, 'ok')
  assert.equal(result.deltaCents, 0)
})

test('classify: write path enabled, MRR delta within tolerance (1%) -> ok', () => {
  // 100000 cents postgres vs 100500 cents stripe = 0.5% delta, well within
  // the 1%/$50-whichever-larger tolerance.
  const result = classify({ mrrCents: 100000, activeCount: 3 }, { mrrCents: 100500, activeCount: 3 }, true)
  assert.equal(result.severity, 'ok')
})

test('classify: write path enabled, MRR delta exceeds tolerance, first occurrence -> warn (not critical yet)', () => {
  // Known-bad scenario: a real Sprint-1-style bug (e.g. extraction silently
  // reverting to always-zero) would look exactly like this -- Stripe shows
  // real revenue, Postgres shows far less.
  const result = classify({ mrrCents: 0, activeCount: 3 }, { mrrCents: 715000, activeCount: 3 }, true)
  assert.equal(result.severity, 'warn')
  assert.match(result.notes, /exceeds tolerance/)
})

test('classify: write path enabled, MRR delta exceeds tolerance for a 2nd consecutive run -> critical', () => {
  const result = classify(
    { mrrCents: 0, activeCount: 3 },
    { mrrCents: 715000, activeCount: 3 },
    true,
    /* previousRunBreached */ true
  )
  assert.equal(result.severity, 'critical')
  assert.match(result.notes, /second consecutive/)
})

test('classify: write path enabled, active subscriber count mismatch -> critical regardless of MRR match (zero tolerance)', () => {
  // Exactly the demo-account-inflates-paid-count failure class from Phase 1
  // would surface here: MRR matches by coincidence, but the subscriber
  // counts disagree.
  const result = classify({ mrrCents: 100000, activeCount: 4 }, { mrrCents: 100000, activeCount: 3 }, true)
  assert.equal(result.severity, 'critical')
  assert.match(result.notes, /count mismatch/)
})

test('classify: write path enabled, zero MRR on both sides -> ok, no divide-by-zero', () => {
  const result = classify({ mrrCents: 0, activeCount: 0 }, { mrrCents: 0, activeCount: 0 }, true)
  assert.equal(result.severity, 'ok')
  assert.equal(result.deltaPct, 0)
})
