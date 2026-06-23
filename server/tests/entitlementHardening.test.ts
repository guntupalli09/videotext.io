import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveRequestPlan, hasPaidAccess } from '../src/utils/subscriptionGuard'
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
