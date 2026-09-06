#!/usr/bin/env node
/**
 * Generate split sitemaps: core (submit first) + programmatic.
 * Output: client/public/sitemap-index.xml, sitemap-core.xml, sitemap-programmatic.xml
 */
import * as path from 'path'
import * as fs from 'fs'
import { CORE_PATHS, getSitemap2Paths } from './registry'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'

const SITE_URL = (process.env.SITE_URL || 'https://videotext.io').replace('https://www.', 'https://').replace(/\/+$/, '')
const BLOG_URL = (process.env.BLOG_URL || 'https://blog.videotext.io').replace('https://www.', 'https://').replace(/\/+$/, '')
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const CLIENT_DIST_DIR = path.join(REPO_ROOT, 'client', 'dist')
const SITEMAP_SKIP = new Set(['/site-index'])

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeUrl(url: string): string {
  return url
    .replace('https://www.', 'https://')
    .replace(/\/+$/, '')
}

function assertNoMixedDomains(urls: string[]): void {
  const hasWww = urls.some((u) => u.includes('www.videotext.io'))
  const hasNonWww = urls.some((u) => u.includes('https://videotext.io'))
  if (hasWww && hasNonWww) {
    throw new Error('Mixed www and non-www URLs detected — aborting sitemap generation')
  }
}

function getCanonicalLoc(canonicalPath: string): string {
  if (canonicalPath === '/blog') return `${BLOG_URL}/`
  if (canonicalPath.startsWith('/blog/')) return `${BLOG_URL}/${canonicalPath.slice('/blog/'.length)}`
  return canonicalPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${canonicalPath}`
}

function isSitemapPath(routePath: string): boolean {
  if (!routePath || routePath === '*') return false
  if (SITEMAP_SKIP.has(routePath)) return false
  const canonicalPath = getCanonicalPathForRoute(routePath)
  if (SITEMAP_SKIP.has(canonicalPath)) return false
  return true
}

function buildNormalizedLocs(paths: string[]): string[] {
  const uniqueUrls = new Set<string>()
  for (const p of paths.filter(isSitemapPath)) {
    const canonicalPath = getCanonicalPathForRoute(p)
    const loc = getCanonicalLoc(canonicalPath)
    uniqueUrls.add(normalizeUrl(loc))
  }
  const urls = [...uniqueUrls]
  assertNoMixedDomains(urls)
  return urls
}

function buildUrlSet(paths: string[], today: string): string {
  const urls = buildNormalizedLocs(paths)
    .map((loc) => {
      const url = new URL(loc)
      const pathPart = url.pathname || '/'
      const priority = pathPart === '/' ? '1.0' : pathPart === '/pricing' ? '0.9' : pathPart.startsWith('/video-to-') || pathPart.startsWith('/mp4-') || pathPart.startsWith('/youtube-') || pathPart.startsWith('/transcribe-youtube') ? '0.9' : '0.8'
      const changefreq = pathPart === '/' ? 'weekly' : 'monthly'
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

function writeSitemapFiles(filename: string, xml: string): string[] {
  const dirs = [PUBLIC_DIR]
  if (fs.existsSync(DIST_DIR)) dirs.push(DIST_DIR)
  if (fs.existsSync(CLIENT_DIST_DIR)) dirs.push(CLIENT_DIST_DIR)
  const written: string[] = []
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, filename)
    fs.writeFileSync(dest, xml, 'utf8')
    written.push(dest)
  }
  return written
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  // Sitemap 1 — Core pages (~40). Submit this first.
  const corePaths = [...new Set(CORE_PATHS)].filter(isSitemapPath)
  const coreXml = buildUrlSet(corePaths, today)
  const coreWritten = writeSitemapFiles('sitemap-core.xml', coreXml)
  console.log('[SEO] Sitemap 1 (core):', coreWritten[0], `(${corePaths.length} URLs)`)
  for (const extra of coreWritten.slice(1)) console.log('[SEO]   also wrote', extra)

  // Sitemap 2 — Programmatic + remaining manual pages
  const sitemap2Paths = getSitemap2Paths().filter(isSitemapPath)
  const sitemap2Xml = buildUrlSet(sitemap2Paths, today)
  const sitemap2Written = writeSitemapFiles('sitemap-programmatic.xml', sitemap2Xml)
  console.log('[SEO] Sitemap 2 (programmatic + other):', sitemap2Written[0], `(${sitemap2Paths.length} URLs)`)
  for (const extra of sitemap2Written.slice(1)) console.log('[SEO]   also wrote', extra)

  // Sitemap index — references both. Submit sitemap-index.xml or sitemap-core.xml first.
  const indexLocs = [`${SITE_URL}/sitemap-core.xml`, `${SITE_URL}/sitemap-programmatic.xml`].map(normalizeUrl)
  assertNoMixedDomains(indexLocs)
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${indexLocs[0]}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${indexLocs[1]}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`
  const indexWritten = writeSitemapFiles('sitemap-index.xml', indexXml)
  console.log('[SEO] Sitemap index:', indexWritten[0])

  // Legacy: also write sitemap.xml as copy of index (for backwards compatibility)
  const legacyWritten = writeSitemapFiles('sitemap.xml', indexXml)
  console.log('[SEO] sitemap.xml (→ index):', legacyWritten[0])

  if (process.env.SITEMAP_PING !== '0' && process.env.SITEMAP_PING !== 'false') {
    // Ping with index; to submit core only first, use: SITEMAP_PING_URL=https://videotext.io/sitemap-core.xml
    const pingUrl = normalizeUrl(process.env.SITEMAP_PING_URL || `${SITE_URL}/sitemap-index.xml`)
    const pingUrls = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(pingUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(pingUrl)}`,
    ]
    for (const url of pingUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) console.log('[SEO] Pinged:', url.split('?')[0])
      } catch {
        // non-fatal
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
