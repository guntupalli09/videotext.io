/**
 * Core AI tools in the same order as the home landing toolkit:
 * spotlight row (Features), then secondary grid.
 */
export const CORE_AI_TOOLS_NAV = [
  { name: 'Video → Transcript', path: '/video-to-transcript' },
  { name: 'Format → Client guidelines', path: '/guideline-format' },
  { name: 'Translate', path: '/translate-subtitles' },
  { name: 'Voice → Text', path: '/voice-recorder' },
  { name: 'Video → Subtitles', path: '/video-to-subtitles' },
  { name: 'Batch Processing', path: '/batch-process' },
  { name: 'Fix Subtitles', path: '/fix-subtitles' },
  { name: 'Burn Subtitles', path: '/burn-subtitles' },
  { name: 'Compress Video', path: '/compress-video' },
] as const
