import { SITE_URL, SITE_NAME } from './seo'

/** Per-route SEO meta. Used by Seo component on each page. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text & Subtitles — Free Online Tools',
    description:
      'Free video to text and subtitle tools: transcribe video to transcript, generate SRT/VTT subtitles, translate subtitles, fix timing, burn captions, compress video. No signup. Try free.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans',
    description:
      'VideoText pricing: free tier with 60 min/month, Basic $15, Pro $49, Agency $99. More minutes, longer videos, batch processing. Upgrade when you need more.',
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free Online Transcription',
    description:
      'Convert video to text instantly. Paste a URL or upload a video, get a transcript in seconds. Free tier, no signup. Supports multiple languages.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — SRT & VTT Generator',
    description:
      'Generate SRT and VTT subtitle files from any video. Free online tool. Paste URL or upload video. Perfect for YouTube and web. No signup required.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles — SRT/VTT to Any Language',
    description:
      'Translate subtitle files to Arabic, Hindi, Spanish, and 50+ languages. Upload SRT or VTT, choose target language, download. Free tier available.',
  },
  '/fix-subtitles': {
    title: 'Fix Subtitles — Auto-Correct Timing & Format',
    description:
      'Fix subtitle timing and formatting errors automatically. Upload SRT or VTT, get corrected subtitles. Fix overlapping cues, gaps, and encoding issues.',
  },
  '/burn-subtitles': {
    title: 'Burn Subtitles into Video — Hardcode Captions',
    description:
      'Burn subtitles directly into your video. Upload video + SRT/VTT, get a new video with hardcoded captions. No signup. Free tier available.',
  },
  '/compress-video': {
    title: 'Compress Video — Reduce File Size Online',
    description:
      'Compress video online without losing quality. Reduce file size for uploads and sharing. Free tool. Paste URL or upload. No signup required.',
  },
  '/batch-process': {
    title: 'Batch Video Processing — Multiple Videos at Once',
    description:
      'Process multiple videos in one go: transcribe, generate subtitles, or compress. Upload many files, download a ZIP. Pro and Agency plans.',
  },
}

/** JSON-LD Organization + WebApplication for rich results (homepage or global). */
export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Professional video to text and subtitle tools: transcribe, generate SRT/VTT, translate, fix, burn subtitles, compress video. Free tier.',
    sameAs: [],
  }
}

export function getWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Free online tools: video to transcript, video to subtitles (SRT/VTT), translate subtitles, fix subtitles, burn subtitles, compress video. No signup.',
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
