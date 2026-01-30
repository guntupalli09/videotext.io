/**
 * Site base URL for canonical, OG, sitemap. Set VITE_SITE_URL in .env for production.
 * Must not end with slash.
 */
export const SITE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_URL) ||
  (typeof window !== 'undefined' && window.location?.origin) ||
  'https://videotext.io'

export const SITE_NAME = 'VideoText'
export const DEFAULT_DESCRIPTION =
  'VideoText: transcribe video to text, generate SRT/VTT subtitles, translate and fix subtitles, burn captions, compress video. Free tier. No signup required.'
export const DEFAULT_OG_IMAGE = '/og-image.png'
