#!/usr/bin/env node
/**
 * Smoke test: fetch 10 URLs and assert title, meta description, canonical, FAQ/Breadcrumb JSON-LD sanity.
 * FAQPage & BreadcrumbList in raw HTML are optional (react-helmet adds after load); duplicates in ld+json fail.
 * Canonicals always use the production SITE_URL (prerender / index.html), not the local BASE_URL host.
 * No flaky deps; uses fetch. Run after build+prerender with BASE_URL pointing at served client (e.g. http://localhost:4173).
 * Run from repo root: npx tsx scripts/seo/smoke-seo-output.ts
 */
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'
import { countFaqPageInJsonLdScripts, countBreadcrumbListInJsonLdScripts } from './jsonLdUtils'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SITE_URL = (process.env.SITE_URL || 'https://videotext.io').replace(/\/$/, '')

const STATIC_PATHS = ['/', '/pricing', '/faq']
const CORE_TOOL_PATHS = ['/video-to-transcript', '/video-to-subtitles']
/** Self-canonical indexable pages (not slug aliases). Aliases like /video-to-text
 * collapse to a primary in prerender and 301/SPA-fallback locally. */
const FIVE_SEO_PATHS = [
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/meeting-transcription',
]

const TEN_PATHS = [...STATIC_PATHS, ...CORE_TOOL_PATHS, ...FIVE_SEO_PATHS]

function parseHtml(html: string): {
  title: string | null
  metaDescription: string | null
  canonical: string | null
} {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : null
  const canonMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)
  const canonical = canonMatch ? canonMatch[1].trim() : null
  return { title, metaDescription, canonical }
}

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'SEO-Smoke/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function main(): Promise<void> {
  const base = BASE_URL.replace(/\/$/, '')
  let failed = false
  for (const p of TEN_PATHS) {
    const url = p === '/' ? base : `${base}${p}`
    try {
      const html = await fetchUrl(url)
      const { title, metaDescription, canonical } = parseHtml(html)
      const faqJsonLdCount = countFaqPageInJsonLdScripts(html)
      const breadcrumbJsonLdCount = countBreadcrumbListInJsonLdScripts(html)
      if (!title || title.length < 2) {
        console.error(`[smoke] ${url}: missing or empty <title>`)
        failed = true
        continue
      }
      if (!metaDescription || metaDescription.length < 20) {
        console.error(`[smoke] ${url}: missing or short meta description`)
        failed = true
        continue
      }
      const canonicalPath = getCanonicalPathForRoute(p)
      const expectedCanonical =
        canonicalPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${canonicalPath}`
      const canonicalNorm = canonical ? canonical.replace(/\/$/, '') || canonical : ''
      const expectedNorm = expectedCanonical.replace(/\/$/, '')
      if (!canonical || canonicalNorm !== expectedNorm) {
        console.error(`[smoke] ${url}: canonical expected ${expectedCanonical}, got ${canonical}`)
        failed = true
        continue
      }
      if (breadcrumbJsonLdCount > 1) {
        console.error(`[smoke] ${url}: duplicate BreadcrumbList in application/ld+json (count=${breadcrumbJsonLdCount})`)
        failed = true
        continue
      }
      if (faqJsonLdCount > 1) {
        console.error(`[smoke] ${url}: duplicate FAQPage in application/ld+json (count=${faqJsonLdCount})`)
        failed = true
        continue
      }
      console.log(`[smoke] OK ${url}`)
    } catch (e) {
      console.error(`[smoke] ${url}: ${(e as Error).message}`)
      failed = true
    }
  }
  if (failed) process.exit(1)
  console.log('[smoke] All 10 URLs passed.')
}

main()
