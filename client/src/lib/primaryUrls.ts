import { SLUG_TO_PRIMARY } from './slugToPrimary'

/**
 * Head-term intents → canonical path (documentation + programmatic lookup).
 * Subset of keys; see CANONICAL_PRIMARY_PATH for full alternate → primary map.
 */
export const PRIMARY_URLS: Record<string, string> = {
  /** Primary URLs for paid / core AI tools (SEO + product). */
  'video-transcription': '/video-to-transcript',
  'voice-to-text': '/voice-recorder',
  'subtitle-translation': '/translate-subtitles',
  'batch-processing': '/batch-process',
  'bulk-video-transcription': '/batch-process',
  'youtube-transcript': '/youtube-transcript-generator',
  'video-transcript': '/video-to-transcript',
  'srt-to-vtt': '/tools/srt-to-vtt',
  'subtitle-tools': '/subtitle-tools',
  'free-tools': '/tools',
}

/** Path → canonical path for rel=canonical and internal links (consolidate duplicate intent URLs). */
export const CANONICAL_PRIMARY_PATH: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [slug, primary] of Object.entries(SLUG_TO_PRIMARY)) {
    out[`/${slug}`] = primary
  }
  /** Free SRT→VTT file converter is the pillar for “SRT to VTT” (vs /srt-to-vtt SEO entry → video-to-subtitles). */
  out['/srt-to-vtt'] = '/tools/srt-to-vtt'
  return out
})()

export function getCanonicalPathForRoute(pathname: string): string {
  return CANONICAL_PRIMARY_PATH[pathname] ?? pathname
}

/** Use for <Link to> and suggestions so alternates point at primaries. */
export function resolveInternalLinkPath(path: string): string {
  return CANONICAL_PRIMARY_PATH[path] ?? path
}
