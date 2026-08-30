import test from 'node:test'
import assert from 'node:assert/strict'
import type Stripe from 'stripe'

import { classify, findEntitlementFindings } from '../src/services/stripeReconciliation'

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

// ── Entitlement reconciliation (2026-08 revenue-leakage audit follow-up) ──

function fakeSub(overrides: Partial<{ id: string; customer: string; status: string; created: number }>): Stripe.Subscription {
  return {
    id: overrides.id ?? 'sub_1',
    customer: overrides.customer ?? 'cus_1',
    status: overrides.status ?? 'active',
    created: overrides.created ?? 1700000000,
  } as unknown as Stripe.Subscription
}

test('findEntitlementFindings: Stripe active + VideoText free -> flagged', () => {
  const subs = new Map([['cus_1', [fakeSub({ customer: 'cus_1', status: 'active' })]]])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'free', subscriptionStatus: null, subscriptionId: null }]])
  const findings = findEntitlementFindings(subs, users)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].findingType, 'STRIPE_ACTIVE_VIDEOTEXT_FREE')
})

test('findEntitlementFindings: Stripe canceled + VideoText still paid -> flagged', () => {
  const subs = new Map([['cus_1', [fakeSub({ customer: 'cus_1', status: 'canceled' })]]])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'pro', subscriptionStatus: 'past_due', subscriptionId: null }]])
  const findings = findEntitlementFindings(subs, users)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].findingType, 'STRIPE_CANCELED_VIDEOTEXT_PAID')
})

test('findEntitlementFindings: founding_workflow plan is exempt from STRIPE_CANCELED_VIDEOTEXT_PAID by design', () => {
  const subs = new Map([['cus_1', [fakeSub({ customer: 'cus_1', status: 'canceled' })]]])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'founding_workflow', subscriptionStatus: 'past_due', subscriptionId: null }]])
  const findings = findEntitlementFindings(subs, users)
  assert.equal(findings.length, 0)
})

test('findEntitlementFindings: no matching VideoText user -> MISSING_VIDEOTEXT_USER', () => {
  const subs = new Map([['cus_orphan', [fakeSub({ customer: 'cus_orphan', status: 'canceled' })]]])
  const users = new Map()
  const findings = findEntitlementFindings(subs, users)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].findingType, 'MISSING_VIDEOTEXT_USER')
})

test('findEntitlementFindings: two simultaneously active subscriptions for one customer -> DUPLICATE_ACTIVE_SUBSCRIPTION', () => {
  const subs = new Map([
    ['cus_1', [fakeSub({ id: 'sub_a', customer: 'cus_1', status: 'active' }), fakeSub({ id: 'sub_b', customer: 'cus_1', status: 'trialing' })]],
  ])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'pro', subscriptionStatus: 'active', subscriptionId: 'sub_a' }]])
  const findings = findEntitlementFindings(subs, users)
  assert.ok(findings.some((f) => f.findingType === 'DUPLICATE_ACTIVE_SUBSCRIPTION'))
})

test('findEntitlementFindings: User.subscriptionId points at a subscription that is not this customer\'s -> CUSTOMER_ID_MISMATCH', () => {
  const subs = new Map([['cus_1', [fakeSub({ id: 'sub_real', customer: 'cus_1', status: 'active' })]]])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'pro', subscriptionStatus: 'active', subscriptionId: 'sub_wrong' }]])
  const findings = findEntitlementFindings(subs, users)
  assert.ok(findings.some((f) => f.findingType === 'CUSTOMER_ID_MISMATCH'))
})

test('findEntitlementFindings: clean state -> no findings', () => {
  const subs = new Map([['cus_1', [fakeSub({ id: 'sub_a', customer: 'cus_1', status: 'active' })]]])
  const users = new Map([['cus_1', { id: 'user_1', plan: 'pro', subscriptionStatus: 'active', subscriptionId: 'sub_a' }]])
  const findings = findEntitlementFindings(subs, users)
  assert.equal(findings.length, 0)
})
