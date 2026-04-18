/** MONEY PAGE FUNNEL STRATEGY
 * All traffic funnels into 8 core revenue pages via 301 redirects.
 * No programmatic page generation — only manual registry (seoRegistry.ts).
 *
 * The 8 money pages handle ALL user intents:
 * - /video-to-transcript (main transcription)
 * - /voice-recorder (voice to text)
 * - /youtube-transcript-generator (YouTube-specific)
 * - /video-to-subtitles (subtitle generation)
 * - /translate-subtitles (translation)
 * - /fix-subtitles (subtitle editing)
 * - /burn-subtitles (embed subtitles)
 * - /compress-video (video optimization)
 *
 * All other URLs (300+) redirect via vercel.json routes.
 */
import type { SeoRegistryEntry } from './seoRegistry'

/** Disable programmatic page generation.
 * All content is funneled into the 8 core money pages (manual registry in seoRegistry.ts).
 * All other URLs 301 redirect to these via vercel.json routes.
 */
export function getProgrammaticSeoEntries(): SeoRegistryEntry[] {
  return []
}

/** All programmatic paths (for routing, sitemap). */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}
