import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly_799'
process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_pro_annual_6999'
process.env.STRIPE_PRICE_PRO_LEGACY = 'price_pro_legacy_4000'
process.env.STRIPE_PRICE_FOUNDING_WORKFLOW_MONTHLY = 'price_founding_legacy_2499'

const monthlyPrice = {
  active: true,
  currency: 'usd',
  unit_amount: 799,
  recurring: { interval: 'month', interval_count: 1 },
} as any
const annualPrice = {
  active: true,
  currency: 'usd',
  unit_amount: 6999,
  recurring: { interval: 'year', interval_count: 1 },
} as any

test('validates the exact monthly and annual Pro prices', async () => {
  const { assertProPrice } = await import('../src/services/stripe')
  assert.doesNotThrow(() => assertProPrice(monthlyPrice, 'monthly'))
  assert.doesNotThrow(() => assertProPrice(annualPrice, 'annual'))

  assert.throws(() => assertProPrice(monthlyPrice, 'annual')) // $7.99/year is invalid
  assert.throws(() => assertProPrice(annualPrice, 'monthly')) // $69.99/month is invalid
  assert.throws(() => assertProPrice({ ...monthlyPrice, unit_amount: 4000 }, 'monthly'))
  assert.throws(() => assertProPrice({ ...monthlyPrice, unit_amount: 2499 }, 'monthly'))
  assert.throws(() => assertProPrice({ ...monthlyPrice, active: false }, 'monthly'))
  assert.throws(() => assertProPrice({ ...monthlyPrice, currency: 'eur' }, 'monthly'))
})

test('server maps constrained billing intervals to server-owned Price IDs', async () => {
  const { getStripePriceConfig, selectProPriceId } = await import('../src/services/stripe')
  const config = getStripePriceConfig()
  assert.equal(selectProPriceId(config, 'monthly'), 'price_pro_monthly_799')
  assert.equal(selectProPriceId(config, 'annual'), 'price_pro_annual_6999')
})

test('new and legacy Price IDs retain their correct entitlements', async () => {
  const { getPlanFromPriceId } = await import('../src/services/stripe')
  assert.equal(getPlanFromPriceId('price_pro_monthly_799'), 'pro')
  assert.equal(getPlanFromPriceId('price_pro_annual_6999'), 'pro')
  assert.equal(getPlanFromPriceId('price_pro_legacy_4000'), 'pro')
  assert.equal(getPlanFromPriceId('price_founding_legacy_2499'), 'founding_workflow')
  assert.equal(getPlanFromPriceId('price_client_supplied_arbitrary'), null)
})
