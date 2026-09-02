/**
 * Alternate SEO paths → primary product URLs (cluster consolidation).
 * Single source of truth — scripts/seo/registry.ts re-exports this directly.
 */
export const SLUG_TO_PRIMARY: Record<string, string> = {
  'video-to-text': '/video-to-transcript',
  'mp4-to-text': '/video-to-transcript',
  'mp4-to-srt': '/video-to-subtitles',
  'subtitle-generator': '/video-to-subtitles',
  'srt-translator': '/translate-subtitles',
  'meeting-transcript': '/video-to-transcript',
  'speaker-diarization': '/video-to-transcript',
  'video-summary-generator': '/video-to-transcript',
  'video-chapters-generator': '/video-to-transcript',
  'keyword-indexed-transcript': '/video-to-transcript',
  'srt-to-vtt': '/video-to-subtitles',
  'subtitle-converter': '/video-to-subtitles',
  'subtitle-timing-fixer': '/fix-subtitles',
  'subtitle-validation': '/fix-subtitles',
  'subtitle-translator': '/translate-subtitles',
  'multilingual-subtitles': '/translate-subtitles',
  'subtitle-language-checker': '/translate-subtitles',
  'subtitle-grammar-fixer': '/fix-subtitles',
  'subtitle-line-break-fixer': '/fix-subtitles',
  'hardcoded-captions': '/burn-subtitles',
  'video-with-subtitles': '/burn-subtitles',
  'video-compressor': '/compress-video',
  'reduce-video-size': '/compress-video',
  // '/batch-process' is itself a client redirect into '/video-to-transcript' (batch
  // capability lives inside that tool, not a standalone page) — canonicalize it and
  // its aliases directly to the final page rather than through the redirect stub.
  'batch-process': '/video-to-transcript',
  'batch-video-processing': '/video-to-transcript',
  'bulk-subtitle-export': '/video-to-transcript',
  'bulk-transcript-export': '/video-to-transcript',
  'transcribe-video': '/video-to-transcript',
  'video-transcription': '/video-to-transcript',
  'free-transcription': '/video-to-transcript',
  'online-transcription': '/video-to-transcript',
  'ai-transcription': '/video-to-transcript',
  'audio-to-text': '/video-to-transcript',
  'podcast-transcript': '/video-to-transcript',
  'zoom-meeting-transcript': '/video-to-transcript',
  'zoom-recording-transcript': '/zoom-meeting-transcript',
  'meeting-recording-to-transcript': '/video-to-transcript',
  'transcribe-meeting-recording': '/meeting-recording-to-transcript',
  'meeting-transcription-tool': '/video-to-transcript',
  'interview-transcription': '/video-to-transcript',
  'lecture-transcription': '/video-to-transcript',
  'youtube-to-transcript': '/youtube-transcript-generator',
  'youtube-transcript': '/youtube-transcript-generator',
  'youtube-video-transcript': '/youtube-transcript-generator',
  'transcribe-youtube-video': '/youtube-transcript-generator',
  'youtube-to-text': '/youtube-transcript-generator',
  'mov-to-text': '/video-to-transcript',
  'webm-to-text': '/video-to-transcript',
  'automatic-subtitles': '/video-to-subtitles',
  'caption-generator': '/video-to-subtitles',
  'closed-caption-generator': '/video-to-subtitles',
  'free-subtitle-generator': '/video-to-subtitles',
  // NOTE: '/video-to-srt' and '/srt-generator' are intentionally NOT aliased here.
  // Both have their own distinct real-world search demand and Google rankings
  // that outperform '/video-to-subtitles' (see reports/seo-baseline-2026-08-31.md
  // §6) — canonicalizing them away was actively suppressing indexable, high-traffic
  // pages. They now self-canonicalize (see client/src/lib/seoRegistry.ts entries).
  'translate-video': '/translate-subtitles',
  'video-translation': '/translate-subtitles',
  'bulk-video-transcription': '/video-to-transcript',
  'otter-ai-alternative': '/otter-alternative',
}
