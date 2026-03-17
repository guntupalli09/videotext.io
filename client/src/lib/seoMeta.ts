/**
 * Thin SEO meta adapter. Single source of truth for SEO pages is seoRegistry.
 * Static routes (home, pricing, core tools, legal) are defined here only.
 */
import { SITE_URL, SITE_NAME } from './seo'
import { getAllSeoEntries } from './seoRegistry'

/** Static (non-SEO-registry) routes: title + description. */
const STATIC_ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text & Subtitles — Free Online Tools | YouTube Transcript',
    description:
      'VideoText: AI-powered video to text and subtitle tools. Paste a YouTube URL or upload a file — get a transcript in seconds. Transcribe to text, view in 6 languages, generate SRT/VTT, translate subtitles. No download for YouTube. Sign up to try free.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans',
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee. We don't store your data.",
  },
  '/privacy': {
    title: 'Privacy Policy — We Don\'t Store Your Data | VideoText',
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours. Read our full policy.",
  },
  '/faq': {
    title: 'FAQ — Privacy, Billing, Tools | VideoText',
    description:
      "Frequently asked questions about VideoText: privacy and data (we don't store your files), billing, free tier, translation, and tools. Your files are processed and deleted.",
  },
  '/guide': {
    title: 'How to Use VideoText — Tool Guide & Features | VideoText',
    description:
      'Step-by-step guide to every VideoText tool: Video to Transcript, Video to Subtitles, Translate, Fix, Burn, Compress, Batch. What we expect, what you get, and plan limits. Authoritative and practical.',
  },
  '/terms': {
    title: 'Terms of Service | VideoText',
    description:
      "Terms of use for VideoText. We don't store your data; see our Privacy Policy for details. Billing via Stripe. Use the service in accordance with these terms.",
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free AI Transcription & Translation',
    description:
      'Convert video to text with AI. View transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian with one click. Upload video, get plain-text transcript. Summary, chapters, speakers. Download or copy. Sign up for free. Free tier.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — SRT & VTT Generator',
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Upload video. Ideal for YouTube and web. Single or multi-language. Sign up to try free.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles — SRT/VTT to Any Language',
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload subtitles, pick target language, download. Free tier available.',
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
      'Compress video online: light, medium, or heavy compression. Upload video. Reduce file size for sharing and uploads. Sign up to try free.',
  },
  '/batch-process': {
    title: 'Batch Video to Subtitles — Multiple Videos at Once',
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans. Multi-language optional.',
  },
  '/feedback': {
    title: 'Feedback — VideoText',
    description: 'View user feedback submitted from the Tex panel.',
  },
  '/blog': {
    title: 'Blog — Engineering, Privacy & Product | VideoText',
    description:
      'The VideoText blog: how the processing pipeline works, why we delete your files, batch subtitles for creators, and how we handle support.',
  },
  '/blog/how-to-transcribe-zoom-recording': {
    title: 'How to Transcribe a Zoom Recording: Step-by-Step Guide | VideoText',
    description:
      'Zoom saves recordings as MP4. Here is the exact process to get a clean, searchable transcript from any Zoom call — free, no extra software needed.',
  },
  '/blog/srt-vs-vtt-subtitle-formats': {
    title: 'SRT vs VTT: Which Subtitle Format Should You Use? | VideoText',
    description:
      'SRT and VTT are both plain-text subtitle formats. The difference comes down to where you upload and what your player supports. Quick guide.',
  },
  '/blog/how-to-add-subtitles-to-video-free': {
    title: 'How to Add Subtitles to Any Video for Free | VideoText',
    description:
      'Generate subtitles automatically, fix timing issues, then burn them into the video permanently — all free, no desktop software required.',
  },
  '/blog/best-free-transcription-tools-2026': {
    title: 'Best Free Transcription Tools in 2026: An Honest Comparison | VideoText',
    description:
      'We compared Otter.ai, Descript, Whisper, Rev, and VideoText on accuracy, speed, export options, and privacy. Including our own limitations.',
  },
  '/blog/how-we-handle-support': {
    title: 'How We Handle Support: Honest, Fast, No Ticket Queue | VideoText',
    description:
      'Every support email is read by the person who built the product. Here is what that means in practice.',
  },
  '/blog/why-we-delete-your-files': {
    title: 'Why We Delete Your Files — And Why That Makes Us Faster | VideoText',
    description:
      'Privacy-first design is not just an ethical choice — it is an architectural one that makes everything run leaner and faster.',
  },
  '/blog/processing-speed-breakdown': {
    title: 'How VideoText Processes Video: A Plain-English Pipeline Breakdown | VideoText',
    description:
      'What actually happens between "upload complete" and your subtitle file appearing — and why VideoText is faster than most alternatives.',
  },
  '/blog/batch-subtitles-for-creators': {
    title: 'Batch Subtitles: Caption 20 Videos at Once and Download a ZIP | VideoText',
    description:
      'The batch tool was built for creators and agencies who need to process a week of content in one session without babysitting each upload.',
  },
  '/blog/how-to-get-youtube-transcript': {
    title: 'How to Get a YouTube Video Transcript (Free, Any Video) | VideoText',
    description:
      'Three ways to get a transcript from any YouTube video — using VideoText, YouTube\'s own CC export, or the API. Which method is best for your use case.',
  },
  '/blog/how-to-transcribe-audio-to-text-free': {
    title: 'How to Transcribe Audio to Text for Free in 2026 | VideoText',
    description:
      'The fastest free methods to convert audio recordings to text: MP3, M4A, WAV. Step-by-step, including accuracy tips and format options.',
  },
  '/blog/how-to-translate-subtitles': {
    title: 'How to Translate Subtitles to Any Language (SRT & VTT) | VideoText',
    description:
      'Translate an SRT or VTT subtitle file to Spanish, Arabic, Hindi, French, or 50+ other languages. Keep the original timestamps intact.',
  },
  '/changelog': {
    title: 'Changelog — What\'s New | VideoText',
    description:
      'VideoText changelog: new features, performance improvements, and bug fixes. Updated every release. See what has shipped.',
  },
  '/compare': {
    title: 'VideoText vs Descript, Otter.ai & Trint — Full Comparison',
    description:
      'Compare VideoText against Descript, Otter.ai, and Trint on speed, accuracy, pricing, and privacy. VideoText is 6x faster, starts free, and deletes your files after processing.',
  },
  '/descript-alternative': {
    title: 'Best Free Descript Alternative for Transcription & Subtitles | VideoText',
    description:
      'Looking for a Descript alternative? VideoText transcribes video 6x faster, starts free ($0 vs $24/mo), and deletes your files. No heavy editor required. Try free.',
  },
  '/otter-ai-alternative': {
    title: 'Best Otter.ai Alternative for Video Files & Subtitles | VideoText',
    description:
      'Otter.ai doesn\'t support video uploads or SRT export. VideoText does — plus YouTube URL input, subtitle translation, and file deletion. Free tier available.',
  },
  '/trint-alternative': {
    title: 'Cheaper Trint Alternative That Starts Free | VideoText',
    description:
      'Trint starts at $80/month. VideoText starts free and scales to $10/month — same Whisper AI accuracy, plus subtitle burning, batch processing, and translation.',
  },
  '/rev-alternative': {
    title: 'Best Rev Alternative with Flat-Rate Pricing | VideoText',
    description:
      'Rev AI charges $0.25/minute. VideoText starts free and costs $10/month for 450 minutes. Same AI accuracy, plus subtitle export, translation, and YouTube support.',
  },
  '/happyscribe-alternative': {
    title: 'Best Free HappyScribe Alternative – Transcription & Subtitles | VideoText',
    description:
      'HappyScribe starts at $17/month with no free tier and no YouTube URL input. VideoText is free to start — upload any video or paste a YouTube link, get SRT, translate, and burn subtitles.',
  },
  '/sonix-alternative': {
    title: 'Best Free Sonix Alternative – No Per-Minute Fees | VideoText',
    description:
      'Sonix charges $22/month plus $0.10/minute overage. VideoText starts free and is $10/month flat — Whisper AI accuracy, YouTube URL support, subtitle burning, zero per-minute billing.',
  },
  '/easyscribe-alternative': {
    title: 'Best EasyScribe Alternative for Video & Subtitles | VideoText',
    description:
      'EasyScribe only does basic audio transcription. VideoText handles video files, YouTube URLs, SRT subtitle export, 50+ language translation, and subtitle burning. Free tier available.',
  },
  '/open': {
    title: 'Open Stats — Accuracy, Speed & Transparency | VideoText',
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
  },
  '/blog/best-transcription-software-2026': {
    title: 'Best Transcription Software in 2026: Ranked by Speed, Accuracy & Price | VideoText',
    description:
      'We tested 8 transcription tools — VideoText, Otter.ai, Descript, Trint, Rev, Whisper, and more. Here is which tool wins for each use case.',
  },
  '/blog/best-video-captioning-tools-2026': {
    title: 'Best Video Captioning Tools for Content Creators in 2026 | VideoText',
    description:
      'Auto-captions, burned-in subtitles, translated captions — a practical guide to the best tools for YouTube, Instagram, TikTok, and Reels.',
  },
  '/blog/how-to-transcribe-podcast-episode': {
    title: "How to Transcribe a Podcast Episode (Free, Any Format) | VideoText",
    description: "How to transcribe a podcast episode from MP3 or M4A in minutes. Free tool, 98.5% accuracy, speaker labels, and show notes export included.",
  },
  '/blog/how-to-add-captions-youtube-video': {
    title: "How to Add Captions to a YouTube Video (The Right Way) | VideoText",
    description: "How to add captions to a YouTube video the right way: upload an SRT file instead of relying on auto-captions. Better accuracy, better SEO.",
  },
  // Free tools — client-side, no server
  '/tools': {
    title: 'Free Video & Subtitle Tools — No Account Needed | VideoText',
    description: 'Free browser-based tools for video creators: SRT to VTT converter, subtitle validator, reading speed checker, script timer, bitrate calculator, and more. No upload, no account.',
  },
  '/tools/srt-to-vtt': {
    title: 'SRT to VTT Converter — Free Online | VideoText',
    description: 'Convert SRT subtitle files to WebVTT format instantly. Paste or upload your .srt file and download a ready-to-use .vtt file. Free, no account, runs in your browser.',
  },
  '/tools/vtt-to-srt': {
    title: 'VTT to SRT Converter — Free Online | VideoText',
    description: 'Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format. Free, browser-based, nothing uploaded to any server.',
  },
  '/tools/shift-subtitle-timing': {
    title: 'Shift Subtitle Timing — Delay or Advance Subtitles Free | VideoText',
    description: 'Fix out-of-sync subtitles by shifting all timestamps forward or backward by any number of seconds. Works with SRT and VTT. Free, browser-based.',
  },
  '/tools/merge-srt-files': {
    title: 'Merge SRT Files — Combine Two Subtitle Files Free | VideoText',
    description: 'Combine two SRT or VTT subtitle files into one sorted, renumbered file. Free, runs in browser, no account required.',
  },
  '/tools/srt-to-text': {
    title: 'SRT to Plain Text — Extract Text from Subtitles Free | VideoText',
    description: 'Strip timing codes and indices from SRT or VTT files and extract clean plain text. Perfect for repurposing subtitles as blog posts or transcripts. Free.',
  },
  '/tools/subtitle-validator': {
    title: 'Subtitle Validator — Check SRT & VTT Files Free | VideoText',
    description: 'Validate SRT and VTT files for overlapping timestamps, empty cues, long lines, and reading speed errors. Instant report, free, no upload needed.',
  },
  '/tools/subtitle-reading-speed': {
    title: 'Subtitle Reading Speed Checker — CPS Analyzer | VideoText',
    description: 'Check every subtitle cue for characters-per-second against Netflix (17 CPS), BBC (17 CPS), and EBU (21 CPS) broadcast standards. Free online tool.',
  },
  '/tools/subtitle-character-checker': {
    title: 'Subtitle Character Limit Checker — Netflix, YouTube & BBC | VideoText',
    description: 'Check if subtitle lines meet Netflix (42 chars), YouTube (80 chars), or BBC (37 chars) character limits. Instant pass/fail report per cue. Free.',
  },
  '/tools/subtitle-word-counter': {
    title: 'Subtitle Word Counter — Count Words in SRT & VTT Files | VideoText',
    description: 'Count words, characters, and get speaking rate stats (WPM, CPS) from any SRT or VTT subtitle file. Free, browser-based, instant results.',
  },
  '/tools/video-script-timer': {
    title: 'Video Script Timer — How Long Will My Video Be? | VideoText',
    description: 'Paste your video script and instantly see how long the video will be at different speaking rates. Free tool for YouTube, ads, shorts, and explainers.',
  },
  '/tools/words-per-minute-calculator': {
    title: 'Words Per Minute Calculator — Speaking Rate Checker | VideoText',
    description: 'Calculate your speaking rate in words per minute (WPM). Enter text and recording duration, or word count and time. Instant result, free.',
  },
  '/tools/video-bitrate-calculator': {
    title: 'Video Bitrate Calculator — File Size & Quality Estimator | VideoText',
    description: 'Calculate the ideal video bitrate for a target file size, or estimate how large your video will be at a given bitrate. Free online calculator.',
  },
  '/tools/aspect-ratio-calculator': {
    title: 'Video Aspect Ratio Calculator — 16:9, 9:16, 1:1 & More | VideoText',
    description: 'Calculate video aspect ratios, find missing dimensions for 16:9, 9:16, 4:3, and custom ratios. Free for YouTube, TikTok, Instagram, and more.',
  },
  '/tools/timestamp-converter': {
    title: 'Timestamp Converter — Seconds to HH:MM:SS, SRT, VTT & Timecode | VideoText',
    description: 'Convert timestamps between seconds, HH:MM:SS, SRT format, VTT format, and SMPTE timecode. Instant, free, no account needed.',
  },
  '/tools/video-metadata-viewer': {
    title: 'Video Metadata Viewer — Check Video Info Free | VideoText',
    description: 'View video file details — duration, resolution, aspect ratio, and file size — locally in your browser. Nothing is uploaded. Free tool.',
  },
}

