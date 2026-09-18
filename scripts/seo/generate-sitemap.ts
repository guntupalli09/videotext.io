#!/usr/bin/env node
/**
 * Generate split sitemaps: core (submit first) + programmatic.
 * Output: client/public/sitemap-index.xml, sitemap-core.xml, sitemap-programmatic.xml
 */
import * as path from 'path'
import * as fs from 'fs'
import { CORE_PATHS, getSitemap2Paths, getHashnodeBlogPaths } from './registry'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'
import { getHashnodePostUrl } from '../../client/src/lib/blogSlugMap'
import { maxLastmodForPaths, resolveLastmodForPath } from './resolve-lastmod'
import { getAllGuides } from '../../client/src/lib/guides'

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
  if (canonicalPath.startsWith('/blog/')) return getHashnodePostUrl(canonicalPath)
  return canonicalPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${canonicalPath}`
}

function isSitemapPath(routePath: string): boolean {
  if (!routePath || routePath === '*') return false
  if (SITEMAP_SKIP.has(routePath)) return false
  const canonicalPath = getCanonicalPathForRoute(routePath)
  if (SITEMAP_SKIP.has(canonicalPath)) return false
  return true
}

function uniqueCanonicalPaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paths.filter(isSitemapPath)) {
    const canonicalPath = getCanonicalPathForRoute(p)
    if (seen.has(canonicalPath)) continue
    seen.add(canonicalPath)
    out.push(canonicalPath)
  }
  return out
}

function buildNormalizedLocs(paths: string[]): string[] {
  const urls = uniqueCanonicalPaths(paths).map((canonicalPath) => normalizeUrl(getCanonicalLoc(canonicalPath)))
  assertNoMixedDomains(urls)
  return urls
}

function lastmodTag(canonicalPath: string): string {
  const lastmod = resolveLastmodForPath(canonicalPath)
  return lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
}

function buildUrlSet(paths: string[]): string {
  const urls = uniqueCanonicalPaths(paths).map((canonicalPath) => {
    const loc = normalizeUrl(getCanonicalLoc(canonicalPath))
    const pathPart = canonicalPath === '/blog' ? '/blog' : canonicalPath
    const priority = pathPart === '/' ? '1.0' : pathPart === '/pricing' ? '0.9' : pathPart.startsWith('/video-to-') || pathPart.startsWith('/mp4-') || pathPart.startsWith('/youtube-') || pathPart.startsWith('/transcribe-youtube') ? '0.9' : '0.8'
    const changefreq = pathPart === '/' ? 'weekly' : 'monthly'
    return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag(canonicalPath)}
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
  // Sitemap 1 — Core product pages (blog posts live in sitemap-blog.xml)
  const corePaths = [...new Set(CORE_PATHS)].filter(isSitemapPath)
  const coreXml = buildUrlSet(corePaths)
  const coreWritten = writeSitemapFiles('sitemap-core.xml', coreXml)
  console.log('[SEO] Sitemap 1 (core):', coreWritten[0], `(${corePaths.length} URLs)`)
  for (const extra of coreWritten.slice(1)) console.log('[SEO]   also wrote', extra)

  // Sitemap 2 — Programmatic + remaining manual pages
  const sitemap2Paths = getSitemap2Paths().filter(isSitemapPath)
  const sitemap2Xml = buildUrlSet(sitemap2Paths)
  const sitemap2Written = writeSitemapFiles('sitemap-programmatic.xml', sitemap2Xml)
  console.log('[SEO] Sitemap 2 (programmatic + other):', sitemap2Written[0], `(${sitemap2Paths.length} URLs)`)
  for (const extra of sitemap2Written.slice(1)) console.log('[SEO]   also wrote', extra)

  // Sitemap 3 — All Hashnode blog posts (/blog index is in sitemap-core.xml)
  const blogPaths = uniqueCanonicalPaths(getHashnodeBlogPaths())
  const blogUrls = blogPaths.map((canonicalPath) => {
    const loc = normalizeUrl(getCanonicalLoc(canonicalPath))
    return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag(canonicalPath)}
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`
  })
  const blogXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${blogUrls.join('\n')}
