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
  // No literal "<digit>.<digit> / 5" anywhere in the file — the rating text
  // must come from the fetched averageRating value, not a new constant.
  assert.doesNotMatch(heroSrc, />\s*\d\.\d\s*\/\s*5\s*</)
})

test('homepage hero fetches the canonical public rating endpoint', () => {
  assert.match(heroSrc, /fetch\(["']\/api\/stats\/public\/rating["']\)/)
})

test('homepage hero renders the fetched averageRating, not a fabricated fallback', () => {
  assert.match(heroSrc, /averageRating\.toFixed\(1\)/)
  assert.match(heroSrc, /averageRating\s*!=\s*null/)
})

test('homepage hero does not display a ratings count alongside the average', () => {
  assert.doesNotMatch(heroSrc, /\d+\s*ratings?\b/i)
})

test('rating fetch failure is swallowed silently, never surfaces a fake value', () => {
  const hookBody = heroSrc.split('function useAverageRating')[1]?.split('\nfunction ')[0]
  assert.ok(hookBody, 'useAverageRating hook must exist')
  assert.match(hookBody!, /\.catch\(/)
  assert.doesNotMatch(hookBody!, /setRating\(4\.9\)/)
  assert.doesNotMatch(hookBody!, /setRating\(4\.2\)/)
})

test('Hero component renders synchronously (headline/CTAs are not gated on the rating fetch)', () => {
  // The averageRating hook must be called but never awaited/blocked on before
  // the section/headline markup — i.e. no top-level await or suspense guard
  // wrapping the returned JSX because of the rating fetch.
  assert.doesNotMatch(heroSrc, /if\s*\(\s*averageRating\s*==\s*null\s*\)\s*return\s*null/)
  assert.match(heroSrc, /export function Hero\(\)/)
})