/** Static breadcrumb items (non-SEO-registry routes). */
const STATIC_ROUTE_BREADCRUMB: Record<string, { name: string; path: string }[]> = {
  '/pricing': [{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }],
  '/faq': [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }],
  '/guide': [{ name: 'Home', path: '/' }, { name: 'Guide', path: '/guide' }],
  '/privacy': [{ name: 'Home', path: '/' }, { name: 'Privacy', path: '/privacy' }],
  '/terms': [{ name: 'Home', path: '/' }, { name: 'Terms', path: '/terms' }],
  '/compare': [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }],
  '/descript-alternative': [{ name: 'Home', path: '/' }, { name: 'Descript Alternative', path: '/descript-alternative' }],
  '/otter-ai-alternative': [{ name: 'Home', path: '/' }, { name: 'Otter.ai Alternative', path: '/otter-ai-alternative' }],
  '/trint-alternative': [{ name: 'Home', path: '/' }, { name: 'Trint Alternative', path: '/trint-alternative' }],
  '/rev-alternative': [{ name: 'Home', path: '/' }, { name: 'Rev Alternative', path: '/rev-alternative' }],
  '/happyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'HappyScribe Alternative', path: '/happyscribe-alternative' }],
  '/sonix-alternative': [{ name: 'Home', path: '/' }, { name: 'Sonix Alternative', path: '/sonix-alternative' }],
  '/easyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'EasyScribe Alternative', path: '/easyscribe-alternative' }],
  '/open': [{ name: 'Home', path: '/' }, { name: 'Open Stats', path: '/open' }],
  '/blog/best-transcription-software-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Transcription Software 2026', path: '/blog/best-transcription-software-2026' }],
  '/blog/best-video-captioning-tools-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Video Captioning Tools 2026', path: '/blog/best-video-captioning-tools-2026' }],
  '/blog': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }],
  '/tools': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }],
  '/tools/srt-to-vtt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to VTT', path: '/tools/srt-to-vtt' }],
  '/tools/vtt-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'VTT to SRT', path: '/tools/vtt-to-srt' }],
  '/tools/shift-subtitle-timing': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing' }],
  '/tools/merge-srt-files': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Merge SRT Files', path: '/tools/merge-srt-files' }],
  '/tools/srt-to-text': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to Text', path: '/tools/srt-to-text' }],
  '/tools/subtitle-validator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Subtitle Validator', path: '/tools/subtitle-validator' }],
  '/tools/subtitle-reading-speed': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed' }],
  '/tools/subtitle-character-checker': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Character Limit Checker', path: '/tools/subtitle-character-checker' }],
  '/tools/subtitle-word-counter': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter' }],
  '/tools/video-script-timer': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Script Timer', path: '/tools/video-script-timer' }],
  '/tools/words-per-minute-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Words Per Minute Calculator', path: '/tools/words-per-minute-calculator' }],
  '/tools/video-bitrate-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Bitrate Calculator', path: '/tools/video-bitrate-calculator' }],
  '/tools/aspect-ratio-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Aspect Ratio Calculator', path: '/tools/aspect-ratio-calculator' }],
  '/tools/timestamp-converter': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Timestamp Converter', path: '/tools/timestamp-converter' }],
  '/tools/video-metadata-viewer': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Metadata Viewer', path: '/tools/video-metadata-viewer' }],
  '/blog/how-to-transcribe-zoom-recording': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Zoom Recording', path: '/blog/how-to-transcribe-zoom-recording' }],
  '/blog/srt-vs-vtt-subtitle-formats': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'SRT vs VTT', path: '/blog/srt-vs-vtt-subtitle-formats' }],
  '/blog/how-to-add-subtitles-to-video-free': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Add Subtitles Free', path: '/blog/how-to-add-subtitles-to-video-free' }],
  '/blog/best-free-transcription-tools-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Free Transcription Tools', path: '/blog/best-free-transcription-tools-2026' }],
  '/blog/how-we-handle-support': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'How We Handle Support', path: '/blog/how-we-handle-support' }],
  '/blog/why-we-delete-your-files': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Why We Delete Your Files', path: '/blog/why-we-delete-your-files' }],
  '/blog/processing-speed-breakdown': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Processing Speed Breakdown', path: '/blog/processing-speed-breakdown' }],
  '/blog/batch-subtitles-for-creators': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Batch Subtitles for Creators', path: '/blog/batch-subtitles-for-creators' }],
  '/blog/how-to-get-youtube-transcript': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Get YouTube Transcript', path: '/blog/how-to-get-youtube-transcript' }],
  '/blog/how-to-transcribe-audio-to-text-free': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Audio to Text Free', path: '/blog/how-to-transcribe-audio-to-text-free' }],
  '/blog/how-to-translate-subtitles': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'How to Translate Subtitles', path: '/blog/how-to-translate-subtitles' }],
  '/changelog': [{ name: 'Home', path: '/' }, { name: 'Changelog', path: '/changelog' }],
  '/video-to-transcript': [{ name: 'Home', path: '/' }, { name: 'Video to Transcript', path: '/video-to-transcript' }],
  '/video-to-subtitles': [{ name: 'Home', path: '/' }, { name: 'Video to Subtitles', path: '/video-to-subtitles' }],
  '/translate-subtitles': [{ name: 'Home', path: '/' }, { name: 'Translate Subtitles', path: '/translate-subtitles' }],
  '/fix-subtitles': [{ name: 'Home', path: '/' }, { name: 'Fix Subtitles', path: '/fix-subtitles' }],
  '/burn-subtitles': [{ name: 'Home', path: '/' }, { name: 'Burn Subtitles', path: '/burn-subtitles' }],
  '/compress-video': [{ name: 'Home', path: '/' }, { name: 'Compress Video', path: '/compress-video' }],
  '/batch-process': [{ name: 'Home', path: '/' }, { name: 'Batch Process', path: '/batch-process' }],
}