</urlset>
`
  const blogWritten = writeSitemapFiles('sitemap-blog.xml', blogXml)
  console.log('[SEO] Sitemap 3 (blog):', blogWritten[0], `(${blogPaths.length} URLs)`)

  // Sitemap 4 — Long-form guides at /guides (own file: one content set, one lastmod)
  const guides = getAllGuides()
  const guideUrls = [
    `  <url>
    <loc>${escapeXml(normalizeUrl(`${SITE_URL}/guides`))}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ...guides.map((guide) => {
      const loc = normalizeUrl(`${SITE_URL}/guides/${guide.slug}`)
      const lastmod = guide.date ? `\n    <lastmod>${guide.date}</lastmod>` : ''
      return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`
    }),
  ]
  const guidesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${guideUrls.join('\n')}
</urlset>
`
  const guidesWritten = writeSitemapFiles('sitemap-guides.xml', guidesXml)
  console.log('[SEO] Sitemap 4 (guides):', guidesWritten[0], `(${guideUrls.length} URLs)`)

  // Sitemap index — references all four
  const indexLocs = [
    `${SITE_URL}/sitemap-core.xml`,
    `${SITE_URL}/sitemap-programmatic.xml`,
    `${SITE_URL}/sitemap-blog.xml`,
    `${SITE_URL}/sitemap-guides.xml`,
  ].map(normalizeUrl)
  assertNoMixedDomains(indexLocs)
  const coreLastmod = maxLastmodForPaths(corePaths.map((p) => getCanonicalPathForRoute(p)))
  const programmaticLastmod = maxLastmodForPaths(sitemap2Paths.map((p) => getCanonicalPathForRoute(p)))
  const blogLastmod = maxLastmodForPaths(blogPaths)
  const guidesLastmod = guides.map((g) => g.date).filter(Boolean).sort().pop() || null
  const indexLastmodTag = (date: string | null) => (date ? `\n    <lastmod>${date}</lastmod>` : '')

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${indexLocs[0]}</loc>${indexLastmodTag(coreLastmod)}
  </sitemap>
  <sitemap>
    <loc>${indexLocs[1]}</loc>${indexLastmodTag(programmaticLastmod)}
  </sitemap>
  <sitemap>
    <loc>${indexLocs[2]}</loc>${indexLastmodTag(blogLastmod)}
  </sitemap>
  <sitemap>
    <loc>${indexLocs[3]}</loc>${indexLastmodTag(guidesLastmod)}
  </sitemap>
</sitemapindex>
`
  const indexWritten = writeSitemapFiles('sitemap-index.xml', indexXml)
  console.log('[SEO] Sitemap index:', indexWritten[0])

  // Legacy: also write sitemap.xml as copy of index (for backwards compatibility)
  const legacyWritten = writeSitemapFiles('sitemap.xml', indexXml)
  console.log('[SEO] sitemap.xml (→ index):', legacyWritten[0])

  // Bing sitemap ping only — not IndexNow. Changed URLs: npm run seo:indexnow (post-deploy on main).
  // Google retired the sitemap ping endpoint in 2023 — resubmit via Search Console UI.
  // Bing still accepts pings; opt in with SITEMAP_PING=1 (Google ping skipped always).
  if (process.env.SITEMAP_PING === '1' || process.env.SITEMAP_PING === 'true') {
    const pingUrl = normalizeUrl(process.env.SITEMAP_PING_URL || `${SITE_URL}/sitemap-index.xml`)
    try {
      const res = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(pingUrl)}`)
      if (res.ok) console.log('[SEO] Pinged Bing sitemap endpoint')
    } catch {
      // non-fatal
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
