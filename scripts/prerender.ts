/**
 * Post-build prerender script.
 *
 * Generates static HTML files for every SEO and static route, injecting the
 * correct <title>, <meta name="description">, <link rel="canonical">, Open Graph,
 * Twitter Card, and JSON-LD into each file's <head>.
 *
 * Vercel serves static files before evaluating rewrites, so a file at
 * dist/video-to-text/index.html is served directly — no JS required for crawlers.
 *
 * Run: npx tsx scripts/prerender.ts
 * Or add as a postbuild step: "postbuild": "npx tsx scripts/prerender.ts"
 */

import * as fs from 'fs'
import * as path from 'path'
import { getProgrammaticSeoEntries } from '../client/src/lib/generateSeoPages'
import { getCanonicalPathForRoute } from '../client/src/lib/primaryUrls'
import { getSoftwareApplicationJsonLd, getHowToJsonLd } from '../client/src/lib/seoMeta'
import { getIndexablePaths } from './seo/registry'

const REPO_ROOT = path.resolve(__dirname, '..')
// Vercel outputDirectory is the root-level dist/ (build copies client/dist → dist/).
// Prerender must write here so Vercel serves per-route HTML directly to crawlers.
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const SITE_URL = 'https://videotext.io'
const SITE_NAME = 'VideoText'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteMeta {
  path: string
  title: string
  description: string
  h1?: string
  faq?: Array<{ q: string; a: string }>
  breadcrumbLabel?: string
  noindex?: boolean
  // High-conversion content fields
  valueProposition?: string
  keywords?: string[]
  comparison?: { tool: string; vs: string }[]
  howToUse?: Array<{ step: number; title: string; detail: string }>
  socialProof?: { stat: string; desc: string }[]
  // Optional fields for registry entries (not in static meta)
  intentKey?: string
  defaultInputMode?: 'youtube'
}

const MONEY_PAGES: Array<{ path: string; label: string }> = [
  { path: '/video-to-transcript', label: 'Video to Transcript' },
  { path: '/video-to-subtitles', label: 'Video to Subtitles' },
  { path: '/translate-subtitles', label: 'Translate Subtitles' },
  { path: '/fix-subtitles', label: 'Fix Subtitles' },
  { path: '/burn-subtitles', label: 'Burn Subtitles' },
  { path: '/compress-video', label: 'Compress Video' },
]

// ── Static route metadata ─────────────────────────────────────────────────────

