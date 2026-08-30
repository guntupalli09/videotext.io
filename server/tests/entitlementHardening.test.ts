import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveRequestPlan, hasPaidAccess, enforceSubscriptionState } from '../src/utils/subscriptionGuard'
import { resolveEffectivePlan } from '../src/utils/founderAccount'
import type { User } from '../src/models/User'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_test',
    email: 'test@example.com',
    passwordHash: '',
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelAtPeriodEnd: false,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      importCount: 0,
      resetDate: new Date(),
      importCountToday: 0,
      importCountTodayResetDate: new Date(),
      dailyMinutesToday: 0,
      dailyMinutesTodayResetDate: new Date(),
    },
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    limits: {
      minutesPerMonth: 30,
      maxVideoDuration: 30,
      maxFileSize: 100 * 1024 * 1024,
      maxConcurrentJobs: 1,
      maxLanguages: 1,
      batchEnabled: false,
      batchMaxVideos: 0,
      batchMaxDuration: 0,
      batchMaxPerDay: 0,
    },
    ...overrides,
  } as User
}

// Scenario 1: DB=pro, JWT=free → should resolve as Pro
test('resolveRequestPlan: DB pro user with stale free JWT gets pro', () => {
  const user = makeUser({ plan: 'pro' })
  assert.equal(resolveRequestPlan(user, 'free'), 'pro')
})

// Scenario 2: DB=free, JWT=pro → should resolve as Free (DB authoritative)
test('resolveRequestPlan: DB free user with inflated pro JWT gets free', () => {
  const user = makeUser({ plan: 'free' })
  assert.equal(resolveRequestPlan(user, 'pro'), 'free')
})

// Scenario 3: DB=pro with active subscription → hasPaidAccess true
test('hasPaidAccess: pro user with active subscription has paid access', () => {
  const user = makeUser({
    plan: 'pro',
    subscriptionId: 'sub_123',
    subscriptionStatus: 'active',
  })
  assert.equal(hasPaidAccess(user), true)
})

// Scenario 4: resolveEffectivePlan (founderAccount) must use DB, not JWT
test('resolveEffectivePlan: DB pro overrides stale free JWT', () => {
  const user = makeUser({ plan: 'pro', stripeCustomerId: 'cus_123' })
  const result = resolveEffectivePlan({ plan: 'free' }, user)
  assert.equal(result, 'pro')
})

test('resolveEffectivePlan: DB free not overridden by inflated pro JWT', () => {
  const user = makeUser({ plan: 'free' })
  const result = resolveEffectivePlan({ plan: 'pro' }, user)
  assert.equal(result, 'free')
})

// No user at all, JWT=pro → free (no DB record to back it)
test('resolveRequestPlan: no DB user falls back to JWT plan', () => {
  assert.equal(resolveRequestPlan(null, 'pro'), 'pro')
})

test('resolveRequestPlan: no DB user, no JWT → free', () => {
  assert.equal(resolveRequestPlan(null, undefined), 'free')
})

// Founding workflow never downgraded
test('resolveRequestPlan: founding_workflow user with free JWT stays founding_workflow', () => {
  const user = makeUser({ plan: 'founding_workflow' })
  assert.equal(resolveRequestPlan(user, 'free'), 'founding_workflow')
})

// Regression: comped/manually-granted Pro accounts (no Stripe subscription at
// all — provision-zapier-reviewer.ts, admin/support/set-plan) must read as
// paid. Previously hasPaidAccess() required a subscriptionId or a future
// billingPeriodEnd, so a plan='pro' user with both unset (the exact state
// enforceSubscriptionState() treats as "permanently active, never expires")
// was wrongly reported as unpaid — this is what broke API key creation for
// integration-testing@zapier.com.
test('hasPaidAccess: pro user with no subscriptionId and no billingPeriodEnd (permanent grant) has paid access', () => {
  const user = makeUser({ plan: 'pro', subscriptionId: undefined, billingPeriodEnd: undefined })
  assert.equal(hasPaidAccess(user), true)
})

test('hasPaidAccess: agency user with no subscriptionId and no billingPeriodEnd has paid access', () => {
  const user = makeUser({ plan: 'agency', subscriptionId: undefined, billingPeriodEnd: undefined })
  assert.equal(hasPaidAccess(user), true)
})

test('hasPaidAccess: pro user with billingPeriodEnd in the future (grace period, no subscriptionId) has paid access', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const user = makeUser({ plan: 'pro', subscriptionId: undefined, billingPeriodEnd: future })
  assert.equal(hasPaidAccess(user), true)
})

test('hasPaidAccess: pro user with billingPeriodEnd in the past and no subscriptionId is unpaid', () => {
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const user = makeUser({ plan: 'pro', subscriptionId: undefined, billingPeriodEnd: past })
  assert.equal(hasPaidAccess(user), false)
})

// enforceSubscriptionState() and hasPaidAccess() must agree: a permanent
// grant must neither be downgraded nor read as unpaid.
test('enforceSubscriptionState + hasPaidAccess agree on a permanent (non-expiring) pro grant', async () => {
  const user = makeUser({ plan: 'pro', subscriptionId: undefined, billingPeriodEnd: undefined })
  const enforced = await enforceSubscriptionState(user)
  assert.equal(enforced.plan, 'pro')
  assert.equal(hasPaidAccess(enforced), true)
})
