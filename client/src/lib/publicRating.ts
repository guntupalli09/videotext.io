/**
 * Shared public star-rating helpers used by the homepage hero and prerender.
 * Numbers come from GET /api/stats/public/rating, which uses the same
 * canonical aggregation as the Founder Dashboard.
 */

export interface PublicRating {
  averageRating: number
  ratingCount: number
}

export interface PublicRatingResponse {
  averageRating: number | null
  ratingCount?: number | null
}

/**
 * Last-known Founders aggregate used only when the live API returns an
 * average but omits ratingCount (the field shipped after the average-only
 * endpoint). Never used as a fabricated average.
 */
export const PUBLIC_RATING_COUNT_FALLBACK = 45

export function parsePublicRating(data: unknown): PublicRating | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as PublicRatingResponse
  if (typeof raw.averageRating !== 'number' || !Number.isFinite(raw.averageRating)) return null
  if (raw.averageRating < 1 || raw.averageRating > 5) return null

  let count: number
  if (raw.ratingCount == null) {
    count = PUBLIC_RATING_COUNT_FALLBACK
  } else if (typeof raw.ratingCount === 'number' && Number.isFinite(raw.ratingCount) && raw.ratingCount >= 1) {
    count = Math.round(raw.ratingCount)
  } else {
    return null
  }

  return {
    averageRating: Math.round(raw.averageRating * 10) / 10,
    ratingCount: count,
  }
}

export function formatPublicRatingValue(rating: PublicRating): string {
  return rating.averageRating.toFixed(1)
}

export function formatPublicRatingCount(rating: PublicRating): string {
  return `${rating.ratingCount} rating${rating.ratingCount === 1 ? '' : 's'}`
}

export function getAggregateRatingJsonLd(rating: PublicRating) {
  const ratingValue = formatPublicRatingValue(rating)
  const count = String(rating.ratingCount)
  return {
    '@type': 'AggregateRating' as const,
    ratingValue,
    ratingCount: count,
    reviewCount: count,
    bestRating: '5',
    worstRating: '1',
  }
}

declare global {
  interface Window {
    __PUBLIC_RATING__?: PublicRating
  }
}

export function readBootstrappedPublicRating(): PublicRating | null {
  if (typeof window === 'undefined') return null
  return parsePublicRating(window.__PUBLIC_RATING__)
}
