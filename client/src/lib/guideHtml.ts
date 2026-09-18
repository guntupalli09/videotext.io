/**
 * Article bodies for /guides, loaded one at a time.
 *
 * The bodies total ~164k words; bundling them together would make every reader
 * download all 90 articles to read one. Each is emitted as its own JSON file and
 * fetched on demand.
 *
 * Two environments consume this:
 * - Browser: `loadGuideHtml` dynamically imports the single body it needs.
 * - Build (prerender/SSR): `primeGuideHtml` fills the cache up front so
 *   `getGuideHtmlSync` can serve it during the synchronous renderToString pass.
 */

const cache = new Map<string, string>()

/** Build-time only: preload bodies so SSR can render them synchronously. */
export function primeGuideHtml(entries: Array<{ slug: string; html: string }>): void {
  for (const entry of entries) cache.set(entry.slug, entry.html)
}

export function getGuideHtmlSync(slug: string): string | undefined {
  return cache.get(slug)
}

// Guarded so the Vite-only transform never evaluates under plain Node during SSR.
const bodyLoaders: Record<string, () => Promise<unknown>> =
  typeof window !== 'undefined' ? import.meta.glob('../data/guides/*.json') : {}

export async function loadGuideHtml(slug: string): Promise<string | undefined> {
  const cached = cache.get(slug)
  if (cached) return cached

  const loader = bodyLoaders[`../data/guides/${slug}.json`]
  if (!loader) return undefined

  try {
    const mod = (await loader()) as { default?: { html?: string }; html?: string }
    const html = mod.default?.html ?? mod.html
    if (typeof html !== 'string') return undefined
    cache.set(slug, html)
    return html
  } catch {
    return undefined
  }
}
