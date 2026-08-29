import test from 'node:test'
import assert from 'node:assert/strict'
import { getFreePlanNudgeState } from '../src/lib/freePlanConversion'
import { isPaidPlan } from '../src/lib/plans'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('progresses only after successful free imports', () => {
  assert.equal(getFreePlanNudgeState(0, 3), 'hidden')
  assert.equal(getFreePlanNudgeState(1, 2), 'two_remaining')
  assert.equal(getFreePlanNudgeState(2, 1), 'one_remaining')
  assert.equal(getFreePlanNudgeState(3, 0), 'exhausted')
})

test('shared inline conversion surfaces explicitly choose monthly checkout', () => {
  for (const file of ['FreePlanNudge.tsx', 'PaywallModal.tsx', 'UpgradeBanner.tsx', 'ProResultNudge.tsx']) {
    const source = readFileSync(resolve(process.cwd(), 'src/components', file), 'utf8')
    assert.match(source, /billingInterval:\s*['"]monthly['"]/, file)
    assert.doesNotMatch(source, /\bprice(Id)?\s*:/, file)
  }
})

test('all quota-consuming core result pages mount the shared nudge', () => {
  for (const file of ['VideoToTranscript.tsx', 'VideoToSubtitles.tsx', 'TranslateSubtitles.tsx', 'FixSubtitles.tsx', 'BurnSubtitles.tsx', 'CompressVideo.tsx', 'VoiceRecorder.tsx']) {
    const source = readFileSync(resolve(process.cwd(), 'src/pages', file), 'utf8')
    assert.match(source, /<FreePlanNudge\b/, file)
  }
  const guideline = readFileSync(resolve(process.cwd(), 'src/pages/GuidelineFormat.tsx'), 'utf8')
  assert.match(guideline, /<ProResultNudge\b/)
  assert.doesNotMatch(guideline, /<FreePlanNudge\b/)
})

test('PaywallModal owns its impression and has no competing navigation callback', () => {
  const modal = readFileSync(resolve(process.cwd(), 'src/components/PaywallModal.tsx'), 'utf8')
  assert.equal((modal.match(/paywall_shown/g) || []).length, 1)
  assert.doesNotMatch(modal, /onUpgrade/)
})

test('all legitimate current and legacy paid plans suppress Free conversion UI', () => {
  for (const plan of ['basic', 'pro', 'agency', 'founding_workflow', 'business']) assert.equal(isPaidPlan(plan), true)
  assert.equal(isPaidPlan('free'), false)
  assert.equal(isPaidPlan(null), false)
})
