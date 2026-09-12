#!/usr/bin/env node
/**
 * IndexNow — push changed page URLs to Bing, Yandex, Seznam, and Naver.
 * Not Google (~96% of traffic); set-and-forget after wiring deploy.
 *
 * Requires:
 *   - INDEXNOW_KEY env (matches https://videotext.io/{key}.txt)
 *   - Key file written at build via `npm run seo:indexnow-key`
 *   - Post-deploy submit via `npm run seo:indexnow` (GitHub Action on main)
 *
 * Changed URLs come from resolve-lastmod.ts git history — same signal as sitemap lastmod.
 */
import * as fs from 'fs'
import * as path from 'path'
import { getIndexablePaths } from './registry'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'
import { getDeploySinceDate, getChangedPathsSince, resolveLastmodForPath } from './resolve-lastmod'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const CLIENT_DIST_DIR = path.join(REPO_ROOT, 'client', 'dist')

const SITE_URL = (process.env.SITE_URL || 'https://videotext.io')
  .replace('https://www.', 'https://')
  .replace(/\/+$/, '')
const SITE_HOST = new URL(`${SITE_URL}/`).hostname

/** Committed key file — stable default when INDEXNOW_KEY env is unset locally. */
const DEFAULT_KEY = 'e1cc2e9c3c884d9789d712321c96181a'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS_PER_REQUEST = 10_000

function getKey(): string | null {
  const key = (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim()
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    console.error('[indexnow] INDEXNOW_KEY must be 8–128 alphanumeric/hyphen characters')
    return null
  }
  return key
}

function outputDirs(): string[] {
  const dirs = [PUBLIC_DIR]
  if (fs.existsSync(DIST_DIR)) dirs.push(DIST_DIR)
  if (fs.existsSync(CLIENT_DIST_DIR)) dirs.push(CLIENT_DIST_DIR)
  return dirs
}

export function writeIndexNowKeyFile(key: string): string[] {
  const written: string[] = []
  const body = `${key}\n`
  for (const dir of outputDirs()) {
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, `${key}.txt`)
    fs.writeFileSync(dest, body, 'utf8')
    written.push(dest)
  }
  return written
}

function canonicalLoc(canonicalPath: string): string {
  return canonicalPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${canonicalPath}`
}

/** videotext.io pages only — blog posts live on blog.videotext.io (separate host/key). */
function getIndexableSitePaths(): string[] {
  return getIndexablePaths()
    .map((p) => getCanonicalPathForRoute(p))
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i)
}

function getChangedUrls(sinceDate: string): string[] {
  const paths = getIndexableSitePaths()
  const changed = getChangedPathsSince(sinceDate, paths)
  return changed.map(canonicalLoc).filter((url) => new URL(url).hostname === SITE_HOST)
}

async function submitToIndexNow(key: string, urlList: string[]): Promise<boolean> {
  if (urlList.length === 0) return true

  const host = SITE_HOST
  const keyLocation = `${SITE_URL}/${key}.txt`
  let ok = true

  for (let i = 0; i < urlList.length; i += MAX_URLS_PER_REQUEST) {
    const batch = urlList.slice(i, i + MAX_URLS_PER_REQUEST)
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList: batch }),
    })

    if (res.ok || res.status === 202) {
      console.log(`[indexnow] Submitted ${batch.length} URL(s) — HTTP ${res.status}`)
    } else {
      const text = await res.text().catch(() => '')
      console.error(`[indexnow] Submit failed — HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
      ok = false
    }
  }

  return ok
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const keyOnly = args.has('--key-only')
  const dryRun = args.has('--dry-run')

  const key = getKey()
  if (!key) {
    process.exit(keyOnly ? 0 : 1)
  }

  const written = writeIndexNowKeyFile(key)
  console.log('[indexnow] Key file:', written[0])

  if (keyOnly) return

  if (!process.env.INDEXNOW_KEY && !dryRun) {
    console.log('[indexnow] INDEXNOW_KEY not set — skipping submit (key file still written)')
    return
  }

  const sinceDate = getDeploySinceDate()
  const urlList = getChangedUrls(sinceDate)

  console.log(`[indexnow] Since ${sinceDate}: ${urlList.length} changed URL(s) on ${SITE_HOST}`)

  if (urlList.length === 0) {
    console.log('[indexnow] Nothing to submit')
    return
  }

  if (dryRun) {
    for (const url of urlList.slice(0, 20)) {
      const p = url.replace(SITE_URL, '') || '/'
      console.log(`  ${url}  (lastmod ${resolveLastmodForPath(p) ?? '?'})`)
    }
    if (urlList.length > 20) console.log(`  … and ${urlList.length - 20} more`)
    return
  }

  const ok = await submitToIndexNow(key, urlList)
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
