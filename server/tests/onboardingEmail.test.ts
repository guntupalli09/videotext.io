import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toolTypeToCta, proPriceLabelFromIntent } from '../src/utils/growthEmailCopy'

test('onboarding CTA maps last-used tool types to money-page paths', () => {
  assert.deepEqual(toolTypeToCta('voice-to-transcript'), {
    path: '/voice-recorder',
    label: 'Open Voice to Text',
  })
  assert.deepEqual(toolTypeToCta('guideline-formatting'), {
    path: '/guideline-format',
    label: 'Open Guideline Format',
  })
  assert.deepEqual(toolTypeToCta(null), {
    path: '/video-to-transcript',
    label: 'Open Video to Transcript',
  })
})

test('onboarding copy no longer promises YouTube or uses the raw path as the button', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/jobs/onboardingEmailCron.ts'), 'utf8')
  assert.doesNotMatch(source, /paste a YouTube URL/)
  assert.doesNotMatch(source, /Open \/video-to-transcript/)
  assert.match(source, /return_day1/)
  assert.match(source, /lastActiveAt/)
})

test('rescue email price follows event pricing_tier then standard fallback', () => {
  assert.equal(
    proPriceLabelFromIntent([{ eventName: 'pricing_page_view', createdAt: new Date(), metadata: { pricing_tier: 'ppp' } }]),
    '$3.99/mo',
  )
  assert.equal(
    proPriceLabelFromIntent([{ eventName: 'pricing_page_view', createdAt: new Date(), metadata: { pricing_tier: 'gbp' } }]),
    '£5.99/mo',
  )
  assert.equal(proPriceLabelFromIntent([]), '$7.99/mo')
})
