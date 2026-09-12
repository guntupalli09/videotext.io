/** High-traffic SERP landing pages that show the trust strip (US + global). */
export const SERP_TRUST_PATHS = new Set([
  '/video-to-srt',
  '/capcut-captions',
  '/translate-subtitles',
  '/video-to-transcript',
  '/video-to-subtitles',
  '/fix-subtitles',
  '/subtitle-tools',
])

export function shouldShowSerpTrustStrip(pathname: string): boolean {
  return SERP_TRUST_PATHS.has(pathname)
}
