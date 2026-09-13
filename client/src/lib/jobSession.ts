/**
 * Persist jobId (and optional jobToken) so that after idle/background/reload we can resume polling or restore result.
 * - URL (?jobId=...) so sharing and refresh keep context
 * - sessionStorage keyed by canonical toolKey so SEO aliases share the same job
 *   (e.g. /video-to-srt and /video-to-transcript both use job-video-to-transcript)
 * - jobToken is required for polling when not logged in (server returns 403 without it)
 */

import { getSeoEntry } from './seoRegistry'

const QUERY_KEY = 'jobId'
const TOKEN_STORAGE_SUFFIX = '-token'

const CORE_PATH_TO_TOOL_KEY: Record<string, string> = {
  '/video-to-transcript': 'video-to-transcript',
  '/video-to-subtitles': 'video-to-subtitles',
  '/translate-subtitles': 'translate-subtitles',
  '/fix-subtitles': 'fix-subtitles',
  '/burn-subtitles': 'burn-subtitles',
  '/compress-video': 'compress-video',
  '/voice-recorder': 'voice-to-text',
  '/guideline-format': 'brand-guideline',
  '/batch-process': 'video-to-transcript',
}

function normalizePath(pathname: string): string {
  if (!pathname) return '/'
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const noQuery = withSlash.split('?')[0] || '/'
  return noQuery.replace(/\/+$/, '') || '/'
}

function getLegacyPathKey(pathname: string): string {
  const base = pathname.replace(/^\//, '').split('/')[0] || 'default'
  return `job-${base}`
}

/** Canonical sessionStorage key for a tool path (SEO alias → engine). */
export function getToolSessionKey(pathname: string): string {
  const path = normalizePath(pathname)
  const entry = getSeoEntry(path)
  let toolKey = entry?.toolKey ?? CORE_PATH_TO_TOOL_KEY[path]
  if (!toolKey) {
    const first = path.replace(/^\//, '').split('/')[0] || 'default'
    toolKey = CORE_PATH_TO_TOOL_KEY[`/${first}`] ?? first
  }
  if (toolKey === 'batch-process') toolKey = 'video-to-transcript'
  return `job-${toolKey}`
}

function sessionKeys(pathname: string): { current: string; legacy: string } {
  return {
    current: getToolSessionKey(pathname),
    legacy: getLegacyPathKey(pathname),
  }
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Persist jobId and optional jobToken to URL/sessionStorage for the current tool. */
export function persistJobId(pathname: string, jobId: string, jobToken?: string): void {
  const { current, legacy } = sessionKeys(pathname)
  writeSession(current, jobId)
  if (legacy !== current) writeSession(legacy, jobId)
  if (jobToken) {
    writeSession(current + TOKEN_STORAGE_SUFFIX, jobToken)
    if (legacy !== current) writeSession(legacy + TOKEN_STORAGE_SUFFIX, jobToken)
  } else {
    writeSession(current + TOKEN_STORAGE_SUFFIX, null)
    if (legacy !== current) writeSession(legacy + TOKEN_STORAGE_SUFFIX, null)
  }
  const url = new URL(window.location.href)
  url.searchParams.set(QUERY_KEY, jobId)
  window.history.replaceState({}, '', url.pathname + url.search)
}

/** Read jobId from URL first, then toolKey session, then legacy first-segment key. */
export function getPersistedJobId(pathname: string): string | null {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get(QUERY_KEY)
  if (fromUrl) return fromUrl
  const { current, legacy } = sessionKeys(pathname)
  return readSession(current) || (legacy !== current ? readSession(legacy) : null)
}

/** Read jobToken from sessionStorage (used for polling when not logged in). */
export function getPersistedJobToken(pathname: string): string | null {
  const { current, legacy } = sessionKeys(pathname)
  return readSession(current + TOKEN_STORAGE_SUFFIX)
    || (legacy !== current ? readSession(legacy + TOKEN_STORAGE_SUFFIX) : null)
}

function clearSessionKeys(pathname: string): void {
  const { current, legacy } = sessionKeys(pathname)
  writeSession(current, null)
  writeSession(current + TOKEN_STORAGE_SUFFIX, null)
  if (legacy !== current) {
    writeSession(legacy, null)
    writeSession(legacy + TOKEN_STORAGE_SUFFIX, null)
  }
}

/** Remove jobId and jobToken from URL and sessionStorage. */
export function clearPersistedJobId(pathname: string, navigate: (path: string, opts?: { replace?: boolean }) => void): void {
  clearSessionKeys(pathname)
  const url = new URL(window.location.href)
  if (url.searchParams.has(QUERY_KEY)) {
    url.searchParams.delete(QUERY_KEY)
    const newPath = url.pathname + (url.search ? url.search : '')
    navigate(newPath, { replace: true })
  }
}

/** Remove jobId/jobToken for current tool path without router navigation side effects. */
export function clearPersistedJobIdInPlace(pathname: string): void {
  clearSessionKeys(pathname)
  const url = new URL(window.location.href)
  if (url.searchParams.has(QUERY_KEY)) {
    url.searchParams.delete(QUERY_KEY)
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
  }
}

/** Clear all persisted job IDs and tokens from sessionStorage. Call on logout so results are not re-shown after reload. */
export function clearAllPersistedJobs(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k?.startsWith('job-')) sessionStorage.removeItem(k)
    }
  } catch {
    // ignore
  }
}
