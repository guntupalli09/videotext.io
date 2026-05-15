#!/usr/bin/env node
/**
 * Validate sitemaps: no duplicate URLs; core + programmatic must match indexable inventory.
 * Run after generate-sitemap. Exit 1 on failure.
 */
import * as path from 'path'
import * as fs from 'fs'
import { getIndexablePaths } from './registry'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')
const SITE_URL = (process.env.SITE_URL || 'https://videotext.io').replace('https://www.', 'https://').replace(/\/+$/, '')
const CANONICAL_HOST = 'https://videotext.io'
const BLOG_URL = (process.env.BLOG_URL || 'https://blog.videotext.io').replace('https://www.', 'https://').replace(/\/+$/, '')

function extractUrlsFromXml(xml: string): string[] {
  const locRe = /<loc>([^<]+)<\/loc>/g
  const found: string[] = []
  let match: RegExpExecArray | null
  while ((match = locRe.exec(xml)) !== null) {
    found.push(match[1])
  }
  return found
}

function normalizeUrl(url: string): string {
  return url.replace('https://www.', 'https://').replace(/\/+$/, '')
}


function canonicalUrlForPath(routePath: string): string {
  const canonicalPath = getCanonicalPathForRoute(routePath)
  if (canonicalPath === '/blog') return `${BLOG_URL}/`
  if (canonicalPath.startsWith('/blog/')) return `${BLOG_URL}/${canonicalPath.slice('/blog/'.length)}`
  return canonicalPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${canonicalPath}`
}

function pathFromCanonicalUrl(url: string): string | null {
  if (url === SITE_URL || url === `${SITE_URL}/`) return '/'
  if (url.startsWith(`${SITE_URL}/`)) return url.slice(SITE_URL.length) || '/'
  if (url === BLOG_URL || url === `${BLOG_URL}/`) return '/blog'
  if (url.startsWith(`${BLOG_URL}/`)) return `/blog/${url.slice(`${BLOG_URL}/`.length)}`
  return null
}

function main(): void {
  const corePath = path.join(PUBLIC_DIR, 'sitemap-core.xml')
  const programmaticPath = path.join(PUBLIC_DIR, 'sitemap-programmatic.xml')

  if (!fs.existsSync(corePath) || !fs.existsSync(programmaticPath)) {
    console.error('[validate-sitemap] Run npm run seo:sitemap first')
    process.exit(1)
  }

  const coreUrls = extractUrlsFromXml(fs.readFileSync(corePath, 'utf8'))
  const programmaticUrls = extractUrlsFromXml(fs.readFileSync(programmaticPath, 'utf8'))
  const found = [...coreUrls, ...programmaticUrls].map(normalizeUrl)

  const indexablePaths = getIndexablePaths()
  const expectedUrls = new Set(
    indexablePaths.map((p) => normalizeUrl(canonicalUrlForPath(p)))
  )

  const foundSet = new Set(found)
  let failed = false

  if (found.length !== foundSet.size) {
    console.error('[validate-sitemap] Duplicate <loc> across sitemaps')
    failed = true
  }

  const hasWww = found.some((u) => u.includes('https://www.videotext.io'))
  const hasNonWww = found.some((u) => u.startsWith('https://videotext.io'))
  if (hasWww && hasNonWww) {
    console.error('[validate-sitemap] Mixed www/non-www URLs detected in sitemap')
    failed = true
  }
  if (found.some((u) => !u.startsWith(CANONICAL_HOST) && !u.startsWith(BLOG_URL))) {
    console.error('[validate-sitemap] Found non-canonical host in sitemap (expected https://videotext.io or configured blog host)')
    failed = true
  }

  for (const url of expectedUrls) {
    if (!foundSet.has(url)) {
      console.error('[validate-sitemap] Missing from sitemap:', url)
      failed = true
    }
  }

  for (const url of found) {
    const expectedPath = pathFromCanonicalUrl(url)
    if (!expectedPath || !indexablePaths.includes(expectedPath)) {
      console.error('[validate-sitemap] Sitemap contains path not in indexable inventory:', url)
      failed = true
    }
  }

  if (failed) {
    process.exit(1)
  }
  console.log('[validate-sitemap] OK — core:', coreUrls.length, ', programmatic:', programmaticUrls.length, ', total:', found.length)
}

main()
