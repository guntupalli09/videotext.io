import test from 'node:test'
import assert from 'node:assert/strict'

import {
  eventTierRank,
  classifyUser,
  isHotLead,
  isUserConverted,
  computeFunnelRates,
  extractIntentProps,
  isValidRange,
  rangeStartDate,
  type IntentEventRecord,
} from '../src/services/conversionIntent'

function evt(eventName: string, ts: string, metadata: Record<string, unknown> = {}): IntentEventRecord {
  return { eventName, createdAt: new Date(ts), metadata }
}

// ── eventTierRank / precedence ─────────────────────────────────────────────

test('eventTierRank: pricing_page_view is lowest tier', () => {
  assert.equal(eventTierRank('pricing_page_view'), 1)
})

test('eventTierRank: upgrade_clicked outranks pricing_page_view', () => {
  assert.ok(eventTierRank('upgrade_clicked') > eventTierRank('pricing_page_view'))
})

test('eventTierRank: checkout-tier events (checkout_started/checkout_session_created/stripe_redirect) all outrank upgrade_clicked and are equal to each other', () => {
  const checkoutRank = eventTierRank('checkout_started')
  assert.ok(checkoutRank > eventTierRank('upgrade_clicked'))
  assert.equal(eventTierRank('checkout_started'), eventTierRank('checkout_session_created'))
  assert.equal(eventTierRank('checkout_session_created'), eventTierRank('stripe_redirect'))
})

// ── classifyUser: strongest-intent classification ──────────────────────────

test('classifyUser: single pricing_page_view -> LOW', () => {
  const result = classifyUser([evt('pricing_page_view', '2026-01-01T00:00:00Z')], false)
  assert.equal(result.intentLevel, 'LOW')
})

test('classifyUser: upgrade_clicked outranks pricing_page_view even if pricing_page_view is more recent', () => {
  const result = classifyUser([
    evt('upgrade_clicked', '2026-01-01T00:00:00Z'),
    evt('pricing_page_view', '2026-01-02T00:00:00Z'),
  ], false)
  assert.equal(result.intentLevel, 'MEDIUM')
})

test('classifyUser: checkout-tier outranks upgrade_clicked', () => {
  const result = classifyUser([
    evt('upgrade_clicked', '2026-01-01T00:00:00Z'),
    evt('checkout_started', '2026-01-01T00:05:00Z'),
  ], false)
  assert.equal(result.intentLevel, 'HIGH')
})

test('classifyUser: CONVERTED outranks checkout-tier — comes only from the isConvertedNow flag (authoritative plan), never inferred from events', () => {
  const result = classifyUser([
    evt('checkout_started', '2026-01-01T00:00:00Z'),
  ], true)
  assert.equal(result.intentLevel, 'CONVERTED')
})

test('classifyUser: full precedence order LOW < MEDIUM < HIGH < CONVERTED', () => {
  const events = [
    evt('pricing_page_view', '2026-01-01T00:00:00Z'),
    evt('upgrade_clicked', '2026-01-01T00:01:00Z'),
    evt('checkout_started', '2026-01-01T00:02:00Z'),
  ]
  assert.equal(classifyUser([events[0]], false).intentLevel, 'LOW')
  assert.equal(classifyUser(events.slice(0, 2), false).intentLevel, 'MEDIUM')
  assert.equal(classifyUser(events, false).intentLevel, 'HIGH')
  assert.equal(classifyUser(events, true).intentLevel, 'CONVERTED')
})

test('classifyUser: lastActivityAt is the latest event timestamp, independent of which event is strongest', () => {
  const result = classifyUser([
    evt('checkout_started', '2026-01-01T00:00:00Z'),
    evt('pricing_page_view', '2026-01-05T00:00:00Z'),
  ], false)
  assert.equal(result.lastActivityAt?.toISOString(), new Date('2026-01-05T00:00:00Z').toISOString())
  // strongest intent is still HIGH even though the most recent event is a LOW-tier one
  assert.equal(result.intentLevel, 'HIGH')
})

test('classifyUser: missing/null historical properties on the winning event are surfaced as null, not fabricated', () => {
  const result = classifyUser([
    evt('upgrade_clicked', '2026-01-01T00:00:00Z', {}), // old row, no remaining_imports captured historically
  ], false)
  assert.equal(result.props.remainingImports, null)
  assert.equal(result.props.tool, null)
  assert.equal(result.props.source, null)
  assert.equal(result.props.billingChoice, null)
})

