/**
 * Programmatic SEO: generate landing pages from targets × intents.
 * Produces ~200 pages: /transcribe-webinar, /webinar-to-text, /webinar-transcription, etc.
 */
import type { SeoRegistryEntry, FaqItem } from './seoRegistry'
import { transcriptionTargets, targetToSlug, slugToTitle } from '../data/seoPages'

/** Path patterns: (slug) => path. Slug is e.g. "youtube-video", "podcast". */
/** Keep only 1 canonical pattern per target (based on GSC performance data).
 * This reduces ~340 pages to ~32 pages and maximizes SEO authority.
 *
 * Data shows:
 * - Most targets perform better with -transcription (podcast, meeting, vimeo, etc.)
 * - Some targets win with -transcript (google-meet, instagram-reel, webinar, teams, etc.)
 */

// Map of targets → preferred pattern (based on Google Search Console traffic)
const TARGET_PATTERN_MAP: Record<string, 'transcript' | 'transcription'> = {
  'google-meet': 'transcript',      // 478 impressions vs 0
  'instagram-reel': 'transcript',   // 151 impressions vs 0
  'teams-meeting': 'transcript',    // 18 impressions vs 0
  'webinar': 'transcript',          // 17 impressions vs 1
  'dictation': 'transcript',        // 6 impressions vs 1
  'news-interview': 'transcript',   // 2 impressions vs 1
  'research-interview': 'transcript', // 3 impressions vs 2
  'press-conference': 'transcript', // 7 impressions vs 4
  'tiktok-reel': 'transcript',
  'video-to': 'transcript',

  // All others default to -transcription (majority pattern, better overall)
};

const INTENT_PATTERNS: Array<{
  pattern: (slug: string) => string
  toolKey: 'video-to-transcript' | 'video-to-subtitles'
  titleTmpl: (target: string) => string
  descTmpl: (target: string) => string
  h1Tmpl: (target: string) => string
  variant: 'transcript' | 'transcription'
}> = [
  {
    variant: 'transcript',
    pattern: (s) => `/${s}-transcript`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcript – Get Text Online | VideoText`,
    descTmpl: (t) => `Get transcript from ${t}. Upload or paste URL. AI transcription. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} Transcript`,
  },
  {
    variant: 'transcription',
    pattern: (s) => `/${s}-transcription`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcription – Online | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text. Upload file. Get transcripts with speaker labels. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `${t} Transcription`,
  },
]

/** Get the preferred pattern for a target. */
function getPreferredPattern(slug: string): 'transcript' | 'transcription' {
  return TARGET_PATTERN_MAP[slug] || 'transcription'
}

const DEFAULT_FAQ: FaqItem[] = [
  { q: 'How do I transcribe this?', a: 'Upload your video or paste a URL. Click Transcribe and get a full transcript in seconds. Export as SRT, TXT, or translate to 6 languages.' },
  { q: 'Is it free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
  { q: 'What formats can I export?', a: 'Plain text (TXT), SRT subtitles, and VTT. Paid plans add JSON, CSV, Markdown, and Notion-style export.' },
]

/** Paths that already exist in the manual registry — skip to avoid duplicates. */
const EXISTING_PATHS = new Set([
  '/transcribe-youtube-video', '/transcribe-video', '/transcribe-video-online', '/youtube-to-transcript',
  '/youtube-transcript', '/youtube-transcript-generator', '/video-to-text-converter', '/audio-to-text-converter',
  '/podcast-transcription', '/podcast-transcription', '/interview-transcription', '/meeting-transcription',
  '/meeting-transcription', '/webinar-transcription', '/lecture-transcription', '/zoom-recording-transcript',
  '/mp4-to-text', '/video-to-text', '/audio-to-text', '/video-transcription', '/video-to-subtitles',
  '/subtitle-generator', '/video-caption-generator', '/add-subtitles-to-video', '/auto-subtitle-generator',
  '/srt-generator', '/video-to-srt', '/burn-subtitles-into-video', '/youtube-subtitle-generator',
  '/caption-video-online', '/generate-subtitles-from-video', '/automatic-subtitles', '/caption-generator',
  '/descript-alternative', '/otter-ai-alternative', '/rev-alternative', '/trint-alternative',
  '/turboscribe-alternative', '/best-video-transcription-tool', '/best-youtube-transcription-tool',
  '/best-podcast-transcription-tool', '/fastest-transcription-tool', '/free-video-transcription-tool',
])

/** Generate programmatic SEO entries. Keep only 1 pattern per target based on GSC performance. */
export function getProgrammaticSeoEntries(): SeoRegistryEntry[] {
  const entries: SeoRegistryEntry[] = []
  const seenPaths = new Set<string>(EXISTING_PATHS)

  for (const target of transcriptionTargets) {
    const slug = targetToSlug(target)
    const titleCase = slugToTitle(slug)
    const preferredVariant = getPreferredPattern(slug)

    // Generate only the preferred pattern for this target
    for (const patternObj of INTENT_PATTERNS) {
      if (patternObj.variant !== preferredVariant) continue // Skip non-preferred variant

      const { pattern, toolKey, titleTmpl, descTmpl, h1Tmpl } = patternObj
      const path = pattern(slug)
      if (seenPaths.has(path)) continue
      seenPaths.add(path)

      const intentKey = path.slice(1).replace(/\//g, '-')
      entries.push({
        path,
        title: titleTmpl(titleCase),
        description: descTmpl(titleCase),
        h1: h1Tmpl(titleCase),
        intro: `Transcribe ${titleCase.toLowerCase()} to text in seconds. Upload your file or paste a URL. Our AI extracts speech and produces a clean transcript. Export SRT, TXT, or translate to 6 languages. Free tier.`,
        faq: DEFAULT_FAQ,
        breadcrumbLabel: h1Tmpl(titleCase),
        toolKey,
        relatedSlugs: toolKey === 'video-to-transcript'
          ? ['/fastest-transcription-tool', '/best-transcription-tool', '/video-to-transcript', '/youtube-to-transcript']
          : ['/video-to-subtitles', '/subtitle-generator', '/fastest-transcription-tool', '/srt-generator'],
        indexable: true,
        intentKey,
        defaultInputMode: slug.includes('youtube') ? 'youtube' : undefined,
      })
    }
  }

  return entries
}

/** All programmatic paths (for routing, sitemap). */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}
