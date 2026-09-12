import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const heroSrc = readFileSync(resolve(process.cwd(), 'src/components/figma/Hero.tsx'), 'utf8')

test('homepage hero no longer hard-codes the old unsupported 4.9 / 5 rating', () => {
  assert.doesNotMatch(heroSrc, /4\.9\s*\/\s*5/)
})

test('homepage hero does not swap in another hard-coded rating (e.g. 4.2 / 5)', () => {
  assert.doesNotMatch(heroSrc, /4\.2\s*\/\s*5/)
  assert.doesNotMatch(heroSrc, />\s*\d\.\d\s*\/\s*5\s*</)
})

test('homepage hero fetches the canonical public rating endpoint via the API origin helper', () => {
  assert.match(heroSrc, /api\(["']\/api\/stats\/public\/rating["']\)/)
  assert.doesNotMatch(heroSrc, /fetch\(["']\/api\/stats\/public\/rating["']\)/)
})

test('homepage hero renders the fetched average and count, not a fabricated fallback', () => {
  assert.match(heroSrc, /formatPublicRatingValue\(publicRating\)/)
  assert.match(heroSrc, /formatPublicRatingCount\(publicRating\)/)
  assert.match(heroSrc, /publicRating\s*!=\s*null/)
})

test('rating fetch failure is swallowed silently, never surfaces a fake value', () => {
  const hookBody = heroSrc.split('function usePublicRating')[1]?.split('\nfunction ')[0]
  assert.ok(hookBody, 'usePublicRating hook must exist')
  assert.match(hookBody!, /\.catch\(/)
  assert.doesNotMatch(hookBody!, /setRating\(\{\s*averageRating:\s*4\.9/)
  assert.doesNotMatch(hookBody!, /setRating\(\{\s*averageRating:\s*4\.2/)
})

test('Hero component renders synchronously (headline/CTAs are not gated on the rating fetch)', () => {
  assert.doesNotMatch(heroSrc, /if\s*\(\s*publicRating\s*==\s*null\s*\)\s*return\s*null/)
  assert.match(heroSrc, /export function Hero\(\)/)
})