test('classifyUser: props come from the highest-intent event that carries them', () => {
  const result = classifyUser([
    evt('pricing_page_view', '2026-01-01T00:00:00Z', { source: 'pricing_page', tool: 'wrong-tool' }),
    evt('upgrade_clicked', '2026-01-02T00:00:00Z', { source: 'free_plan_nudge', tool: 'transcript', remaining_imports: 1 }),
  ], false)
  assert.equal(result.props.source, 'free_plan_nudge')
  assert.equal(result.props.tool, 'transcript')
  assert.equal(result.props.remainingImports, 1)
})

test('classifyUser: does not crash on empty event list', () => {
  const result = classifyUser([], false)
  assert.equal(result.intentLevel, 'LOW')
  assert.equal(result.lastActivityAt, null)
})

// ── extractIntentProps ──────────────────────────────────────────────────────

test('extractIntentProps: accepts billing_interval or billingInterval, never fabricates missing fields', () => {
  assert.equal(extractIntentProps({ billing_interval: 'monthly' }).billingChoice, 'monthly')
  assert.equal(extractIntentProps({ billingInterval: 'annual' }).billingChoice, 'annual')
  assert.equal(extractIntentProps(null).billingChoice, null)
  assert.equal(extractIntentProps(undefined).source, null)
})

// ── isHotLead ────────────────────────────────────────────────────────────────

test('isHotLead: true for MEDIUM and HIGH, false for LOW and CONVERTED', () => {
  assert.equal(isHotLead('MEDIUM'), true)
  assert.equal(isHotLead('HIGH'), true)
  assert.equal(isHotLead('LOW'), false)
  assert.equal(isHotLead('CONVERTED'), false)
})

// ── isUserConverted ──────────────────────────────────────────────────────────

test('isUserConverted: free plan is not converted; any non-free plan is converted', () => {
  assert.equal(isUserConverted('free'), false)
  assert.equal(isUserConverted(null), false)
  assert.equal(isUserConverted(undefined), false)
  assert.equal(isUserConverted('pro'), true)
  assert.equal(isUserConverted('basic'), true)
  assert.equal(isUserConverted('agency'), true)
})

// ── computeFunnelRates ───────────────────────────────────────────────────────

test('computeFunnelRates: computes the four spec rates and returns null for zero denominators', () => {
  const rates = computeFunnelRates({ pricingVisitors: 100, upgradeClickers: 20, checkoutStarters: 10, converted: 5 })
  assert.equal(rates.pricingToUpgradePct, 20)
  assert.equal(rates.upgradeToCheckoutPct, 50)
  assert.equal(rates.checkoutToPaidPct, 50)
  assert.equal(rates.overallPricingToPaidPct, 5)

  const zero = computeFunnelRates({ pricingVisitors: 0, upgradeClickers: 0, checkoutStarters: 0, converted: 0 })
  assert.equal(zero.pricingToUpgradePct, null)
  assert.equal(zero.upgradeToCheckoutPct, null)
  assert.equal(zero.checkoutToPaidPct, null)
  assert.equal(zero.overallPricingToPaidPct, null)
})

// ── range helpers ────────────────────────────────────────────────────────────

test('isValidRange: only 24h/7d/30d/all are valid', () => {
  assert.equal(isValidRange('24h'), true)
  assert.equal(isValidRange('7d'), true)
  assert.equal(isValidRange('30d'), true)
  assert.equal(isValidRange('all'), true)
  assert.equal(isValidRange('90d'), false)
  assert.equal(isValidRange(undefined), false)
  assert.equal(isValidRange(''), false)
})

test('rangeStartDate: "all" has no lower bound; others subtract the right window', () => {
  const now = new Date('2026-08-30T00:00:00Z')
  assert.equal(rangeStartDate('all', now), null)
  assert.equal(rangeStartDate('24h', now)?.toISOString(), new Date('2026-08-29T00:00:00Z').toISOString())
  assert.equal(rangeStartDate('7d', now)?.toISOString(), new Date('2026-08-23T00:00:00Z').toISOString())
  assert.equal(rangeStartDate('30d', now)?.toISOString(), new Date('2026-07-31T00:00:00Z').toISOString())
})
