/** ACQUISITION + CONVERSION FUNNEL (CORRECTED)
 *
 * Layer 1: Intent Pages (37 pages) — TRAFFIC GENERATORS
 * └─ Capture search traffic for specific intents
 * └─ Examples: /podcast-transcription, /korean-transcription, /youtube-transcript
 * └─ Each has CTA linking to money page
 *
 * Layer 2: Money Pages (8 pages) — CONVERSION HUBS
 * └─ Where users actually upgrade and convert
 * └─ Examples: /video-to-transcript, /translate-subtitles
 *
 * FLOW: Intent Page → CTA → Money Page → Revenue
 */
import type { SeoRegistryEntry, FaqItem } from './seoRegistry'
import { transcriptionTargets, targetToSlug, slugToTitle } from '../data/seoPages'

// Only these targets should generate intent pages (not money pages)
const INTENT_PAGE_TARGETS = new Set([
  'podcast', 'meeting', 'interview', 'webinar', 'lecture',
  'zoom-recording', 'google-meet', 'teams-meeting', 'video-interview',
  'youtube-video', 'youtube', 'instagram-reel', 'tiktok', 'loom', 'vimeo', 'riverside',
  'korean', 'japanese', 'chinese', 'german', 'spanish', 'french', 'arabic', 'portuguese', 'hindi',
])

const INTENT_PATTERNS: Array<{
  pattern: (slug: string) => string
  toolKey: 'video-to-transcript' | 'video-to-subtitles'
  titleTmpl: (target: string) => string
  descTmpl: (target: string) => string
  h1Tmpl: (target: string) => string
}> = [
  {
    pattern: (s) => `/${s}-transcription`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcription – Online | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text. Get transcripts with speaker labels. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `${t} Transcription`,
  },
  {
    pattern: (s) => `/${s}-transcript`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcript – Get Text Online | VideoText`,
    descTmpl: (t) => `Get transcript from ${t}. AI transcription. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} Transcript`,
  },
]

const DEFAULT_FAQ: FaqItem[] = [
  { q: 'How do I transcribe this?', a: 'Upload or paste a URL. Click Transcribe and get a full transcript in seconds. Export as SRT, TXT.' },
  { q: 'Is it free?', a: 'Yes. Free tier includes 3 imports/month. Sign up free to try.' },
  { q: 'What formats can I export?', a: 'TXT, SRT, VTT. Paid plans add JSON, CSV, Markdown.' },
]

/** Money pages — don't generate, they're in manual registry. */
const EXISTING_PATHS = new Set([
  '/video-to-transcript', '/video-to-subtitles', '/youtube-transcript-generator',
  '/translate-subtitles', '/fix-subtitles', '/burn-subtitles', '/compress-video', '/voice-recorder',
  // Also skip alternatives — they're manually curated
  '/descript-alternative', '/otter-ai-alternative', '/rev-alternative', '/trint-alternative',
  '/turboscribe-alternative', '/buzz-alternative', '/deepgram-alternative', '/assembly-ai-alternative',
  '/krisp-alternative', '/tactiq-alternative', '/happyscribe-alternative', '/headliner-alternative',
  '/castmagic-alternative', '/riverside-alternative',
])

/** Generate only the 37 intent pages (traffic generators).
 * Money pages come from manual registry (seoRegistry.ts).
 */
export function getProgrammaticSeoEntries(): SeoRegistryEntry[] {
  const entries: SeoRegistryEntry[] = []
  const seenPaths = new Set<string>(EXISTING_PATHS)

  for (const target of transcriptionTargets) {
    const slug = targetToSlug(target)

    // Only generate intent pages, not money pages
    if (!INTENT_PAGE_TARGETS.has(slug)) continue

    const titleCase = slugToTitle(slug)

    for (const { pattern, toolKey, titleTmpl, descTmpl, h1Tmpl } of INTENT_PATTERNS) {
      const path = pattern(slug)
      if (seenPaths.has(path)) continue
      seenPaths.add(path)

      const intentKey = path.slice(1).replace(/\//g, '-')

      // CTA should point to the relevant money page
      let ctaPath = '/video-to-transcript' // default
      if (slug.includes('youtube')) ctaPath = '/youtube-transcript-generator'
      if (slug.includes('korean') || slug.includes('japanese') || slug.includes('spanish')) ctaPath = '/translate-subtitles'

      entries.push({
        path,
        title: titleTmpl(titleCase),
        description: descTmpl(titleCase),
        h1: h1Tmpl(titleCase),
        intro: `Transcribe ${titleCase.toLowerCase()} to text in seconds. Upload your file or paste a URL. Our AI extracts speech and produces a clean transcript. Sign up free to try.`,
        faq: DEFAULT_FAQ,
        breadcrumbLabel: h1Tmpl(titleCase),
        toolKey,
        relatedSlugs: [ctaPath],  // Link to money page
        indexable: true,
        intentKey,
      })
    }
  }

  return entries
}

/** All programmatic paths (for routing, sitemap). */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}
