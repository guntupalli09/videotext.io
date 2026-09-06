import { getHashnodePostUrl } from './blogSlugMap'

/**
 * Site base URL for canonical, OG, sitemap. Set VITE_SITE_URL in .env for production.
 * Must not end with slash. Prefer single canonical origin (e.g. https://videotext.io) to avoid PSI "conflicting URLs".
 */
export const SITE_URL =
  (typeof import.meta.env?.VITE_SITE_URL === 'string' && import.meta.env.VITE_SITE_URL.trim()) ||
  'https://videotext.io'

export const BLOG_URL = 'https://blog.videotext.io'

export function getCanonicalUrlForPath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  if (pathOrUrl === '/blog' || pathOrUrl === '/blog/') return `${BLOG_URL}/`
  if (pathOrUrl.startsWith('/blog/')) return getHashnodePostUrl(pathOrUrl)
  return `${SITE_URL}${pathOrUrl === '/' ? '' : pathOrUrl}`
}

export const SITE_NAME = 'VideoText'
export const DEFAULT_DESCRIPTION =
  'VideoText: AI-powered video to text and subtitle tools. Paste a YouTube URL or upload a file — get a transcript in seconds. Transcribe, view in 6 languages, generate SRT/VTT, translate subtitles. No download for YouTube. Free tier.'
export const DEFAULT_OG_IMAGE = '/og-image.png'