/** Per-route SEO meta. SEO pages from registry; rest from static. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  ...STATIC_ROUTE_SEO,
  ...Object.fromEntries(
    getAllSeoEntries().map((e) => [e.path, { title: e.title, description: e.description }])
  ),
}

/** Breadcrumb items per path. SEO pages from registry; rest from static. */
export const ROUTE_BREADCRUMB: Record<string, { name: string; path: string }[]> = {
  ...STATIC_ROUTE_BREADCRUMB,
  ...Object.fromEntries(
    getAllSeoEntries().map((e) => [
      e.path,
      [{ name: 'Home', path: '/' }, { name: e.breadcrumbLabel, path: e.path }],
    ])
  ),
}

/** FAQ items for /faq page (global FAQ; not from registry). Used for page content and FAQPage JSON-LD. */
const FAQ_SCHEMA_ITEMS = [
  { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them. We don't keep your uploads, transcripts, or generated outputs." },
  { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training models." },
  { q: 'Do I need to sign up?', a: "Yes. Sign up for free to try the tools. No credit card required. Upgrade when you need more imports or paid features." },
  { q: 'Can I transcribe a YouTube video without downloading it?', a: "Yes. Paste any public YouTube URL (youtube.com or youtu.be) into the Video to Transcript tool and we stream the audio and transcribe it directly. No download, no file upload. Works with public videos, Shorts, and age-restricted content with optional cookies. Same features as file upload: speakers, summary, chapters, translate to 6 languages." },
  { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM (and optionally MKV). Subtitles: SRT and VTT. You can also paste a YouTube URL — no download needed." },
  { q: 'How does the free tier work?', a: "Sign up for free to get 3 imports per month (resets on the 1st), single language, and a watermark on subtitle exports. No credit card required." },
  { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use Translate Subtitles for SRT/VTT. For transcripts, use the Translate button after generating to view in 6 languages." },
]

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe, view transcript in 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian), generate SRT/VTT, translate subtitles, fix, burn, compress video. Upload your file. Free tier.',
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
      'Free online tools: video to transcript (with translation to Hindi, Telugu, Spanish, Chinese, Russian), video to subtitles (SRT/VTT), translate subtitles, fix, burn, compress video. AI-powered. Sign up for free to try.',
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}

/** FAQPage JSON-LD for /faq. */
export function getFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_SCHEMA_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** FAQPage JSON-LD from arbitrary FAQ items (e.g. SEO tool pages from registry). */
export function getFaqJsonLdFromItems(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** BreadcrumbList JSON-LD for a given path and items. */
export function getBreadcrumbJsonLd(_pathname: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === '/' ? '' : item.path}`,
    })),
  }
}
