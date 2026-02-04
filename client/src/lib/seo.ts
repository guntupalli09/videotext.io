/**
 * Site base URL for canonical, OG, sitemap. Set VITE_SITE_URL in .env for production.
 * Must not end with slash.
 */
export const SITE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_URL) ||
  (typeof window !== 'undefined' && window.location?.origin) ||
  'https://www.videotext.io'

export const SITE_NAME = 'VideoText'
export const DEFAULT_DESCRIPTION =
  'VideoText: AI-powered video to text and subtitle tools. Transcribe, view transcript in 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian), generate SRT/VTT, translate subtitles, fix, burn, compress video. Paste URL or upload. Free tier. No signup.'
export const DEFAULT_OG_IMAGE = '/og-image.png'
