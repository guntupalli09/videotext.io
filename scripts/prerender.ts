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
  faq?: Array<{ q: string; a: string }>
  breadcrumbLabel?: string
  noindex?: boolean
}

// ── Static route metadata ─────────────────────────────────────────────────────

const STATIC_META: RouteMeta[] = [
  {
    path: '/',
    title: `Video to Text & Subtitles — Free Online Tools | ${SITE_NAME}`,
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, generate SRT/VTT, translate subtitles, fix timing, burn captions, compress video. Sign up for free to try.',
  },
  {
    path: '/pricing',
    title: `Pricing — Free, Basic, Pro & Agency Plans | ${SITE_NAME}`,
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee.",
  },
  {
    path: '/privacy',
    title: `Privacy Policy — We Don't Store Your Data | ${SITE_NAME}`,
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours.",
  },
  {
    path: '/faq',
    title: `FAQ — Privacy, Billing, Tools | ${SITE_NAME}`,
    description:
      "Frequently asked questions about VideoText: privacy, data storage, billing, free tier, translation, and tools. Your files are processed and deleted immediately.",
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
  },
  {
    path: '/terms',
    title: `Terms of Service | ${SITE_NAME}`,
    description:
      "Terms of use for VideoText. We don't store your data. Billing via Stripe. Use the service in accordance with these terms.",
  },
  {
    path: '/blog',
    title: `Blog — Engineering, Privacy & Product | ${SITE_NAME}`,
    description:
      'The VideoText blog: how the processing pipeline works, why we delete your files, batch subtitles for creators, transcription guides, and product updates.',
  },
  {
    path: '/changelog',
    title: `Changelog — What's New | ${SITE_NAME}`,
    description:
      "VideoText changelog: new features, performance improvements, and bug fixes. Updated every release.",
  },
  {
    path: '/video-to-transcript',
    title: `Video to Transcript — Free AI Transcription & Translation | ${SITE_NAME}`,
    description:
      'Convert video to text with AI. View transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Upload video, get plain-text transcript. Summary, chapters, speakers. Free tier.',
  },
  {
    path: '/video-to-subtitles',
    title: `Video to Subtitles — SRT & VTT Generator | ${SITE_NAME}`,
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Upload video. Single or multi-language. Free tier available.',
  },
  {
    path: '/translate-subtitles',
    title: `Translate Subtitles — SRT/VTT to Any Language | ${SITE_NAME}`,
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload subtitles, pick target language, download. Free tier available.',
  },
  {
    path: '/fix-subtitles',
    title: `Fix Subtitles — Auto-Correct Timing & Format | ${SITE_NAME}`,
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting. Upload SRT or VTT, download corrected file. Free.',
  },
  {
    path: '/burn-subtitles',
    title: `Burn Subtitles into Video — Hardcode Captions | ${SITE_NAME}`,
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier available.',
  },
  {
    path: '/compress-video',
    title: `Compress Video — Reduce File Size Online | ${SITE_NAME}`,
    description:
      'Compress video online: light, medium, or heavy compression. Upload video. Reduce file size for sharing and uploads. Free tier available.',
  },
  {
    path: '/batch-process',
    title: `Batch Video to Subtitles — Multiple Videos at Once | ${SITE_NAME}`,
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans.',
  },
  // ── Comparison & alternative pages ──────────────────────────────────────────
  {
    path: '/compare',
    title: `VideoText vs Descript, Otter.ai & Trint — Full Comparison | ${SITE_NAME}`,
    description:
      'Compare VideoText against Descript, Otter.ai, and Trint on speed, accuracy, pricing, and privacy. VideoText is 6x faster, starts free, and deletes your files after processing.',
    breadcrumbLabel: 'Compare',
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

    entries.push({ path: routePath, title, description, breadcrumbLabel, faq })
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

function buildHead(meta: RouteMeta): string {
  const { path: routePath, title, description, faq, breadcrumbLabel, noindex } = meta
  const canonicalUrl = routePath === '/' ? SITE_URL + '/' : `${SITE_URL}${routePath}`

  const jsonLdBlocks: object[] = []

  // Breadcrumb (for non-home pages)
  if (routePath !== '/') {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: breadcrumbLabel ?? title, item: canonicalUrl },
      ],
    })
  }

  // FAQ schema
  if (faq && faq.length > 0) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
  }

  const jsonLdTags = jsonLdBlocks
    .map((obj) => `  <script type="application/ld+json">\n    ${JSON.stringify(obj)}\n  </script>`)
    .join('\n')

  return `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${noindex ? '<meta name="robots" content="noindex,nofollow" />' : '<meta name="robots" content="index,follow" />'}
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
${jsonLdTags}`.trim()
}

function injectHead(template: string, meta: RouteMeta): string {
  const injectedHead = buildHead(meta)

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

  // Replace canonical
  const canonicalUrl = meta.path === '/' ? SITE_URL + '/' : `${SITE_URL}${meta.path}`
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

  // Inject FAQ + Breadcrumb JSON-LD blocks before </head>
  const extraJsonLd: object[] = []

  if (meta.path !== '/') {
    const isBlogPost = meta.path.startsWith('/blog/') && meta.path !== '/blog'
    const isToolPage = meta.path.startsWith('/tools/') && meta.path !== '/tools'
    if (isBlogPost) {
      extraJsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: meta.breadcrumbLabel ?? meta.title, item: canonicalUrl },
        ],
      })
    } else if (isToolPage) {
      extraJsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Free Tools', item: `${SITE_URL}/tools` },
          { '@type': 'ListItem', position: 3, name: meta.breadcrumbLabel ?? meta.title, item: canonicalUrl },
        ],
      })
    } else {
      extraJsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: meta.breadcrumbLabel ?? meta.title, item: canonicalUrl },
        ],
      })
    }
  }

  if (meta.faq && meta.faq.length > 0) {
    extraJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: meta.faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
  }

  if (extraJsonLd.length > 0) {
    const jsonLdTags = extraJsonLd
      .map((obj) => `  <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
      .join('\n')
    html = html.replace('</head>', `${jsonLdTags}\n</head>`)
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
  const allRoutes: RouteMeta[] = [
    ...STATIC_META,
    ...registryEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
    ...programmaticEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
  ]

  let count = 0
  for (const meta of allRoutes) {
    const routePath = meta.path
    const html = injectHead(template, meta)

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
