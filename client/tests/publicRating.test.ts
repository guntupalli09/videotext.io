import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PUBLIC_RATING_COUNT_FALLBACK,
  formatPublicRatingCount,
  formatPublicRatingValue,
  getAggregateRatingJsonLd,
  parsePublicRating,
} from '../src/lib/publicRating'

test('parsePublicRating accepts live average + count', () => {
  const parsed = parsePublicRating({ averageRating: 4.2, ratingCount: 45 })
  assert.deepEqual(parsed, { averageRating: 4.2, ratingCount: 45 })
})

test('parsePublicRating uses the Founders count fallback when the API is average-only', () => {
  const parsed = parsePublicRating({ averageRating: 4.2 })
  assert.deepEqual(parsed, { averageRating: 4.2, ratingCount: PUBLIC_RATING_COUNT_FALLBACK })
})

test('parsePublicRating rejects fabricated or empty payloads', () => {
  assert.equal(parsePublicRating(null), null)
  assert.equal(parsePublicRating({ averageRating: null }), null)
  assert.equal(parsePublicRating({ averageRating: 9.9, ratingCount: 45 }), null)
  assert.equal(parsePublicRating({ averageRating: 4.9, ratingCount: 0 }), null)
})

test('AggregateRating JSON-LD uses the real numbers with 5/1 bounds', () => {
  const jsonLd = getAggregateRatingJsonLd({ averageRating: 4.2, ratingCount: 45 })
  assert.deepEqual(jsonLd, {
    '@type': 'AggregateRating',
    ratingValue: '4.2',
    ratingCount: '45',
    reviewCount: '45',
    bestRating: '5',
    worstRating: '1',
  })
  assert.equal(formatPublicRatingValue({ averageRating: 4.2, ratingCount: 45 }), '4.2')
  assert.equal(formatPublicRatingCount({ averageRating: 4.2, ratingCount: 45 }), '45 ratings')
})
