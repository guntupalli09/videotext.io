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
}

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
    path: '/changelog',
    title: `Changelog — What's New | ${SITE_NAME}`,
    description:
      "VideoText changelog: new features, performance improvements, and bug fixes. Updated every release.",
    h1: 'Changelog',
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
  },
  {
    path: '/fix-subtitles',
    title: `Fix Subtitles — Auto-Correct Timing & Format | ${SITE_NAME}`,
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting. Upload SRT or VTT, download corrected file. Free.',
    h1: 'Fix Subtitles',
  },
  {
    path: '/burn-subtitles',
    title: `Burn Subtitles into Video — Hardcode Captions | ${SITE_NAME}`,
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier available.',
    h1: 'Burn Subtitles into Video',
  },
  {
    path: '/compress-video',
    title: `Compress Video — Reduce File Size Online | ${SITE_NAME}`,
    description:
      'Compress video online: light, medium, or heavy compression. Upload video. Reduce file size for sharing and uploads. Free tier available.',
    h1: 'Compress Video',
  },
  {
    path: '/batch-process',
    title: `Batch Video to Subtitles — Multiple Videos at Once | ${SITE_NAME}`,
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans.',
    h1: 'Batch Video to Subtitles',
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
  },
  {
    path: '/open',
    title: `Open Stats — Accuracy, Speed & Transparency | ${SITE_NAME}`,
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
    breadcrumbLabel: 'Open Stats',
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

    // Check indexable
    if (/indexable:\s*false/.test(block)) continue

    entries.push({ path: routePath, title, description, h1, breadcrumbLabel, faq })
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

  // BreadcrumbList + FAQPage JSON-LD come only from the SPA (AppSeo + react-helmet-async).
  // Injecting them here duplicated structured data on prerendered HTML + hydrated head.

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
  const allRoutes: RouteMeta[] = [
    ...STATIC_META,
    ...registryEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
    ...programmaticEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
  ]

  let count = 0
  for (const meta of allRoutes) {
    const routePath = meta.path
    let html = injectHead(template, meta)

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

    // Inject hub page links directly into static HTML (for SEO crawlers without JS execution)
    if (HUB_PAGE_LINKS[routePath]) {
      const hubHtml = buildHubPageHtml(routePath, meta.title)
      html = html.replace('</body>', `${hubHtml}\n</body>`)
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