const STATIC_META: RouteMeta[] = [
  {
    path: '/',
    title: `Video to Text & Subtitles — Free Online Tools | ${SITE_NAME}`,
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, generate SRT/VTT, translate subtitles, fix timing, burn captions, compress video. Sign up for free to try.',
    h1: 'AI-Powered Video to Text & Subtitles',
  },
  {
    path: '/pricing',
    title: `Pricing — Free, Basic, Pro & Agency Plans | ${SITE_NAME}`,
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee.",
    h1: 'Simple, Transparent Pricing',
    keywords: ['VideoText pricing', 'pricing plans', 'free transcription tool', 'cheap video transcription', 'affordable transcription service', 'transcription pricing comparison', 'monthly subscription plans', 'no hidden fees', 'money-back guarantee'],
  },
  {
    path: '/privacy',
    title: `Privacy Policy — We Don't Store Your Data | ${SITE_NAME}`,
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours.",
    h1: 'Privacy Policy',
  },
  {
    path: '/faq',
    title: `FAQ — Privacy, Billing, Tools | ${SITE_NAME}`,
    description:
      "Frequently asked questions about VideoText: privacy, data storage, billing, free tier, translation, and tools. Your files are processed and deleted immediately.",
    h1: 'Frequently Asked Questions',
    faq: [
      { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them. We don't keep your uploads, transcripts, or generated outputs. Your content is never stored on our servers." },
      { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models." },
      { q: 'Do I need to sign up?', a: "Yes. Sign up for free to try the tools. No credit card required. Upgrade when you need more imports or paid features." },
      { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM, MKV. Subtitles: SRT and VTT. You can also paste a video URL for supported sources." },
      { q: 'How does the free tier work?', a: "Sign up for free to get 3 imports per month (resets on the 1st), single language output, watermark on subtitle exports. No credit card required." },
      { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use Translate Subtitles for SRT/VTT files (50+ languages). For transcripts, click Translate after generating to view in 6 languages: English, Hindi, Telugu, Spanish, Chinese, Russian." },
    ],
  },
  {
    path: '/guide',
    title: `How to Use VideoText — Tool Guide & Features | ${SITE_NAME}`,
    description:
      'Step-by-step guide to every VideoText tool: Video to Transcript, Video to Subtitles, Translate, Fix, Burn, Compress, Batch. What we expect, what you get, and plan limits.',
    h1: 'How to Use VideoText',
    keywords: ['how to use VideoText', 'VideoText tutorial', 'video transcription guide', 'subtitle generation guide', 'how to transcribe video', 'how to generate subtitles', 'step-by-step tutorial', 'feature guide', 'all tools explained'],
  },
  {
    path: '/terms',
    title: `Terms of Service | ${SITE_NAME}`,
    description:
      "Terms of use for VideoText. We don't store your data. Billing via Stripe. Use the service in accordance with these terms.",
    h1: 'Terms of Service',
  },
  {
    path: '/blog',
    title: `Blog — Engineering, Privacy & Product | ${SITE_NAME}`,
    description:
      'The VideoText blog: how the processing pipeline works, why we delete your files, batch subtitles for creators, transcription guides, and product updates.',
    h1: 'Blog',
  },
  {
    path: '/samples',
    title: `Transcript & Subtitle Output Samples | ${SITE_NAME}`,
    description:
      'Real output examples from VideoText: transcript sample with speakers/timestamps, SRT subtitle preview, and workflow deliverables (summary, chapters, exports).',
    h1: 'Transcript & Subtitle Output Samples',
  },
  {
    path: '/changelog',
    title: `Changelog — What's New | ${SITE_NAME}`,
    description:
      "VideoText changelog: new features, performance improvements, and bug fixes. Updated every release.",
    h1: 'Changelog',
  },

  {
    path: '/site-index',
    title: `All VideoText Pages — Complete HTML Index for Crawlers | ${SITE_NAME}`,
    description:
      'Complete HTML index of VideoText pages for search crawlers and LLM agents. Browse all transcription, subtitle, tools, and comparison pages from one place.',
    h1: 'Complete VideoText Page Index',
    noindex: false,
  },

  {
    path: '/video-to-transcript',
    title: `Video to Transcript — Free AI Transcription & Translation | ${SITE_NAME}`,
    description:
      'Convert video to text with AI. View transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Upload video, get plain-text transcript. Summary, chapters, speakers. Free tier.',
    h1: 'Video to Transcript',
    valueProposition: 'Convert any video into searchable, editable text in under 5 minutes. 98.5%+ accuracy with speaker labels, chapters, and multi-language translation. No download limits. Files deleted after processing.',
    keywords: ['video to transcript', 'transcribe video', 'AI transcription', 'video to text', 'speech to text', 'accurate transcription', 'free transcription tool', 'transcription software'],
    comparison: [
      { tool: 'Otter.ai', vs: '18-30 min processing, $120/year minimum' },
      { tool: 'Descript', vs: '15 min processing, $24/month, desktop only' },
      { tool: 'Rev', vs: 'Human transcription, $1.25/min, slow turnaround' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Your Video', detail: 'MP4, MOV, AVI, WebM, MKV supported. Or paste a YouTube URL directly.' },
      { step: 2, title: 'Get Instant Transcript', detail: 'AI processing runs in seconds. You\'ll see the transcript building in real-time.' },
      { step: 3, title: 'Edit & Export', detail: 'Copy text, download TXT, get speaker labels, or generate SRT subtitles.' },
    ],
    socialProof: [
      { stat: '127,000+', desc: 'Videos transcribed' },
      { stat: '98.5%', desc: 'Word accuracy rate' },
      { stat: '3-5 min', desc: 'Average processing time' },
      { stat: '50,000+', desc: 'Creators using VideoText' },
    ],
  },
  {
    path: '/video-to-subtitles',
    title: `Video to Subtitles — SRT & VTT Generator | ${SITE_NAME}`,
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Upload video. Single or multi-language. Free tier available.',
    h1: 'Video to Subtitles',
    valueProposition: 'Create publication-ready SRT and VTT subtitle files in seconds. Perfect for YouTube, Vimeo, social media. No manual timing. No transcription service delays. Free tier: 3 imports/month.',
    keywords: ['video to subtitles', 'subtitle generator', 'SRT generator', 'VTT generator', 'auto subtitle', 'caption generator', 'subtitle maker', 'automatic captions'],
    comparison: [
      { tool: 'Submagic', vs: 'Expensive per video, limited exports' },
      { tool: 'Kapwing', vs: 'Video editor overhead, not transcription-focused' },
      { tool: 'YouTube Auto-Captions', vs: 'Lower accuracy, no export as files' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video File', detail: 'Drag & drop MP4, MOV, or paste a YouTube link. Processing starts instantly.' },
      { step: 2, title: 'Choose Format', detail: 'Select SRT (universal) or VTT (modern web players). Single or multi-language.' },
      { step: 3, title: 'Download & Upload', detail: 'Get your .srt or .vtt file in seconds. Upload to YouTube Studio, Vimeo, or any player.' },
    ],
    socialProof: [
      { stat: '50,000+', desc: 'Creators generating subtitles' },
      { stat: '98.5%', desc: 'Accuracy (better than YouTube)' },
      { stat: '2-4 min', desc: 'Time to publication-ready subtitles' },
      { stat: '99%', desc: 'Format compatibility (YouTube, Vimeo, TikTok)' },
    ],
  },
  {
    path: '/translate-subtitles',
    title: `Translate Subtitles — SRT/VTT to Any Language | ${SITE_NAME}`,
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload subtitles, pick target language, download. Free tier available.',
    h1: 'Translate Subtitles',
    valueProposition: 'Translate subtitle files to 50+ languages in seconds. Preserve perfect timing and formatting. Works with SRT, VTT, and all major formats. Support for Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, and more. No watermarks, no registration required for small files.',
    keywords: ['translate subtitles', 'subtitle translator', 'SRT translator', 'VTT translator', 'translate SRT online', 'free subtitle translation', 'multilingual subtitles', 'subtitle translation tool', 'batch translate subtitles', 'translate subtitles to spanish', 'translate subtitles to hindi', 'translate subtitles to french', '50+ language translation'],
    comparison: [
      { tool: 'Manual translation', vs: 'Hours of work, expensive, error-prone' },
      { tool: 'Generic translation tools', vs: 'Lose subtitle timing and formatting' },
      { tool: 'Translation agencies', vs: '$200-500 per file, weeks for turnaround' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Subtitle File', detail: 'SRT, VTT, or any subtitle format. Drag & drop or browse.' },
      { step: 2, title: 'Choose Target Language', detail: 'Pick from 50+ languages. Timestamps stay perfect.' },
      { step: 3, title: 'Download Translated File', detail: 'Same format, new language. Upload directly to your platform.' },
    ],
    socialProof: [
      { stat: '50+', desc: 'Languages supported' },
      { stat: '100%', desc: 'Timing preserved' },
      { stat: '0.5 sec', desc: 'Translation time' },
      { stat: '98%', desc: 'Accuracy maintained' },
    ],
  },
  {
    path: '/fix-subtitles',
    title: `Fix Subtitles — Auto-Correct Timing & Format | ${SITE_NAME}`,
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting. Upload SRT or VTT, download corrected file. Free.',
    h1: 'Fix Subtitles',
    valueProposition: 'Fix out-of-sync, overlapping, and malformed subtitles instantly. Auto-correct timing offsets, merge overlapping cues, split long lines, and validate formatting. Works with SRT, VTT, ASS, and TTML. No quality loss, no manual re-timing needed. Free and unlimited.',
    keywords: ['fix subtitles', 'subtitle fixer', 'fix out of sync subtitles', 'fix SRT timing', 'subtitle timing fixer', 'online subtitle editor', 'fix VTT files', 'subtitle editor free', 'fix overlapping subtitles', 'subtitle formatter', 'correct subtitle timing', 'shift subtitle timing', 'fix broken subtitles'],
    comparison: [
      { tool: 'Manual editing in Subtitle Edit', vs: '30+ min per file, steep learning curve' },
      { tool: 'Sync issues in Premiere', vs: 'Complex, no batch processing' },
      { tool: 'Online editors with UI', vs: 'Slow, limited fixes, require login' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Subtitle File', detail: 'SRT, VTT, ASS, or TTML file. Automatic detection of issues.' },
      { step: 2, title: 'Review Corrections', detail: 'See overlaps, long lines, gaps highlighted. Adjust offset if needed.' },
      { step: 3, title: 'Download Fixed File', detail: 'Ready for YouTube, Vimeo, or any platform. Perfect timing guaranteed.' },
    ],
    socialProof: [
      { stat: '4 file formats', desc: 'Supported: SRT, VTT, ASS, TTML' },
      { stat: 'Instant', desc: 'Fix any size file' },
      { stat: '98%+', desc: 'QC pass rate' },
      { stat: '0 cost', desc: 'Always free' },
    ],
  },
  {
    path: '/burn-subtitles',
    title: `Burn Subtitles into Video — Hardcode Captions | ${SITE_NAME}`,
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier available.',
    h1: 'Burn Subtitles into Video',
    valueProposition: 'Embed subtitles permanently into your video as hardcoded captions. Perfect for social media where external subtitle tracks won\'t disappear. Works with SRT and VTT files. Supports all major video formats: MP4, MOV, WebM. Customize position, size, and color. No watermarks, no quality loss.',
    keywords: ['burn subtitles', 'hardcode captions', 'embed subtitles in video', 'burn SRT into video', 'hardcoded captions', 'permanent subtitles', 'overlay subtitles on video', 'add captions to video', 'subtitle burner', 'hardcode subtitles free', 'burn subtitles online', 'burn subtitles without software', 'batch burn subtitles'],
    comparison: [
      { tool: 'Premiere Pro / Final Cut', vs: 'Steep learning curve, slow rendering, expensive' },
      { tool: 'FFmpeg command line', vs: 'Complex syntax, no UI, easy to make mistakes' },
      { tool: 'Adobe Media Encoder', vs: 'Expensive subscription, slow processing' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video & Subtitles', detail: 'Video file (MP4, MOV, WebM) + SRT or VTT file. Drag & drop both.' },
      { step: 2, title: 'Customize Appearance', detail: 'Choose position (bottom, top), size, color. Preview instantly.' },
      { step: 3, title: 'Download Hardcoded Video', detail: 'Video with embedded captions. Works on any platform without subtitle support.' },
    ],
    socialProof: [
      { stat: '100%', desc: 'Permanent captions (no player needed)' },
      { stat: '3 formats', desc: 'Video support: MP4, MOV, WebM' },
      { stat: 'Zero lag', desc: 'No quality loss or re-encoding delay' },
      { stat: 'Free tier', desc: '3 videos/month included' },
    ],
  },
  {
    path: '/compress-video',
    title: `Compress Video — Reduce File Size Online | ${SITE_NAME}`,
    description:
      'Compress video online: light, medium, or heavy compression. Upload video. Reduce file size for sharing and uploads. Free tier available.',
    h1: 'Compress Video',
    valueProposition: 'Reduce video file size by 40-80% without losing quality. Choose light, medium, or heavy compression. Upload MP4, MOV, AVI, WebM, MKV. Download instantly. No software required, no watermark, works on any device.',
    keywords: ['compress video', 'video compressor', 'reduce video size', 'video compression tool', 'compress MP4', 'free video compressor', 'compress video online', 'reduce file size', 'compress MOV', 'compress AVI', 'compress WebM', 'compress video without losing quality', 'batch compress videos'],
    comparison: [
      { tool: 'Adobe Media Encoder', vs: '$55/month, slow, quality loss, steep learning' },
      { tool: 'HandBrake', vs: 'Free but complex UI, slow processing, needs installation' },
      { tool: 'Online converters', vs: 'Ads, slow servers, file size limits, quality degradation' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video File', detail: 'MP4, MOV, AVI, WebM, or MKV. Any size, instant preview.' },
      { step: 2, title: 'Choose Compression Level', detail: 'Light (5-15% reduction), Medium (30-50%), or Heavy (60-80%).' },
      { step: 3, title: 'Download Compressed Video', detail: 'Same quality, smaller size. Ready to upload, email, or share.' },
    ],
    socialProof: [
      { stat: '40-80%', desc: 'File size reduction maintained' },
      { stat: '5 formats', desc: 'Supported: MP4, MOV, AVI, WebM, MKV' },
      { stat: 'Instant', desc: 'No waiting, no email, download direct' },
      { stat: 'Free', desc: '3 videos/month included' },
    ],
  },
  {
    path: '/batch-process',
    title: `Batch Video to Subtitles — Multiple Videos at Once | ${SITE_NAME}`,
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans.',
    h1: 'Batch Video to Subtitles',
    valueProposition: 'Process 10-100+ videos at once. Upload a folder of videos, get a ZIP with perfectly timed SRT/VTT subtitles for each. Save 10+ hours per week. Perfect for creators, agencies, studios, and content teams. No per-file limits on Pro+.',
    keywords: ['batch video processing', 'bulk video transcription', 'batch subtitles', 'batch process videos', 'process multiple videos', 'batch export subtitles', 'bulk subtitle generation', 'batch transcription tool', 'process videos in batch', 'batch SRT generation', 'batch VTT conversion', 'bulk video subtitles'],
    comparison: [
      { tool: 'Manual uploads one-by-one', vs: '5-10 min per video = 50-100+ hours/month' },
      { tool: 'Descript batch mode', vs: '$24/mo + wait times, no SRT export focus' },
      { tool: 'Rev bulk API', vs: '$0.25/min per video, slow turnaround, expensive' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Multiple Videos', detail: 'Drag & drop 10-100+ files at once. MP4, MOV, WebM supported.' },
      { step: 2, title: 'Choose Format & Language', detail: 'SRT or VTT. Single or multi-language. All files use same settings.' },
      { step: 3, title: 'Download ZIP of Subtitles', detail: 'One ZIP file with all subtitles properly named. Ready to upload to each video.' },
    ],
    socialProof: [
      { stat: '100+ videos', desc: 'Process at once' },
      { stat: '99%', desc: 'Time saved vs manual' },
      { stat: 'Parallel processing', desc: 'All files done simultaneously' },
      { stat: 'Pro+ only', desc: 'Unlimited batch processing' },
    ],
  },
  // ── Comparison & alternative pages ──────────────────────────────────────────
  {
    path: '/compare',
    title: `VideoText vs Descript, Otter.ai & Trint — Full Comparison | ${SITE_NAME}`,
    description:
      'Compare VideoText against Descript, Otter.ai, and Trint on speed, accuracy, pricing, and privacy. VideoText is 6x faster, starts free, and deletes your files after processing.',
    h1: 'Compare VideoText',
    breadcrumbLabel: 'Compare',
    valueProposition: 'Switch from Otter, Descript, or Trint and save 80% on costs while cutting processing time in half. Same AI accuracy. Better privacy. No vendor lock-in.',
    keywords: ['transcription tools comparison', 'Otter alternative', 'Descript alternative', 'best transcription software', 'affordable transcription', 'fast transcription'],
    comparison: [
      { tool: 'Otter.ai', vs: '$180/year, 20+ min processing, calls only' },
      { tool: 'Descript', vs: '$288/year, 15 min processing, desktop app' },
      { tool: 'Trint', vs: '$288/year, live transcription only, expensive' },
    ],
    howToUse: [
      { step: 1, title: 'Export Your Data', detail: 'Download transcripts and settings from your current tool.' },
      { step: 2, title: 'Upload to VideoText', detail: 'Paste a YouTube URL or upload video files. Get transcripts in 3-5 minutes.' },
      { step: 3, title: 'Save Money & Time', detail: 'Free tier gets you started. Upgrade when ready. Keep 100% of your files.' },
    ],
    socialProof: [
      { stat: '6x faster', desc: 'Than Descript (3 min vs 18 min)' },
      { stat: '90% cheaper', desc: 'Than Otter ($0 free vs $180/year)' },
      { stat: '98.5%', desc: 'Accuracy rate on diverse audio' },
      { stat: '3,000+', desc: 'Switched from competitors' },
    ],
  },
  // ── Hub pages (category navigation) ──────────────────────────────────────────
  {
    path: '/alternatives',
    title: `Transcription & Subtitle Tool Alternatives | ${SITE_NAME}`,
    description:
      'Explore alternatives to Otter.ai, Descript, Rev, Sonix, and 40+ other transcription tools. Find the perfect AI transcription solution for your needs.',
    h1: 'Transcription & Subtitle Tool Alternatives',
    breadcrumbLabel: 'Alternatives',
  },
  {
    path: '/transcription-tools',
    title: `Transcription Tools & Resources | ${SITE_NAME}`,
    description:
      'Complete collection of transcription tools, guides, and comparisons. From podcasts to interviews to video files — transcription solutions for every use case.',
    h1: 'Transcription Tools & Resources',
    breadcrumbLabel: 'Transcription Tools',
  },
  {
    path: '/subtitle-tools',
    title: `Subtitle Tools & Resources | ${SITE_NAME}`,
    description:
      'Complete toolkit for subtitle creation, translation, editing, and conversion. Perfect for creators, studios, and video professionals.',
    h1: 'Subtitle Tools & Resources',
    breadcrumbLabel: 'Subtitle Tools',
  },
  {
    path: '/descript-alternative',
    title: `Best Free Descript Alternative for Transcription & Subtitles | ${SITE_NAME}`,
    description:
      'Looking for a Descript alternative? VideoText transcribes video 6x faster, starts free ($0 vs $24/mo), and deletes your files. No heavy editor required. Try free.',
    breadcrumbLabel: 'Descript Alternative',
    faq: [
      { q: 'Is VideoText a good free alternative to Descript?', a: 'Yes. VideoText transcribes video to text and generates SRT/VTT subtitles starting free with no credit card required. Unlike Descript, there is no minimum paid plan to get started and no editing software to learn.' },
      { q: 'How does VideoText compare to Descript for transcription?', a: 'Both use Whisper AI. VideoText processes a 1-hour video in about 2 minutes versus Descript\'s 5–10 minutes. VideoText also supports YouTube URL input and direct subtitle burning, which Descript does not offer in its core workflow.' },
      { q: 'Can I switch from Descript to VideoText?', a: 'Yes. VideoText supports the same video formats (MP4, MOV, WebM) and exports SRT and VTT subtitle files compatible with any platform. No project migration needed — just upload and go.' },
    ],
  },
  {
    path: '/otter-ai-alternative',
    title: `Best Otter.ai Alternative for Video Files & Subtitles | ${SITE_NAME}`,
    description:
      "Otter.ai doesn't support video uploads or SRT export. VideoText does — plus YouTube URL input, subtitle translation, and file deletion. Free tier available.",
    breadcrumbLabel: 'Otter.ai Alternative',
    faq: [
      { q: 'What does VideoText do that Otter.ai does not?', a: 'VideoText accepts video file uploads (MP4, MOV, WebM) and YouTube URLs, exports SRT and VTT subtitle files, translates subtitles to 50+ languages, and burns subtitles into video. Otter.ai is audio-only and does not produce subtitle files.' },
      { q: 'Is VideoText free like Otter.ai?', a: 'Both have free tiers. VideoText free includes 3 full-length imports per month with no per-minute cap. Otter.ai free is limited to 300 monthly transcription minutes with a 30-minute meeting cap.' },
      { q: 'Can VideoText replace Otter.ai for meeting transcription?', a: 'Yes. Upload a Zoom, Teams, or Meet recording (MP4 or audio) and VideoText produces a transcript with speaker labels, summary, and chapters. Export as plain text or SRT.' },
    ],
  },
  {
    path: '/trint-alternative',
    title: `Cheaper Trint Alternative That Starts Free | ${SITE_NAME}`,
    description:
      'Trint starts at $80/month. VideoText starts free and scales to $10/month — same Whisper AI accuracy, plus subtitle burning, batch processing, and translation.',
    breadcrumbLabel: 'Trint Alternative',
    faq: [
      { q: 'Why is VideoText cheaper than Trint?', a: 'Trint is priced for enterprise workflows at $80/month. VideoText is built for individuals and small teams — free tier included, paid plans from $10/month for 450 minutes of transcription.' },
      { q: 'Does VideoText match Trint\'s transcription accuracy?', a: 'Both use OpenAI Whisper. VideoText benchmarks at 98.5% word accuracy on clear audio, comparable to Trint\'s published figures.' },
      { q: 'Can I export transcripts from VideoText like Trint?', a: 'Yes. VideoText exports plain text (TXT), SRT, VTT, and more on paid plans. Unlike Trint, VideoText also exports subtitle files and can burn captions directly into video.' },
    ],
  },
  {
    path: '/rev-alternative',
    title: `Best Rev Alternative with Flat-Rate Pricing | ${SITE_NAME}`,
    description:
      'Rev AI charges $0.25/minute. VideoText starts free and costs $10/month for 450 minutes. Same AI accuracy, plus subtitle export, translation, and YouTube support.',
    breadcrumbLabel: 'Rev Alternative',
    faq: [
      { q: 'How is VideoText pricing different from Rev?', a: 'Rev AI charges per-minute ($0.25/min). A 450-minute month costs $112.50 on Rev. VideoText\'s Basic plan covers 450 minutes for $10/month flat — no per-minute billing.' },
      { q: 'Does VideoText support YouTube transcription like Rev?', a: 'Yes. Paste any public YouTube URL directly into VideoText — no download required. Rev does not offer YouTube URL input.' },
      { q: 'Can VideoText generate subtitles like Rev?', a: 'Yes. VideoText generates SRT and VTT subtitle files from any video. You can also translate subtitles to 50+ languages and burn them into the video permanently.' },
    ],
  },
  {
    path: '/happyscribe-alternative',
    title: `Best Free HappyScribe Alternative – Transcription & Subtitles | ${SITE_NAME}`,
    description:
      'HappyScribe starts at $17/month with no free tier and no YouTube URL input. VideoText is free to start — upload any video or paste a YouTube link, get SRT, translate, and burn subtitles.',
    breadcrumbLabel: 'HappyScribe Alternative',
    faq: [
      { q: 'Does VideoText have a free tier unlike HappyScribe?', a: 'Yes. VideoText offers 3 free imports per month with no credit card required. HappyScribe has no free tier — it starts at $17/month.' },
      { q: 'Can VideoText transcribe YouTube videos like HappyScribe?', a: 'Yes. Paste a YouTube URL directly into VideoText — no download needed. HappyScribe requires you to download the video first and upload it manually.' },
      { q: 'Does VideoText support subtitle translation like HappyScribe?', a: 'Yes. VideoText translates SRT and VTT subtitle files to 50+ languages. It also burns translated subtitles into video, which HappyScribe does not offer.' },
    ],
  },
  {
    path: '/sonix-alternative',
    title: `Best Free Sonix Alternative – No Per-Minute Fees | ${SITE_NAME}`,
    description:
      'Sonix charges $22/month plus $0.10/minute overage. VideoText starts free and is $10/month flat — Whisper AI accuracy, YouTube URL support, subtitle burning, zero per-minute billing.',
    breadcrumbLabel: 'Sonix Alternative',
    faq: [
      { q: 'How does VideoText pricing compare to Sonix?', a: 'Sonix charges $22/month plus $0.10/minute for any overage. VideoText is $10/month for 450 minutes flat — no per-minute fees, ever.' },
      { q: 'Is VideoText as accurate as Sonix?', a: 'Both use Whisper AI. VideoText benchmarks at 98.5% word accuracy on clear audio, on par with Sonix\'s published accuracy.' },
      { q: 'Does VideoText support YouTube URL input like Sonix?', a: 'Yes. Paste any YouTube URL directly into VideoText. Sonix requires manual video download and upload. VideoText streams the audio directly from YouTube — no download needed.' },
    ],
  },
  {
    path: '/easyscribe-alternative',
    title: `Best EasyScribe Alternative for Video & Subtitles | ${SITE_NAME}`,
    description:
      'EasyScribe only does basic audio transcription. VideoText handles video files, YouTube URLs, SRT subtitle export, 50+ language translation, and subtitle burning. Free tier available.',
    breadcrumbLabel: 'EasyScribe Alternative',
    faq: [
      { q: 'What does VideoText offer that EasyScribe does not?', a: 'VideoText adds YouTube URL transcription, SRT and VTT subtitle export, subtitle translation to 50+ languages, subtitle burning into video, and batch processing. EasyScribe is limited to basic audio file transcription.' },
      { q: 'Is VideoText free like EasyScribe?', a: 'Yes. VideoText has a free tier with 3 imports per month and no credit card required. Paid plans start at $10/month.' },
    ],
  },
  {
    path: '/notta-alternative',
    title: `Best Free Notta Alternative for Video Files & Subtitles | ${SITE_NAME}`,
    description:
      "Notta's free plan caps files at 3 minutes. VideoText has no per-file limit — transcribe full-length videos, export SRT/VTT, translate to 50+ languages, and burn subtitles. Free tier available.",
    breadcrumbLabel: 'Notta Alternative',
    faq: [
      { q: 'What is a good free Notta alternative for video transcription?', a: "VideoText is a strong free Notta alternative if you need to transcribe video files (MP4, MOV, WebM) or YouTube videos, or if you need SRT/VTT subtitle exports. Notta's free plan is limited to 120 minutes per month with a 3-minute file cap — VideoText offers 3 full-length imports per month with no per-file minute limit." },
      { q: 'How does VideoText compare to Notta for video files?', a: 'VideoText accepts MP4, MOV, WebM, and AVI video uploads plus YouTube URLs. Notta is primarily a meeting transcription tool — video file support is limited on lower plans and there is no YouTube URL input.' },
      { q: 'Can VideoText export SRT subtitle files unlike Notta?', a: 'Yes. VideoText exports SRT and VTT subtitle files on all plans including free. Notta does not offer subtitle file export — it exports transcripts only as text documents.' },
    ],
  },
  // ── About & transparency ─────────────────────────────────────────────────────
  {
    path: '/about',
    title: `About VideoText — AI Transcription Built for Speed & Privacy | ${SITE_NAME}`,
    description:
      'VideoText transcribes video to text in under 5 minutes with 98.5%+ word accuracy. Powered by OpenAI Whisper. Privacy-first: files deleted after processing. 127,000+ videos transcribed. Free tier available.',
    breadcrumbLabel: 'About',
    keywords: ['about VideoText', 'VideoText story', 'our mission', 'privacy-first transcription', 'AI transcription technology', 'Whisper AI', 'video to text company', 'trusted by creators'],
  },
  {
    path: '/open',
    title: `Open Stats — Accuracy, Speed & Transparency | ${SITE_NAME}`,
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
    breadcrumbLabel: 'Open Stats',
    keywords: ['open stats', 'transparency', 'accuracy benchmarks', 'performance metrics', 'transcription statistics', 'processing speed', 'real data', 'public stats'],
  },
  // ── Blog posts ───────────────────────────────────────────────────────────────
  {
    path: '/blog/how-to-transcribe-zoom-recording',
    title: `How to Transcribe a Zoom Recording: Step-by-Step Guide | ${SITE_NAME}`,
    description:
      'Zoom saves recordings as MP4. Here is the exact process to get a clean, searchable transcript from any Zoom call — free, no extra software needed.',
    breadcrumbLabel: 'Transcribe Zoom Recording',
  },
  {
    path: '/blog/srt-vs-vtt-subtitle-formats',
    title: `SRT vs VTT: Which Subtitle Format Should You Use? | ${SITE_NAME}`,
    description:
      'SRT and VTT are both plain-text subtitle formats. The difference comes down to where you upload and what your player supports. Quick guide.',
    breadcrumbLabel: 'SRT vs VTT',
  },
  {
    path: '/blog/how-to-add-subtitles-to-video-free',
    title: `How to Add Subtitles to Any Video for Free | ${SITE_NAME}`,
    description:
      'Generate subtitles automatically, fix timing issues, then burn them into the video permanently — all free, no desktop software required.',
    breadcrumbLabel: 'Add Subtitles Free',
  },
  {
    path: '/blog/best-free-transcription-tools-2026',
    title: `Best Free Transcription Tools in 2026: An Honest Comparison | ${SITE_NAME}`,
    description:
      'We compared Otter.ai, Descript, Whisper, Rev, and VideoText on accuracy, speed, export options, and privacy. Including our own limitations.',
    breadcrumbLabel: 'Best Free Transcription Tools',
  },
  {
    path: '/blog/how-we-handle-support',
    title: `How We Handle Support: Honest, Fast, No Ticket Queue | ${SITE_NAME}`,
    description:
      'Every support email is read by the person who built the product. Here is what that means in practice.',
    breadcrumbLabel: 'How We Handle Support',
  },
  {
    path: '/blog/why-we-delete-your-files',
    title: `Why We Delete Your Files — And Why That Makes Us Faster | ${SITE_NAME}`,
    description:
      'Privacy-first design is not just an ethical choice — it is an architectural one that makes everything run leaner and faster.',
    breadcrumbLabel: 'Why We Delete Your Files',
  },
  {
    path: '/blog/processing-speed-breakdown',
    title: `How VideoText Processes Video: A Plain-English Pipeline Breakdown | ${SITE_NAME}`,
    description:
      'What actually happens between "upload complete" and your subtitle file appearing — and why VideoText is faster than most alternatives.',
    breadcrumbLabel: 'Processing Speed Breakdown',
  },
  {
    path: '/blog/batch-subtitles-for-creators',
    title: `Batch Subtitles: Caption 20 Videos at Once and Download a ZIP | ${SITE_NAME}`,
    description:
      'The batch tool was built for creators and agencies who need to process a week of content in one session without babysitting each upload.',
    breadcrumbLabel: 'Batch Subtitles for Creators',
  },
  {
    path: '/blog/how-to-get-youtube-transcript',
    title: `How to Get a YouTube Video Transcript (Free, Any Video) | ${SITE_NAME}`,
    description:
      "Three ways to get a transcript from any YouTube video — using VideoText, YouTube's own CC export, or the API. Which method is best for your use case.",
    breadcrumbLabel: 'Get YouTube Transcript',
  },
  {
    path: '/blog/how-to-transcribe-audio-to-text-free',
    title: `How to Transcribe Audio to Text for Free in 2026 | ${SITE_NAME}`,
    description:
      'The fastest free methods to convert audio recordings to text: MP3, M4A, WAV. Step-by-step, including accuracy tips and format options.',
    breadcrumbLabel: 'Transcribe Audio to Text Free',
  },
  {
    path: '/blog/how-to-translate-subtitles',
    title: `How to Translate Subtitles to Any Language (SRT & VTT) | ${SITE_NAME}`,
    description:
      'Translate an SRT or VTT subtitle file to Spanish, Arabic, Hindi, French, or 50+ other languages. Keep the original timestamps intact.',
    breadcrumbLabel: 'How to Translate Subtitles',
  },
  {
    path: '/blog/best-transcription-software-2026',
    title: `Best Transcription Software in 2026: Ranked by Speed, Accuracy & Price | ${SITE_NAME}`,
    description:
      'We tested 8 transcription tools — VideoText, Otter.ai, Descript, Trint, Rev, Whisper, and more. Here is which tool wins for each use case.',
    breadcrumbLabel: 'Best Transcription Software 2026',
  },
  {
    path: '/blog/best-video-captioning-tools-2026',
    title: `Best Video Captioning Tools for Content Creators in 2026 | ${SITE_NAME}`,
    description:
      'Auto-captions, burned-in subtitles, translated captions — a practical guide to the best tools for YouTube, Instagram, TikTok, and Reels.',
    breadcrumbLabel: 'Best Video Captioning Tools 2026',
  },
  {
    path: '/blog/how-to-transcribe-podcast-episode',
    title: `How to Transcribe a Podcast Episode (Free, Any Format) | ${SITE_NAME}`,
    description:
      'How to transcribe a podcast episode from MP3 or M4A in minutes. Free tool, 98.5% accuracy, speaker labels, and show notes export included.',
    breadcrumbLabel: 'Transcribe Podcast Episode',
  },
  {
    path: '/blog/how-to-add-captions-youtube-video',
    title: `How to Add Captions to a YouTube Video (The Right Way) | ${SITE_NAME}`,
    description:
      'How to add captions to a YouTube video the right way: upload an SRT file instead of relying on auto-captions. Better accuracy, better SEO.',
    breadcrumbLabel: 'Add Captions to YouTube Video',
  },
  // ── Free client-side tools ───────────────────────────────────────────────────
  {
    path: '/tools',
    title: `Free Video & Subtitle Tools — No Account Needed | ${SITE_NAME}`,
    description:
      'Free browser-based tools for video creators: SRT to VTT converter, subtitle validator, reading speed checker, script timer, bitrate calculator, and more. No upload, no account.',
    breadcrumbLabel: 'Free Tools',
  },
  {
    path: '/tools/srt-to-vtt',
    title: `SRT to VTT Converter — Free Online | ${SITE_NAME}`,
    description:
      'Convert SRT subtitle files to WebVTT format instantly. Paste or upload your .srt file and download a ready-to-use .vtt file. Free, no account, runs in your browser.',
    breadcrumbLabel: 'SRT to VTT',
  },
  {
    path: '/tools/vtt-to-srt',
    title: `VTT to SRT Converter — Free Online | ${SITE_NAME}`,
    description:
      'Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format. Free, browser-based, nothing uploaded to any server.',
    breadcrumbLabel: 'VTT to SRT',
  },
  {
    path: '/tools/shift-subtitle-timing',
    title: `Shift Subtitle Timing — Delay or Advance Subtitles Free | ${SITE_NAME}`,
    description:
      'Fix out-of-sync subtitles by shifting all timestamps forward or backward by any number of seconds. Works with SRT and VTT. Free, browser-based.',
    breadcrumbLabel: 'Shift Subtitle Timing',
  },
  {
    path: '/tools/merge-srt-files',
    title: `Merge SRT Files — Combine Two Subtitle Files Free | ${SITE_NAME}`,
    description:
      'Combine two SRT or VTT subtitle files into one sorted, renumbered file. Free, runs in browser, no account required.',
    breadcrumbLabel: 'Merge SRT Files',
  },
  {
    path: '/tools/srt-to-text',
    title: `SRT to Plain Text — Extract Text from Subtitles Free | ${SITE_NAME}`,
    description:
      'Strip timing codes and indices from SRT or VTT files and extract clean plain text. Perfect for repurposing subtitles as blog posts or transcripts. Free.',
    breadcrumbLabel: 'SRT to Text',
  },
  {
    path: '/tools/subtitle-validator',
    title: `Subtitle Validator — Check SRT & VTT Files Free | ${SITE_NAME}`,
    description:
      'Validate SRT and VTT files for overlapping timestamps, empty cues, long lines, and reading speed errors. Instant report, free, no upload needed.',
    breadcrumbLabel: 'Subtitle Validator',
  },
  {
    path: '/tools/subtitle-reading-speed',
    title: `Subtitle Reading Speed Checker — CPS Analyzer | ${SITE_NAME}`,
    description:
      'Check every subtitle cue for characters-per-second against Netflix (17 CPS), BBC (17 CPS), and EBU (21 CPS) broadcast standards. Free online tool.',
    breadcrumbLabel: 'Reading Speed Checker',
  },
  {
    path: '/tools/subtitle-character-checker',
    title: `Subtitle Character Limit Checker — Netflix, YouTube & BBC | ${SITE_NAME}`,
    description:
      'Check if subtitle lines meet Netflix (42 chars), YouTube (80 chars), or BBC (37 chars) character limits. Instant pass/fail report per cue. Free.',
    breadcrumbLabel: 'Character Limit Checker',
  },
  {
    path: '/tools/subtitle-word-counter',
    title: `Subtitle Word Counter — Count Words in SRT & VTT Files | ${SITE_NAME}`,
    description:
      'Count words, characters, and get speaking rate stats (WPM, CPS) from any SRT or VTT subtitle file. Free, browser-based, instant results.',
    breadcrumbLabel: 'Subtitle Word Counter',
  },
  {
    path: '/tools/video-script-timer',
    title: `Video Script Timer — How Long Will My Video Be? | ${SITE_NAME}`,
    description:
      'Paste your video script and instantly see how long the video will be at different speaking rates. Free tool for YouTube, ads, shorts, and explainers.',
    breadcrumbLabel: 'Video Script Timer',
  },
  {
    path: '/tools/words-per-minute-calculator',
    title: `Words Per Minute Calculator — Speaking Rate Checker | ${SITE_NAME}`,
    description:
      'Calculate your speaking rate in words per minute (WPM). Enter text and recording duration, or word count and time. Instant result, free.',
    breadcrumbLabel: 'Words Per Minute Calculator',
  },
  {
    path: '/tools/video-bitrate-calculator',
    title: `Video Bitrate Calculator — File Size & Quality Estimator | ${SITE_NAME}`,
    description:
      'Calculate the ideal video bitrate for a target file size, or estimate how large your video will be at a given bitrate. Free online calculator.',
    breadcrumbLabel: 'Video Bitrate Calculator',
  },
  {
    path: '/tools/aspect-ratio-calculator',
    title: `Video Aspect Ratio Calculator — 16:9, 9:16, 1:1 & More | ${SITE_NAME}`,
    description:
      'Calculate video aspect ratios, find missing dimensions for 16:9, 9:16, 4:3, and custom ratios. Free for YouTube, TikTok, Instagram, and more.',
    breadcrumbLabel: 'Aspect Ratio Calculator',
  },
  {
    path: '/tools/timestamp-converter',
    title: `Timestamp Converter — Seconds to HH:MM:SS, SRT, VTT & Timecode | ${SITE_NAME}`,
    description:
      'Convert timestamps between seconds, HH:MM:SS, SRT format, VTT format, and SMPTE timecode. Instant, free, no account needed.',
    breadcrumbLabel: 'Timestamp Converter',
  },
  {
    path: '/tools/video-metadata-viewer',
    title: `Video Metadata Viewer — Check Video Info Free | ${SITE_NAME}`,
    description:
      'View video file details — duration, resolution, aspect ratio, and file size — locally in your browser. Nothing is uploaded. Free tool.',
    breadcrumbLabel: 'Video Metadata Viewer',
  },
  {
    path: '/tools/sbv-to-srt',
    title: `SBV to SRT Converter — Convert YouTube Captions Free | ${SITE_NAME}`,
    description:
      'Convert YouTube SBV caption files to standard SRT format instantly. Free, browser-based, nothing uploaded to any server. Works with all YouTube .sbv downloads.',
    breadcrumbLabel: 'SBV to SRT',
  },
  {
    path: '/tools/srt-to-sbv',
    title: `SRT to SBV Converter — Convert Subtitles to YouTube Format Free | ${SITE_NAME}`,
    description:
      "Convert SRT subtitle files to YouTube's native SBV format. Free, browser-based, instant download. No account required.",
    breadcrumbLabel: 'SRT to SBV',
  },
  {
    path: '/tools/ass-to-srt',
    title: `ASS / SSA to SRT Converter — Strip Styling, Keep Dialogue Free | ${SITE_NAME}`,
    description:
      'Convert ASS or SSA subtitle files to plain SRT. Strips all styling tags and positioning codes, preserves dialogue text and timing. Free, runs in your browser.',
    breadcrumbLabel: 'ASS to SRT',
  },
  {
    path: '/tools/ttml-to-srt',
    title: `TTML to SRT Converter — Convert DFXP & EBU-TT Subtitles Free | ${SITE_NAME}`,
    description:
      'Convert TTML, DFXP, or EBU-TT subtitle files to SRT format. Used for Netflix, broadcast, and enterprise video workflows. Free, browser-based.',
    breadcrumbLabel: 'TTML to SRT',
  },
  // ── Hub pages ────────────────────────────────────────────────────────────────
  {
    path: '/subtitle-tools',
    title: `Free Subtitle Tools for Creators — SRT, VTT, Timing & Validation | ${SITE_NAME}`,
    description:
      'Convert SRT to VTT, shift subtitle timing, validate files, check reading speed, and more. All tools are free, browser-based, and require no account.',
    breadcrumbLabel: 'Subtitle Tools',
  },
  {
    path: '/subtitle-resources',
    title: `Subtitle Resources & Standards — Formats, Netflix Rules, CPS Limits | ${SITE_NAME}`,
    description:
      'Subtitle format specs, Netflix delivery requirements, platform character limits, reading speed standards, and timing rules — all in one reference guide.',
    breadcrumbLabel: 'Subtitle Resources',
  },
]

// ── Registry parser ───────────────────────────────────────────────────────────

interface ParsedEntry {
  path: string
  title: string
  description: string
  h1?: string
  breadcrumbLabel: string
  faq: Array<{ q: string; a: string }>
  keywords?: string[]
  valueProposition?: string
  comparison?: { tool: string; vs: string }[]
  howToUse?: Array<{ step: number; title: string; detail: string }>
  socialProof?: { stat: string; desc: string }[]
}

function parseRegistryEntries(): ParsedEntry[] {
  if (!fs.existsSync(REGISTRY_PATH)) return []
  const src = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const entries: ParsedEntry[] = []

  // Split into blocks by path: '/...'
  const pathMatches = [...src.matchAll(/path:\s*'(\/[^']+)'/g)]

  for (let i = 0; i < pathMatches.length; i++) {
    const blockStart = pathMatches[i].index!
    const blockEnd = i + 1 < pathMatches.length ? pathMatches[i + 1].index! : src.length
    const block = src.slice(blockStart, blockEnd)

    const routePath = pathMatches[i][1]

    // Extract title
    const titleMatch = block.match(/\btitle:\s*'((?:[^'\\]|\\.)*)'/)
    const title = titleMatch ? titleMatch[1].replace(/\\'/g, "'") : ''

    // Extract description (may be multi-line with string concatenation)
    const descMatch = block.match(/\bdescription:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)
    const description = descMatch ? descMatch[1].replace(/\\'/g, "'") : ''

    // Extract h1
    const h1Match = block.match(/\bh1:\s*'((?:[^'\\]|\\.)*)'/)
    const h1 = h1Match ? h1Match[1].replace(/\\'/g, "'") : undefined

    // Extract breadcrumbLabel
    const labelMatch = block.match(/breadcrumbLabel:\s*'((?:[^'\\]|\\.)*)'/)
    const breadcrumbLabel = labelMatch ? labelMatch[1].replace(/\\'/g, "'") : routePath.slice(1)

    // Extract FAQ items
    const faq: Array<{ q: string; a: string }> = []
    const faqBlock = block.match(/faq:\s*\[([\s\S]*?)\],/)
    if (faqBlock) {
      const faqContent = faqBlock[1]
      const itemMatches = [...faqContent.matchAll(/\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)]
      for (const m of itemMatches) {
        faq.push({
          q: m[1].replace(/\\'/g, "'"),
          a: m[2].replace(/\\'/g, "'"),
        })
      }
    }

    // Extract keywords
    const keywordMatch = block.match(/keywords:\s*\[([\s\S]*?)\]/)
    let keywords: string[] | undefined
    if (keywordMatch) {
      const keywordContent = keywordMatch[1]
      const keywordMatches = [...keywordContent.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
      keywords = keywordMatches.map(m => m[1].replace(/\\'/g, "'"))
    }

    // Note: We INCLUDE all entries (both indexable: true and false) in prerender
    // The indexable flag only controls sitemap inclusion, not HTML generation.
    // All SEO pages must be prerendered for crawler visibility.
    entries.push({ path: routePath, title, description, h1, breadcrumbLabel, faq, keywords })
  }

  return entries
}

// ── HTML injection ────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Generate keywords from title and path if not explicitly provided
function generateKeywordsFromTitle(title: string, path: string): string[] {
  const cleanTitle = title
    .replace(/\s*\|\s*VideoText$/i, '')
    .replace(/–|—/g, '-')
    .trim()

  const words = cleanTitle
    .toLowerCase()
    .split(/[\s\-]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'all', 'any', 'you', 'can', 'get', 'how', 'why', 'are', 'this', 'that', 'from', 'with', 'into', 'your', 'free'].includes(w))

  const keywords = new Set<string>()

  // Add title-based keywords
  if (words.length > 0) {
    keywords.add(words.join(' '))
    keywords.add(`${words[0]} online`)
    keywords.add(`free ${words[0]}`)
  }

  // Add path-based keywords
  const pathWords = path.slice(1).split('-').filter(w => w.length > 2)
  if (pathWords.length > 0) {
    keywords.add(pathWords.join(' '))
    keywords.add(`${pathWords[0]} ${pathWords[1] || 'tool'}`)
  }

  return Array.from(keywords).slice(0, 8)
}

function titleFromPath(routePath: string): string {
  if (routePath === '/') return `VideoText — AI Transcription & Subtitle Tools | ${SITE_NAME}`
  const label = routePath
    .slice(1)
    .split('/')
    .map((segment) => segment.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
    .join(' — ')
  return `${label} | ${SITE_NAME}`
}

function descriptionFromPath(routePath: string): string {
  if (routePath === '/') {
    return 'VideoText helps you transcribe videos, generate subtitles, translate captions, and export clean transcripts in your browser.'
  }
  const label = routePath.replace(/^\//, '').replace(/\//g, ' ').replace(/-/g, ' ')
  return `VideoText page for ${label}. Fully prerendered HTML for search crawlers, SEO tools, and LLM agents.`
}

function mergeRouteMetaWithSitemapCoverage(routes: RouteMeta[]): RouteMeta[] {
  const byPath = new Map<string, RouteMeta>()
  for (const route of routes) {
    const canonicalPath = getCanonicalPathForRoute(route.path)
    byPath.set(canonicalPath, { ...route, path: canonicalPath })
  }

  const sitemapPaths = getIndexablePaths().map((p) => getCanonicalPathForRoute(p))
  for (const routePath of sitemapPaths) {
    if (!byPath.has(routePath)) {
      byPath.set(routePath, {
        path: routePath,
        title: titleFromPath(routePath),
        description: descriptionFromPath(routePath),
        h1: titleFromPath(routePath).replace(` | ${SITE_NAME}`, ''),
        breadcrumbLabel: routePath === '/' ? 'Home' : routePath.slice(1).replace(/\//g, ' / '),
      })
    }
  }

  return [...byPath.values()]
}

function buildBreadcrumbJsonLd(routePath: string, routeMeta: RouteMeta): object | null {
  if (routePath === '/') return null
  const segments = routePath.split('/').filter(Boolean)
  const items: Array<{ '@type': 'ListItem'; position: number; name: string; item: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
  ]
  let current = ''
  segments.forEach((segment, idx) => {
    current += `/${segment}`
    const name =
      idx === segments.length - 1
        ? routeMeta.breadcrumbLabel || routeMeta.h1 || segment.replace(/-/g, ' ')
        : segment.replace(/-/g, ' ')
    items.push({
      '@type': 'ListItem',
      position: idx + 2,
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      item: `${SITE_URL}${current}`,
    })
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

function buildFaqJsonLd(meta: RouteMeta): object | null {
  if (!meta.faq?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: meta.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

function buildPricingProductJsonLd(routePath: string): object | null {
  if (routePath !== '/pricing') return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'VideoText Transcription & Subtitle Plans',
    description: 'Pricing plans for VideoText AI transcription and subtitle tools: Free, Basic, Pro, and Agency.',
    brand: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    category: 'SaaS',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Basic',
        price: '19',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '49',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Agency',
        price: '129',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
    ],
  }
}

function dedupeSchemas(schemas: object[]): object[] {
  const seen = new Set<string>()
  const unique: object[] = []
  for (const schema of schemas) {
    const key = JSON.stringify(schema)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(schema)
  }
  return unique
}

function injectStructuredData(template: string, routePath: string, meta: RouteMeta): string {
  const schemas: object[] = []
  const breadcrumb = buildBreadcrumbJsonLd(routePath, meta)
  const faq = buildFaqJsonLd(meta)
  const softwareApp = getSoftwareApplicationJsonLd(routePath)
  const howTo = getHowToJsonLd(routePath)
  const product = buildPricingProductJsonLd(routePath)
  if (breadcrumb) schemas.push(breadcrumb)
  if (faq) schemas.push(faq)
  if (softwareApp) schemas.push(softwareApp)
  if (howTo) schemas.push(howTo)
  if (product) schemas.push(product)
  if (!schemas.length) return template
  const scripts = dedupeSchemas(schemas)
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n')
  return template.replace('</head>', `${scripts}\n</head>`)
}

// Hub page link definitions (must match React component lists)
const HUB_PAGE_LINKS: Record<string, Array<{ path: string; label: string }>> = {
  '/alternatives': [
    { path: '/otter-alternative', label: 'Otter Alternative' },
    { path: '/descript-alternative', label: 'Descript Alternative' },
    { path: '/trint-alternative', label: 'Trint Alternative' },
    { path: '/rev-alternative', label: 'Rev Alternative' },
    { path: '/sonix-alternative', label: 'Sonix Alternative' },
    { path: '/happyscribe-alternative', label: 'HappyScribe Alternative' },
    { path: '/easyscribe-alternative', label: 'EasyScribe Alternative' },
    { path: '/notta-alternative', label: 'Notta Alternative' },
    { path: '/tactiq-alternative', label: 'Tactiq Alternative' },
    { path: '/turboscribe-alternative', label: 'TurboScribe Alternative' },
    { path: '/deepgram-alternative', label: 'Deepgram Alternative' },
    { path: '/fireflies-alternative', label: 'Fireflies Alternative' },
    { path: '/riverside-alternative', label: 'Riverside Alternative' },
    { path: '/glean-alternative', label: 'Glean Alternative' },
    { path: '/hedy-ai-alternative', label: 'Hedy AI Alternative' },
    { path: '/genio-alternative', label: 'Genio Alternative' },
    { path: '/maestra-alternative', label: 'Maestra Alternative' },
    { path: '/speechmatics-alternative', label: 'Speechmatics Alternative' },
    { path: '/assembly-ai-alternative', label: 'Assembly AI Alternative' },
    { path: '/allscribe-alternative', label: 'Allscribe Alternative' },
    { path: '/skribo-alternative', label: 'Skribo Alternative' },
    { path: '/dragon-dictate-alternative', label: 'Dragon Dictate Alternative' },
    { path: '/superwhisper-alternative', label: 'SuperWhisper Alternative' },
    { path: '/speechtexter-alternative', label: 'SpeechTexter Alternative' },
    { path: '/speechnotes-alternative', label: 'SpeechNotes Alternative' },
    { path: '/whisper-notes-alternative', label: 'Whisper Notes Alternative' },
    { path: '/macwhisper-alternative', label: 'MacWhisper Alternative' },
    { path: '/microsoft-teams-alternative', label: 'Microsoft Teams Alternative' },
    { path: '/zoom-alternative', label: 'Zoom Alternative' },
    { path: '/webex-alternative', label: 'Webex Alternative' },
    { path: '/meetgeek-alternative', label: 'MeetGeek Alternative' },
    { path: '/scribe-alternative', label: 'Scribe Alternative' },
    { path: '/subly-alternative', label: 'Subly Alternative' },
    { path: '/submagic-alternative', label: 'SubMagic Alternative' },
    { path: '/notability-alternative', label: 'Notability Alternative' },
    { path: '/movavi-alternative', label: 'Movavi Alternative' },
    { path: '/capcut-alternative', label: 'CapCut Alternative' },
    { path: '/subtitle-edit-alternative', label: 'Subtitle Edit Alternative' },
    { path: '/adobe-premiere-captions-alternative', label: 'Adobe Premiere Captions Alternative' },
    { path: '/microsoft-word-transcription-alternative', label: 'Microsoft Word Transcription Alternative' },
    { path: '/panopto-alternative', label: 'Panopto Alternative' },
    { path: '/invideo-alternative', label: 'InVideo Alternative' },
    { path: '/fliki-alternative', label: 'Fliki Alternative' },
    { path: '/kapwing-alternative', label: 'Kapwing Alternative' },
    { path: '/vizard-alternative', label: 'Vizard Alternative' },
    { path: '/whispertype-alternative', label: 'WhisperType Alternative' },
    { path: '/mem-ai-alternative', label: 'Mem AI Alternative' },
    { path: '/vocallab-alternative', label: 'VocalLab Alternative' },
    { path: '/vomo-alternative', label: 'VOMO Alternative' },
    { path: '/krisp-alternative', label: 'Krisp Alternative' },
    { path: '/headliner-alternative', label: 'Headliner Alternative' },
    { path: '/castmagic-alternative', label: 'CastMagic Alternative' },
    { path: '/elevenlabs-alternative', label: 'ElevenLabs Alternative' },
    { path: '/speechify-alternative', label: 'Speechify Alternative' },
    { path: '/spreaker-alternative', label: 'Spreaker Alternative' },
    { path: '/granola-alternative', label: 'Granola Alternative' },
    { path: '/zubtitle-alternative', label: 'Zubtitle Alternative' },
    { path: '/youtube-auto-captions-alternative', label: 'YouTube Auto-Captions Alternative' },
    { path: '/google-docs-voice-typing-alternative', label: 'Google Docs Voice Typing Alternative' },
    { path: '/dictation-io-alternative', label: 'Dictation.io Alternative' },
    { path: '/ditto-transcripts-alternative', label: 'Ditto Transcripts Alternative' },
    { path: '/whisperx-alternative', label: 'WhisperX Alternative' },
  ],
  '/transcription-tools': [
    { path: '/video-to-transcript', label: 'Video to Transcript' },
    { path: '/youtube-transcript-generator', label: 'YouTube Transcript Generator' },
    { path: '/youtube-to-transcript', label: 'YouTube to Transcript' },
    { path: '/voice-recorder', label: 'Voice to Text Recorder' },
    { path: '/podcast-transcription-tool', label: 'Podcast Transcription' },
    { path: '/meeting-transcription', label: 'Meeting Transcription' },
    { path: '/interview-transcription-tool', label: 'Interview Transcription' },
    { path: '/podcast-transcription', label: 'Podcast Transcription' },
    { path: '/webinar-transcription', label: 'Webinar Transcription' },
    { path: '/video-interview-transcription', label: 'Video Interview Transcription' },
    { path: '/zoom-recording-transcription', label: 'Zoom Recording Transcription' },
    { path: '/loom-transcription', label: 'Loom Transcription' },
    { path: '/google-meet-transcription', label: 'Google Meet Transcription' },
    { path: '/teams-meeting-transcription', label: 'Teams Meeting Transcription' },
    { path: '/teams-meeting-transcript', label: 'Teams Meeting Transcript' },
    { path: '/vimeo-transcription', label: 'Vimeo Transcription' },
    { path: '/tiktok-to-transcript', label: 'TikTok to Transcript' },
    { path: '/transcribe-video-online', label: 'Transcribe Video Online' },
    { path: '/press-conference-transcription', label: 'Press Conference Transcription' },
    { path: '/best-transcription-tool', label: 'Best Transcription Tool' },
    { path: '/fastest-transcription-tool', label: 'Fastest Transcription Tool' },
    { path: '/fastest-transcription-software', label: 'Fastest Transcription Software' },
    { path: '/best-youtube-transcription-tool', label: 'Best YouTube Transcription Tool' },
    { path: '/best-podcast-transcription-tool', label: 'Best Podcast Transcription Tool' },
    { path: '/transcription-benchmark', label: 'Transcription Benchmark' },
    { path: '/otter-vs-videotext', label: 'Otter vs VideoText' },
    { path: '/descript-vs-videotext', label: 'Descript vs VideoText' },
    { path: '/videotext-vs-rev', label: 'VideoText vs Rev' },
    { path: '/videotext-vs-turboscribe', label: 'VideoText vs TurboScribe' },
    { path: '/ai-transcription-tools', label: 'AI Transcription Tools' },
    { path: '/ai-transcription-workflow', label: 'AI Transcription Workflow' },
    { path: '/free-speech-to-text', label: 'Free Speech to Text' },
    { path: '/free-video-transcription-tool', label: 'Free Video Transcription Tool' },
    { path: '/accuracy-test', label: 'Accuracy Test' },
    { path: '/translate-subtitles', label: 'Translate Subtitles' },
    { path: '/compress-video', label: 'Compress Video' },
  ],
  '/subtitle-tools': [
    { path: '/video-to-subtitles', label: 'Video to Subtitles' },
    { path: '/subtitle-generator', label: 'Subtitle Generator' },
    { path: '/auto-subtitle-generator', label: 'Auto Subtitle Generator' },
    { path: '/youtube-subtitle-generator', label: 'YouTube Subtitle Generator' },
    { path: '/caption-video-online', label: 'Caption Video Online' },
    { path: '/video-with-subtitles', label: 'Video with Subtitles' },
    { path: '/batch-process', label: 'Batch Video to Subtitles' },
    { path: '/fix-subtitles', label: 'Fix Subtitles' },
    { path: '/burn-subtitles', label: 'Burn Subtitles into Video' },
    { path: '/subtitle-timing-fixer', label: 'Subtitle Timing Fixer' },
    { path: '/subtitle-line-break-fixer', label: 'Subtitle Line Break Fixer' },
    { path: '/subtitle-grammar-fixer', label: 'Subtitle Grammar Fixer' },
    { path: '/subtitle-language-checker', label: 'Subtitle Language Checker' },
    { path: '/translate-subtitles', label: 'Translate Subtitles' },
    { path: '/srt-translator', label: 'SRT Translator' },
    { path: '/subtitle-translator', label: 'Subtitle Translator' },
    { path: '/multilingual-subtitles', label: 'Multilingual Subtitles' },
    { path: '/srt-to-vtt', label: 'SRT to VTT Converter' },
    { path: '/subtitle-converter', label: 'Subtitle Converter' },
    { path: '/tools/srt-to-vtt', label: 'Free SRT to VTT Tool' },
    { path: '/subtitle-validator', label: 'Subtitle Validator' },
    { path: '/subtitle-word-counter', label: 'Subtitle Word Counter' },
    { path: '/subtitle-character-checker', label: 'Subtitle Character Checker' },
    { path: '/subtitle-reading-speed', label: 'Subtitle Reading Speed' },
    { path: '/tools/merge-srt-files', label: 'Merge SRT Files' },
    { path: '/tools/srt-to-text', label: 'SRT to Text' },
    { path: '/tools/srt-to-sbv', label: 'SRT to SBV' },
    { path: '/tools/ass-to-srt', label: 'ASS to SRT' },
    { path: '/tools/ttml-to-srt', label: 'TTML to SRT' },
    { path: '/tools/shift-subtitle-timing', label: 'Shift Subtitle Timing' },
    { path: '/subtitle-resources', label: 'Subtitle Resources & Standards' },
    { path: '/open-captions-vs-closed-captions', label: 'Open vs Closed Captions' },
    { path: '/free-captions-and-subtitles', label: 'Free Captions & Subtitles' },
    { path: '/ada-video-captions', label: 'ADA Video Captions' },
    { path: '/sdh-subtitles', label: 'SDH Subtitles' },
    { path: '/hardcoded-captions', label: 'Hardcoded Captions' },
  ],
}

function buildH1Html(h1Text: string): string {
  return `<h1 style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">${escapeHtml(h1Text)}</h1>`
}

function buildConversionContent(meta: RouteMeta): string {
  const parts: string[] = []

  // Value Proposition
  if (meta.valueProposition) {
    parts.push(`
      <section style="margin:32px 0;padding:24px;background:#f9fafb;border-radius:8px;border-left:4px solid #2563eb">
        <p style="margin:0;font-size:16px;line-height:1.6;color:#1f2937">${escapeHtml(meta.valueProposition)}</p>
      </section>
    `)
  }

  // Keywords section
  if (meta.keywords && meta.keywords.length > 0) {
    const keywordList = meta.keywords
      .map((k) => `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;padding:6px 12px;margin:4px 4px 4px 0;border-radius:4px;font-size:14px">${escapeHtml(k)}</span>`)
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:12px">Key Features & Keywords</h2>
        <div style="display:flex;flex-wrap:wrap">${keywordList}</div>
      </section>
    `)
  }

  // Comparison
  if (meta.comparison && meta.comparison.length > 0) {
    const comparisonRows = meta.comparison
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:12px;text-align:left;color:#1f2937">${escapeHtml(c.tool)}</td>
          <td style="padding:12px;text-align:center;color:#dc2626">❌ ${escapeHtml(c.vs)}</td>
          <td style="padding:12px;text-align:center;color:#16a34a">✅ VideoText</td>
        </tr>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px">How VideoText Compares</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead style="background:#f3f4f6">
            <tr>
              <th style="padding:12px;text-align:left;color:#374151;font-weight:600">Feature</th>
              <th style="padding:12px;text-align:center;color:#374151;font-weight:600">Competitors</th>
              <th style="padding:12px;text-align:center;color:#374151;font-weight:600">VideoText</th>
            </tr>
          </thead>
          <tbody>${comparisonRows}</tbody>
        </table>
      </section>
    `)
  }

  // How to Use
  if (meta.howToUse && meta.howToUse.length > 0) {
    const steps = meta.howToUse
      .map(
        (h) => `
        <div style="display:flex;gap:16px;margin-bottom:20px">
          <div style="min-width:40px;width:40px;height:40px;background:#2563eb;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">${h.step}</div>
          <div>
            <h3 style="margin:0 0 8px 0;font-weight:600;color:#1f2937">${escapeHtml(h.title)}</h3>
            <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6">${escapeHtml(h.detail)}</p>
          </div>
        </div>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:24px">How to Use VideoText</h2>
        ${steps}
      </section>
    `)
  }

  // Social Proof
  if (meta.socialProof && meta.socialProof.length > 0) {
    const stats = meta.socialProof
      .map(
        (s) => `
        <div style="flex:1;min-width:200px;padding:20px;background:#f9fafb;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:bold;color:#2563eb;margin-bottom:8px">${escapeHtml(s.stat)}</div>
          <p style="margin:0;color:#4b5563;font-size:14px">${escapeHtml(s.desc)}</p>
        </div>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px">Why Creators Trust VideoText</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${stats}</div>
      </section>
    `)
  }

  // CTA
  parts.push(`
    <section style="margin:32px 0;padding:24px;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);border-radius:8px;text-align:center;color:white">
      <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:bold">Ready to Get Started?</h2>
      <p style="margin:0 0 16px 0;font-size:14px;opacity:0.95">Sign up free. No credit card required. 3 imports per month included.</p>
      <a href="/" style="display:inline-block;background:white;color:#2563eb;padding:12px 24px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px">Start Now Free</a>
    </section>
  `)

  return `<div style="max-width:800px;margin:32px auto;padding:0 16px;font-family:system-ui,-apple-system,sans-serif">${parts.join('')}</div>`
}

function buildHubPageHtml(path: string, title: string): string {
  const links = HUB_PAGE_LINKS[path] || []
  const linkHtml = links
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.path)}" style="display:block;padding:12px;border:1px solid #e5e7eb;border-radius:8px;color:#1f2937;text-decoration:none;margin-bottom:8px">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n')

  return `
    <div style="max-width:1280px;margin:40px auto;padding:0 16px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;margin-top:32px">
        <div>
          <h2 style="font-size:20px;font-weight:bold;margin-bottom:8px">${escapeHtml(title)}</h2>
          <ul style="list-style:none;padding:0;margin:0">
            ${linkHtml}
          </ul>
        </div>
      </div>
    </div>
  `
}

// Inject canonical primary tool links into hub pages as separate section
function buildCanonicalToolsSection(hubPath: string): string {
  let tools: Array<{ path: string; label: string }> = []

  if (hubPath === '/subtitle-tools') {
    tools = [
      { path: '/burn-subtitles', label: 'Burn Subtitles into Video' },
    ]
  } else if (hubPath === '/transcription-tools') {
    tools = [
      { path: '/translate-subtitles', label: 'Translate Subtitles' },
      { path: '/compress-video', label: 'Compress Video' },
    ]
  }

  if (tools.length === 0) return ''

  const linkHtml = tools
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.path)}" style="display:block;padding:12px;border:1px solid #e5e7eb;border-radius:8px;color:#1f2937;text-decoration:none;margin-bottom:8px">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n')

  return `
    <div style="max-width:1280px;margin:0 auto;padding:0 16px;margin-bottom:40px">
      <div style="border-top:2px solid #f3f4f6;padding-top:32px">
        <h3 style="font-size:16px;font-weight:bold;margin-bottom:16px">Core Processing Tools</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">
          <ul style="list-style:none;padding:0;margin:0">
            ${linkHtml}
          </ul>
        </div>
      </div>
    </div>
  `
}

// Add back-links from ALL pages to hub pages (fixes orphan pages)
function buildBacklinksHtml(): string {
  return `
    <section style="margin:32px 0;padding:24px;background:#f3f4f6;border-radius:8px">
      <h3 style="font-size:13px;font-weight:600;color:#4b5563;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.5px">Find More Tools</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <a href="/alternatives" style="display:inline-block;padding:8px 14px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Tool Alternatives</a>
        <a href="/transcription-tools" style="display:inline-block;padding:8px 14px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Transcription Tools</a>
        <a href="/subtitle-tools" style="display:inline-block;padding:8px 14px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Subtitle Tools</a>
      </div>
    </section>
  `
}


function buildAllPagesIndexHtml(routes: RouteMeta[]): string {
  const sorted = [...routes].sort((a, b) => a.path.localeCompare(b.path))
  const items = sorted
    .map((route) => {
      const label = route.breadcrumbLabel || route.h1 || route.title.replace(/\s*[—–|].*$/, '').trim()
      return `<li><a href="${escapeHtml(route.path)}" style="display:block;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;color:#1f2937;background:#fff">${escapeHtml(label)} <span style="color:#6b7280">${escapeHtml(route.path)}</span></a></li>`
    })
    .join('')

  return `
    <section style="max-width:1280px;margin:32px auto;padding:0 16px">
      <h2 style="font-size:20px;font-weight:700;margin:0 0 16px 0">All VideoText Pages</h2>
      <p style="margin:0 0 16px 0;color:#4b5563">This crawlable HTML index links to every prerendered page for search engines and LLM agents.</p>
      <ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px;list-style:none;padding:0;margin:0">${items}</ul>
    </section>
  `
}

function buildGlobalDiscoverabilityLinksHtml(): string {
  return `
    <section style="margin:20px 0;padding:16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px">
      <h3 style="font-size:13px;font-weight:600;color:#3730a3;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.5px">Crawler Navigation</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <a href="/site-index" style="display:inline-block;padding:8px 12px;background:white;border:1px solid #c7d2fe;border-radius:5px;text-decoration:none;color:#3730a3;font-size:13px;font-weight:600">All Pages Index</a>
        <a href="/alternatives" style="display:inline-block;padding:8px 12px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Tool Alternatives</a>
        <a href="/transcription-tools" style="display:inline-block;padding:8px 12px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Transcription Tools</a>
        <a href="/subtitle-tools" style="display:inline-block;padding:8px 12px;background:white;border:1px solid #d1d5db;border-radius:5px;text-decoration:none;color:#2563eb;font-size:13px;font-weight:500">Subtitle Tools</a>
      </div>
    </section>
  `
}

function buildMoneyPageAuthorityLinksHtml(routePath: string): string {
  const links = MONEY_PAGES
    .filter((p) => p.path !== routePath)
    .map(
      (p) =>
        `<a href="${escapeHtml(p.path)}" style="display:inline-block;padding:8px 12px;background:#fff;border:1px solid #bbf7d0;border-radius:5px;text-decoration:none;color:#166534;font-size:13px;font-weight:600">${escapeHtml(p.label)}</a>`
    )
    .join('')

  return `
    <section style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px">
      <h3 style="font-size:13px;font-weight:700;color:#166534;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:0.5px">Primary Transcription & Caption Tools</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${links}</div>
    </section>
  `
}

function injectHead(template: string, meta: RouteMeta): string {
  // Replace title tag
  let html = template.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`
  )

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace canonical (match SPA primary map so static HTML agrees with Helmet)
  const primaryPath = getCanonicalPathForRoute(meta.path)
  const canonicalUrl = primaryPath === '/' ? SITE_URL + '/' : `${SITE_URL}${primaryPath}`
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  )

  // Replace og:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
  )

  // Replace og:description
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  )

  // Replace twitter:title
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
  )

  // Replace twitter:description
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace robots (noindex support)
  if (meta.noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/,
      '<meta name="robots" content="noindex,nofollow" />'
    )
  }

  return html
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('[prerender] dist/index.html not found — run the client build first.')
    process.exit(1)
  }

  const template = fs.readFileSync(templatePath, 'utf8')

  // Collect all routes: static + registry (parsed) + programmatic
  const registryEntries = parseRegistryEntries()
  const programmaticEntries = getProgrammaticSeoEntries()
  const allRoutes: RouteMeta[] = mergeRouteMetaWithSitemapCoverage([
    ...STATIC_META,
    ...registryEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
      keywords: e.keywords || generateKeywordsFromTitle(e.title, e.path),
      valueProposition: e.valueProposition,
      comparison: e.comparison,
      howToUse: e.howToUse,
      socialProof: e.socialProof,
    })),
    ...programmaticEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
      keywords: e.keywords || generateKeywordsFromTitle(e.title, e.path),
      valueProposition: e.valueProposition,
      comparison: e.comparison,
      howToUse: e.howToUse,
      socialProof: e.socialProof,
    })),
  ])

  let count = 0
  for (const meta of allRoutes) {
    const routePath = meta.path
    let html = injectHead(template, meta)
    html = injectStructuredData(html, routePath, meta)

    // Inject H1 tag for crawler discovery (hidden from view but visible in static HTML)
    if (meta.h1) {
      const h1Html = buildH1Html(meta.h1)
      html = html.replace('</body>', `${h1Html}\n</body>`)
    }

    // Inject high-conversion content (keywords, comparison, how-to, proof)
    if (meta.valueProposition || meta.keywords || meta.comparison || meta.howToUse || meta.socialProof) {
      const conversionContent = buildConversionContent(meta)
      html = html.replace('</body>', `${conversionContent}\n</body>`)
    }

    // Inject complete HTML index page with links to all prerendered routes.
    if (routePath === '/site-index') {
      const allPagesIndexHtml = buildAllPagesIndexHtml(allRoutes)
      html = html.replace('</body>', `${allPagesIndexHtml}\n</body>`)
    }

    // Inject hub page links directly into static HTML (for SEO crawlers without JS execution)
    if (HUB_PAGE_LINKS[routePath]) {
      const hubHtml = buildHubPageHtml(routePath, meta.title)
      html = html.replace('</body>', `${hubHtml}\n</body>`)

      // Also inject canonical tool links section (compress-video, burn-subtitles, translate-subtitles)
      const canonicalToolsHtml = buildCanonicalToolsSection(routePath)
      if (canonicalToolsHtml) {
        html = html.replace('</body>', `${canonicalToolsHtml}\n</body>`)
      }
    }

    // Inject crawlable discoverability links on ALL pages.
    const discoverabilityHtml = buildGlobalDiscoverabilityLinksHtml()
    html = html.replace('</body>', `${discoverabilityHtml}\n</body>`)

    // Inject authority links to money pages on all indexable pages.
    if (routePath !== '/') {
      const authorityLinksHtml = buildMoneyPageAuthorityLinksHtml(routePath)
      html = html.replace('</body>', `${authorityLinksHtml}\n</body>`)
    }

    // Keep legacy hub backlinks on non-hub pages to preserve existing architecture.
    if (routePath !== '/' && !HUB_PAGE_LINKS[routePath]) {
      const backlinksHtml = buildBacklinksHtml()
      html = html.replace('</body>', `${backlinksHtml}\n</body>`)
    }

    if (routePath === '/') {
      // Overwrite root index.html in place
      fs.writeFileSync(templatePath, html, 'utf8')
    } else {
      // Write to dist/{route}/index.html
      const dir = path.join(DIST_DIR, routePath.slice(1))
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
    }

    count++
  }

  console.log(`[prerender] Generated ${count} static HTML files in ${DIST_DIR}`)
}

main()
