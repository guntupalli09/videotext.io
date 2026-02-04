import { SITE_URL, SITE_NAME } from './seo'

/** Per-route SEO meta. Used by Seo component on each page. Descriptions match product behavior and target search intent. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text & Subtitles — Free Online Tools',
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, view in 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian), generate SRT/VTT, translate subtitles, fix timing, burn captions, compress video. Paste URL or upload. No signup. Free tier.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans',
    description:
      'VideoText pricing: Free 60 min/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. We don’t store your data. Upgrade when you need more.',
  },
  '/privacy': {
    title: 'Privacy Policy — We Don’t Store Your Data | VideoText',
    description:
      'VideoText privacy: We process your files and delete them. We don’t keep your uploads, transcripts, or outputs. Your content stays yours. Read our full policy.',
  },
  '/faq': {
    title: 'FAQ — Privacy, Billing, Tools | VideoText',
    description:
      'Frequently asked questions about VideoText: privacy and data (we don’t store your files), billing, free tier, translation, and tools. Your files are processed and deleted.',
  },
  '/terms': {
    title: 'Terms of Service | VideoText',
    description:
      'Terms of use for VideoText. We don’t store your data; see our Privacy Policy for details. Billing via Stripe. Use the service in accordance with these terms.',
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free AI Transcription & Translation',
    description:
      'Convert video to text with AI. View transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian with one click. Paste URL or upload, get plain-text transcript. Summary, chapters, speakers. Download or copy. No signup. Free tier.',
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
  // SEO utility pages: same tools, alternate entry points. No new API or logic.
  '/video-to-text': {
    title: 'Video to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert video to text online. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. No signup required for the free tier.',
  },
  '/mp4-to-text': {
    title: 'MP4 to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert MP4 to text online. Get an accurate transcript, then translate it to Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. No signup for free tier.',
  },
  '/mp4-to-srt': {
    title: 'MP4 to SRT Online – Fast & Accurate | VideoText',
    description:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, download timed captions. No signup required for the free tier.',
  },
  '/subtitle-generator': {
    title: 'Subtitle Generator Online – Fast & Accurate | VideoText',
    description:
      'Generate subtitles from video in one click. Upload any video, get SRT or VTT with accurate timestamps. Fast and free tier available.',
  },
  '/srt-translator': {
    title: 'SRT Translator Online – Fast & Accurate | VideoText',
    description:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose target language, download translated captions with timestamps intact.',
  },
  // VIDEO → TRANSCRIPT tree (SEO entry points; same tool as /video-to-transcript)
  '/meeting-transcript': {
    title: 'Meeting Transcript — Turn Meetings into Text | VideoText',
    description:
      'Convert meeting recordings to text. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Download or copy. No signup for free tier.',
  },
  '/speaker-diarization': {
    title: 'Speaker-Separated Video Transcripts — Instantly Online | VideoText',
    description:
      'Get video transcripts with speaker labels. Transcribe, then view Speakers branch and translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Free tier.',
  },
  '/video-summary-generator': {
    title: 'Video Summary Generator — Decisions, Actions, Key Points | VideoText',
    description:
      'Extract structured summaries from video: decisions, action items, key points. Transcribe, use Summary branch, and translate transcript to 6 languages. Free tier.',
  },
  '/video-chapters-generator': {
    title: 'Video Chapters Generator — Section Headings from Transcript | VideoText',
    description:
      'Generate chapter headings from your video transcript. Upload, transcribe, use Chapters branch. View or translate transcript in English, Hindi, Telugu, Spanish, Chinese, Russian. Free.',
  },
  '/keyword-indexed-transcript': {
    title: 'Keyword-Indexed Transcript — Topic Index from Video | VideoText',
    description:
      'Get a keyword index from your video transcript. Repeated terms link to sections. Translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Upload, transcribe, open Keywords branch.',
  },
  // VIDEO → SUBTITLES tree (SEO entry points; same tool as /video-to-subtitles)
  '/srt-to-vtt': {
    title: 'SRT to VTT Converter — Subtitle Format Conversion | VideoText',
    description:
      'Generate VTT from video or convert SRT to VTT. Upload video for SRT/VTT, or use the convert step after generating. Free tier.',
  },
  '/subtitle-converter': {
    title: 'Subtitle Converter — SRT, VTT, TXT | VideoText',
    description:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats. Free tier.',
  },
  '/subtitle-timing-fixer': {
    title: 'Subtitle Timing Fixer — Fix Overlaps and Gaps | VideoText',
    description:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free. Same tool as Fix Subtitles.',
  },
  '/subtitle-validation': {
    title: 'Subtitle Validation — Check Timing and Format | VideoText',
    description:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free. Same tool as Fix Subtitles.',
  },
  // TRANSLATE SUBTITLES tree (SEO entry points; same tool as /translate-subtitles)
  '/subtitle-translator': {
    title: 'Subtitle Translator — SRT/VTT to Any Language | VideoText',
    description:
      'Translate SRT or VTT subtitles to 50+ languages. Upload, pick target language, download. Timestamps stay intact. Free tier.',
  },
  '/multilingual-subtitles': {
    title: 'Multilingual Subtitles — Multiple Languages from One File | VideoText',
    description:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages. Free tier.',
  },
  '/subtitle-language-checker': {
    title: 'Subtitle Language Checker — Detect and Translate | VideoText',
    description:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
  },
  // FIX SUBTITLES tree (SEO entry points; same tool as /fix-subtitles)
  '/subtitle-grammar-fixer': {
    title: 'Subtitle Grammar Fixer — Auto-Correct Caption Text | VideoText',
    description:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free. Same tool as Fix Subtitles.',
  },
  '/subtitle-line-break-fixer': {
    title: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping | VideoText',
    description:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
  },
  // BURN SUBTITLES tree (SEO entry points; same tool as /burn-subtitles)
  '/hardcoded-captions': {
    title: 'Hardcoded Captions — Burn Subtitles into Video | VideoText',
    description:
      'Burn SRT or VTT subtitles into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier.',
  },
  '/video-with-subtitles': {
    title: 'Video with Subtitles — Add Captions to Video | VideoText',
    description:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. No signup for free tier.',
  },
  // COMPRESS VIDEO tree (SEO entry points; same tool as /compress-video)
  '/video-compressor': {
    title: 'Video Compressor — Reduce File Size Online | VideoText',
    description:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. No signup required.',
  },
  '/reduce-video-size': {
    title: 'Reduce Video Size — Compress Without Losing Quality | VideoText',
    description:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
  },
  // BATCH PROCESSING tree (SEO entry points; same tool as /batch-process)
  '/batch-video-processing': {
    title: 'Batch Video Processing — Multiple Videos at Once | VideoText',
    description:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans. Same tool as Batch Process.',
  },
  '/bulk-subtitle-export': {
    title: 'Bulk Subtitle Export — SRT for Many Videos | VideoText',
    description:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download ZIP. Pro+ plans. Same tool as Batch Process.',
  },
  '/bulk-transcript-export': {
    title: 'Bulk Transcript Export — Text for Many Videos | VideoText',
    description:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro+ plans. Same tool as Batch Process.',
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
      'VideoText: AI-powered video to text and subtitle tools. Transcribe, view transcript in 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian), generate SRT/VTT, translate subtitles, fix, burn, compress video. Paste URL or upload. Free tier.',
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
      'Free online tools: video to transcript (with translation to Hindi, Telugu, Spanish, Chinese, Russian), video to subtitles (SRT/VTT), translate subtitles, fix, burn, compress video. AI-powered. No signup.',
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
