#!/usr/bin/env node
/**
 * Smoke test: fetch 10 URLs and assert title, meta description, canonical, FAQ/Breadcrumb JSON-LD sanity.
 * FAQPage & BreadcrumbList in raw HTML are optional (react-helmet adds after load); duplicates in ld+json fail.
 * No flaky deps; uses fetch. Run after build with BASE_URL pointing at served client (e.g. http://localhost:4173).
 * Run from repo root: npx tsx scripts/seo/smoke-seo-output.ts
 */
import * as path from 'path'
import * as fs from 'fs'
import { countFaqPageInJsonLdScripts, countBreadcrumbListInJsonLdScripts } from './jsonLdUtils'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

const STATIC_PATHS = ['/', '/pricing', '/faq']
const CORE_TOOL_PATHS = ['/video-to-transcript', '/video-to-subtitles']
const FIVE_SEO_PATHS = ['/video-to-text', '/mp4-to-srt', '/subtitle-generator', '/srt-translator', '/meeting-transcript']

const TEN_PATHS = [...STATIC_PATHS, ...CORE_TOOL_PATHS, ...FIVE_SEO_PATHS]

/** Parse registry file: path -> number of FAQ items (0 if no faq or path not found). */
function getRegistryFaqCountByPath(): Map<string, number> {
  const out = new Map<string, number>()
  if (!fs.existsSync(REGISTRY_PATH)) return out
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const pathRe = /path:\s*'(\/[^']+)'/g
  const matches = [...content.matchAll(pathRe)]
  for (let i = 0; i < matches.length; i++) {
    const p = matches[i][1]
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index! : content.length
    const block = content.slice(matches[i].index!, blockEnd)
    const faqMatch = block.match(/faq:\s*\[\n([\s\S]*?)\n    \],/)
    const count = faqMatch ? (faqMatch[1].match(/\{\s*q:\s*'/g) || []).length : 0
    out.set(p, count)
  }
  return out
}

function parseHtml(html: string): {
  title: string | null
  metaDescription: string | null
  canonical: string | null
  breadcrumbList: boolean
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
  const registryFaqCount = getRegistryFaqCountByPath()
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
      const expectedPath = p === '/' ? '' : p
      const expectedCanonical = `${base}${expectedPath}`
      if (!canonical || canonical !== expectedCanonical) {
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
      const expectFaqPage = p === '/faq' || (registryFaqCount.get(p) ?? 0) > 0
      if (!expectFaqPage && faqJsonLdCount > 0) {
        console.error(`[smoke] ${url}: FAQPage JSON-LD should not be present (registry has no FAQs for this path)`)
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
