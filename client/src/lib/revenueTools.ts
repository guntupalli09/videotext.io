/**
 * Paid / core AI tools — primary SEO & conversion targets.
 * Keep footer, nav, and homepage “core tools” bands aligned with this list.
 */
export const REVENUE_TOOL_PATHS = [
  '/video-to-transcript',
  '/voice-recorder',
  '/translate-subtitles',
  '/batch-process',
] as const

export type RevenueToolPath = (typeof REVENUE_TOOL_PATHS)[number]

/** Homepage / compact UI: labels match nav for consistency. */
export const REVENUE_TOOL_LINKS: readonly {
  path: RevenueToolPath
  label: string
  short: string
}[] = [
  {
    path: '/video-to-transcript',
    label: 'Video → Transcript',
    short: 'Transcripts, chapters, speakers, export',
  },
  {
    path: '/voice-recorder',
    label: 'Voice → Text',
    short: 'Record in-browser, instant transcript',
  },
  {
    path: '/translate-subtitles',
    label: 'Translate subtitles',
    short: 'SRT/VTT → 70+ languages',
  },
  {
    path: '/batch-process',
    label: 'Batch processing',
    short: 'Many videos → one ZIP',
  },
]
