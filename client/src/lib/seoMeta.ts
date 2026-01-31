import { SITE_URL, SITE_NAME } from './seo'

/** Per-route SEO meta. Used by Seo component on each page. Descriptions match product behavior and target search intent. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text & Subtitles — Free Online Tools',
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, generate SRT/VTT subtitles, translate, fix timing, burn captions, compress video. Paste URL or upload. No signup. Free tier.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans',
    description:
      'VideoText pricing: Free 60 min/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. Upgrade when you need more.',
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free AI Transcription',
    description:
      'Convert video to text with AI. Paste a URL or upload a video, get a plain-text transcript in seconds. Multiple languages. No signup. Free tier. Download or copy to clipboard.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — SRT & VTT Generator',
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Paste URL or upload. Ideal for YouTube and web. Single or multi-language. No signup. Free tier.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles — SRT/VTT to Any Language',
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload or paste subtitles, pick target language, download. Free tier available.',
  },
  '/fix-subtitles': {
    title: 'Fix Subtitles — Auto-Correct Timing & Format',
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting for readability and YouTube limits. Upload SRT or VTT, download corrected file. Free.',
  },
  '/burn-subtitles': {
    title: 'Burn Subtitles into Video — Hardcode Captions',
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. No signup. Free tier available.',
  },
  '/compress-video': {
    title: 'Compress Video — Reduce File Size Online',
    description:
      'Compress video online: light, medium, or heavy compression. Paste URL or upload. Reduce file size for sharing and uploads. Free. No signup required.',
  },
  '/batch-process': {
    title: 'Batch Video to Subtitles — Multiple Videos at Once',
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans. Multi-language optional.',
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
      'VideoText: AI-powered video to text and subtitle tools. Transcribe, generate SRT/VTT, translate, fix, burn subtitles, compress video. Paste URL or upload. Free tier.',
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
      'Free online tools: video to transcript, video to subtitles (SRT/VTT), translate subtitles, fix subtitles, burn subtitles, compress video. AI-powered. No signup.',
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
