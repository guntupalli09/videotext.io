import slugMapJson from '../data/hashnode-slug-map.json'

const BLOG_URL = 'https://blog.videotext.io'

/** content/frontmatter slug → live Hashnode slug (when Hashnode appended -1 suffixes). */
const HASHNODE_LIVE_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(slugMapJson).filter(([key]) => !key.startsWith('_')),
) as Record<string, string>

/** Resolve markdown/frontmatter slug to the slug that actually 200s on blog.videotext.io. */
export function resolveHashnodeSlug(contentSlug: string): string {
  return HASHNODE_LIVE_SLUG[contentSlug] ?? contentSlug
}

/** Full URL for a blog post on the Hashnode subdomain. Accepts `/blog/slug` or bare slug. */
export function getHashnodePostUrl(pathOrSlug: string): string {
  const base = BLOG_URL.replace(/\/$/, '')
  let slug = pathOrSlug
  if (slug.startsWith('/blog/')) slug = slug.slice('/blog/'.length)
  else if (slug === '/blog' || slug === '/blog/') return `${base}/`
  return `${base}/${resolveHashnodeSlug(slug)}`
}

/** All mapped content slugs (for sitemap / audit scripts). */
export function getMappedContentSlugs(): string[] {
  return Object.keys(HASHNODE_LIVE_SLUG)
}

/** Reverse lookup: live Hashnode slug → content/frontmatter slug (when mapped). */
export function contentSlugFromLiveSlug(liveSlug: string): string | null {
  for (const [content, live] of Object.entries(HASHNODE_LIVE_SLUG)) {
    if (live === liveSlug) return content
  }
  return null
}
