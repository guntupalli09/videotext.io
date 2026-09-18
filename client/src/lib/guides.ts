/**
 * Accessors for the long-form guides at /guides.
 *
 * Source of truth is content/guides/*.md; scripts/guides/build-guides.ts compiles
 * those to data/guides.json at build time.
 */
import guidesIndex from '../data/guides-index.json'

/** Metadata only — article bodies load separately, see lib/guideHtml.ts. */
export interface Guide {
  slug: string
  title: string
  description: string
  date?: string
  image?: string
  source_path?: string
  words: number
  readMinutes: number
  /** Two core-tool CTAs: [mid-article, end-of-article]. */
  ctas: [GuideCta, GuideCta]
}

export interface GuideCta {
  path: string
  name: string
  blurb: string
  action: string
}

const GUIDES = guidesIndex as Guide[]

/** Newest first, falling back to title order when dates tie or are absent. */
const SORTED = [...GUIDES].sort((a, b) => {
  const byDate = (b.date || '').localeCompare(a.date || '')
  return byDate !== 0 ? byDate : a.title.localeCompare(b.title)
})

export function getAllGuides(): Guide[] {
  return SORTED
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidePaths(): string[] {
  return SORTED.map((g) => `/guides/${g.slug}`)
}

export function isGuidePath(pathname: string): boolean {
  const match = pathname.match(/^\/guides\/([^/]+)\/?$/)
  return Boolean(match && getGuideBySlug(match[1]))
}

export function guideSlugFromPath(pathname: string): string | undefined {
  return pathname.match(/^\/guides\/([^/]+)\/?$/)?.[1]
}

/**
 * Related guides by title-token overlap. The source articles carry their own
 * "Related guides" links inline; this fills the rail for the rest.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'of', 'is', 'it', 'on', 'with',
  'best', 'how', 'what', 'why', 'can', 'you', 'your', '2026', 'guide', 'complete',
])

function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  )
}

export function getRelatedGuides(slug: string, limit = 6): Guide[] {
  const current = getGuideBySlug(slug)
  if (!current) return []
  const currentTokens = tokens(current.title)
  return SORTED.filter((g) => g.slug !== slug)
    .map((g) => {
      const overlap = [...tokens(g.title)].filter((t) => currentTokens.has(t)).length
      return { guide: g, overlap }
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.guide.title.localeCompare(b.guide.title))
    .slice(0, limit)
    .map((x) => x.guide)
}
