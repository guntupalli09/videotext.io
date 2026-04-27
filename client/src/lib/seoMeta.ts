/**
 * Thin SEO meta adapter. Single source of truth for SEO pages is seoRegistry.
 * Static routes (home, pricing, core tools, legal) are defined here only.
 */
import { SITE_URL, SITE_NAME } from './seo'
import { ENTITY_DESCRIPTION, PRODUCT_CATEGORY, PRIMARY_DEFINITION } from './productDna'
import { getAllSeoEntries } from './seoRegistry'
import { resolveInternalLinkPath } from './primaryUrls'

/** Static (non-SEO-registry) routes: title + description. */
const STATIC_ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text Transcription Software | Fast AI Transcript & Subtitles',
    description:
      'VideoText is AI transcription software for turning video to text, transcript, subtitles, summary, and chapters in one workflow. Start free and export TXT, DOCX, PDF, SRT, and VTT.',
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
  '/voice-recorder': {
    title: 'Voice to Text — Free Voice Recorder & Instant Transcription | VideoText',
    description:
      'Record your voice and get an accurate transcript in seconds. Free online voice-to-text with AI noise suppression, 99 language support, and instant .txt export. No account needed.',
  },
  '/video-to-transcript': {
    title: 'Video to Text Converter: Fast AI Video to Transcript Software | VideoText',
    description:
      'Convert video to text and downloadable transcripts in minutes. Built for fast file-based transcription with TXT, PDF, DOCX, SRT, and VTT outputs. Files are processed then deleted.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — SRT & VTT Generator',
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Upload video. Ideal for YouTube and web. Single or multi-language. Sign up to try free.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles — SRT/VTT to Any Language',
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 70+ languages with AI. Upload subtitles, pick target language, download. Free tier available.',
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
  '/blog': {
    title: 'Blog — Engineering, Privacy & Product | VideoText',
    description:
      'The VideoText blog: how the processing pipeline works, why we delete your files, batch subtitles for creators, and how we handle support.',
  },
  '/samples': {
    title: 'Transcript & Subtitle Output Samples | VideoText',
    description:
      'See real transcript samples, subtitle previews, and workflow outputs (summary, chapters, exports) so you know exactly what VideoText generates.',
  },
  '/preview/icp-results-studio': {
    title: 'ICP Results Studio Preview | VideoText',
    description:
      'Preview a clean post-transcript results UX for context-aware outputs, multi-asset generation, collaboration comments, and drop-anything ingestion.',
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
  '/blog/best-way-to-get-youtube-transcript': {
    title: 'Best Way to Get a YouTube Transcript | VideoText',
    description:
      'A practical workflow to turn any YouTube video into a clean transcript quickly, with structured outputs for SEO and content repurposing.',
  },
  '/blog/youtube-captions-vs-ai-transcription': {
    title: 'YouTube Captions vs AI Transcription | VideoText',
    description:
      'Compare YouTube native captions and AI transcription workflows for speed, structure, and content repurposing outcomes.',
  },
  '/blog/how-to-download-youtube-subtitles': {
    title: 'How to Download YouTube Subtitles and Reuse Them | VideoText',
    description:
      'Step-by-step guide to generating subtitle files that are usable across editing, publishing, and localization workflows.',
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
      'EasyScribe only does basic audio transcription. VideoText handles video files, YouTube URLs, SRT subtitle export, 70+ language translation, and subtitle burning. Free tier available.',
  },
  '/notta-alternative': {
    title: 'Best Free Notta Alternative for Video Files & Subtitles | VideoText',
    description:
      "Notta's free plan caps files at 3 minutes. VideoText has no per-file limit — transcribe full-length videos, export SRT/VTT, translate to 70+ languages, and burn subtitles. Free tier available.",
  },
  '/about': {
    title: 'About VideoText — AI Transcription Built for Speed & Privacy',
    description:
      'VideoText transcribes video to text in under 5 minutes with 98.5%+ word accuracy. Powered by OpenAI Whisper. Privacy-first: files deleted after processing. 127,000+ videos transcribed. Free tier available.',
  },
  '/status': {
    title: 'VideoText Status – System Status & Uptime',
    description:
      'Check real-time status, uptime, and incident history for VideoText services including Transcription API, Subtitle Generation, AI Summaries, and more.',
  },
  '/open': {
    title: 'Open Stats — Accuracy, Speed & Transparency | VideoText',
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
  },

  '/transcription-benchmark': {
    title: 'Fastest Transcription Software? Benchmark Data & Methodology',
    description:
      'Benchmark reference for broad transcription software evaluation: median and P90 processing speed, output depth checks, and reproducible methodology by file length.',
  },
  '/accuracy-test': {
    title: 'Transcription Accuracy Test — Condition-Based Results | VideoText',
    description:
      'Condition-level transcription accuracy reference with measured word accuracy ranges and structured tool comparison for practical selection.',
  },

  '/best-transcription-tool': {
    title: 'Best Transcription Tool for Video to Text Workflows (2026)',
    description:
      'Compare transcription tools for broad commercial intent: speed, transcript quality, exports, workflow friction, and trade-offs by use case.',
  },
  '/fastest-transcription-software': {
    title: 'Fastest Transcription Software — Benchmark Comparison | VideoText',
    description:
      'Speed-first comparison of AI transcription tools with P50/P90 throughput context, condition notes, and workflow fit guidance.',
  },
  '/fastest-transcription-tool': {
    title: 'Fastest Transcription Tool — Long-Form Benchmark Winner',
    description:
      'Fastest way to transcribe long videos with tested benchmark conditions, comparison table, and objective workflow guidance.',
  },
  '/otter-vs-videotext': {
    title: 'Otter vs VideoText — Side-by-Side Comparison',
    description:
      'Direct comparison of Otter and VideoText across speed, output formats, transcript quality, pricing, and best workflow fit.',
  },
  '/descript-vs-videotext': {
    title: 'Descript vs VideoText — Transcription Workflow Comparison',
    description:
      'Compare Descript and VideoText for editing-first vs transcription-first workflows with clear best-for guidance.',
  },
  '/ai-transcription-tools': {
    title: 'AI Transcription Tools — Neutral Comparison Hub',
    description:
      'Neutral AI transcription comparison hub covering speed, condition-based accuracy, output quality, and best-fit workflow by tool.',
  },

  '/videotext-vs-turboscribe': {
    title: 'VideoText vs TurboScribe — Workflow Comparison',
    description: 'Compare VideoText and TurboScribe for speed, output depth, and long-form content repurposing workflows.',
  },
  '/turboscribe-alternative': {
    title: 'Best TurboScribe Alternative for Subtitles, Summaries & Chapters',
    description: 'Switch from transcript-only workflows. VideoText generates transcript, SRT/VTT subtitles, speaker labels, summary, and chapters in one upload.',
  },
  '/videotext-vs-rev': {
    title: 'VideoText vs Rev — AI Workflow vs Service Comparison',
    description: 'Compare VideoText and Rev across speed, workflow depth, output structure, and use-case fit.',
  },
  '/best-otter-alternatives': {
    title: 'Best Otter Alternatives — Fast Transcription Tools',
    description: 'Compare leading Otter alternatives with speed, output quality, and best-use-case guidance.',
  },
  '/best-descript-alternatives': {
    title: 'Best Descript Alternatives — Transcription-First Options',
    description: 'Compare Descript alternatives for teams prioritizing transcription speed and structured outputs.',
  },
  '/ai-transcription-workflow': {
    title: 'AI Transcription Workflow — Video to Publish-Ready Content',
    description: 'Build an AI video-to-content workflow: transcript, subtitles, summary, and chapters in minutes.',
  },
  '/podcast-transcription-tool': {
    title: 'Podcast Transcription Tool — Long Episode Workflow',
    description: 'Convert long podcast episodes into transcript, subtitles, summaries, and chapters with one workflow.',
  },
  '/interview-transcription-tool': {
    title: 'Interview Transcription Tool — Fast Structured Outputs',
    description: 'Transcribe interview recordings into publish-ready transcript and subtitle outputs quickly.',
  },
  '/youtube-video-to-transcript': {
    title: 'YouTube Video to Transcript — Repurpose Long Videos',
    description: 'Turn long YouTube videos into transcript, subtitles, summary, and chapters in minutes.',
  },
  '/blog/best-transcription-software-2026': {
    title: 'Best Transcription Software in 2026: Workflow-Based Comparison',
    description:
      'Commercial buyer guide to the best transcription software in 2026. Compare speed-to-output, export depth, privacy model, and real workflow trade-offs.',
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
  '/tools/sbv-to-srt': {
    title: 'SBV to SRT Converter — Convert YouTube Captions Free | VideoText',
    description: 'Convert YouTube SBV caption files to standard SRT format instantly. Free, browser-based, nothing uploaded to any server. Works with all YouTube .sbv downloads.',
  },
  '/tools/srt-to-sbv': {
    title: 'SRT to SBV Converter — Convert Subtitles to YouTube Format Free | VideoText',
    description: 'Convert SRT subtitle files to YouTube\'s native SBV format. Free, browser-based, instant download. No account required.',
  },
  '/tools/ass-to-srt': {
    title: 'ASS / SSA to SRT Converter — Strip Styling, Keep Dialogue Free | VideoText',
    description: 'Convert ASS or SSA subtitle files to plain SRT. Strips all styling tags and positioning codes, preserves dialogue text and timing. Free, runs in your browser.',
  },
  '/tools/ttml-to-srt': {
    title: 'TTML to SRT Converter — Convert DFXP & EBU-TT Subtitles Free | VideoText',
    description: 'Convert TTML, DFXP, or EBU-TT subtitle files to SRT format. Used for Netflix, broadcast, and enterprise video workflows. Free, browser-based.',
  },
  '/subtitle-tools': {
    title: 'Free Subtitle Tools for Creators — SRT, VTT, Timing & Validation | VideoText',
    description: 'Convert SRT to VTT, shift subtitle timing, validate files, check reading speed, and more. All tools are free, browser-based, and require no account.',
  },
  '/subtitle-resources': {
    title: 'Subtitle Resources & Standards — Formats, Netflix Rules, CPS Limits | VideoText',
    description: 'Subtitle format specs, Netflix delivery requirements, platform character limits, reading speed standards, and timing rules — all in one reference guide.',
  },
  '/blog/video-transcription-accuracy-whisper': {
    title: "Whisper AI Transcription Accuracy: What to Expect in 2026 | VideoText",
    description: "Real benchmark data on Whisper AI transcription accuracy by language, audio quality, and speaker count. Know what to expect before you process your video.",
  },
  '/blog/how-to-translate-video-subtitles': {
    title: "How to Translate Video Subtitles to Any Language | VideoText",
    description: "Learn how to translate video subtitles in two ways: upload an SRT file or transcribe and translate from scratch. Covers YouTube, TikTok, eLearning, and more.",
  },
  '/blog/srt-file-format-explained': {
    title: "SRT File Format Explained: Everything You Need to Know | VideoText",
    description: "Learn how the SRT file format works: timestamp syntax, character limits, common errors, and when to use SRT vs VTT vs ASS. With a real example.",
  },
}

/** Static breadcrumb items (non-SEO-registry routes). */
const STATIC_ROUTE_BREADCRUMB: Record<string, { name: string; path: string }[]> = {
  '/voice-recorder': [{ name: 'Home', path: '/' }, { name: 'Voice Recorder', path: '/voice-recorder' }],
  '/pricing': [{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }],
  '/faq': [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }],
  '/guide': [{ name: 'Home', path: '/' }, { name: 'Guide', path: '/guide' }],
  '/privacy': [{ name: 'Home', path: '/' }, { name: 'Privacy', path: '/privacy' }],
  '/terms': [{ name: 'Home', path: '/' }, { name: 'Terms', path: '/terms' }],
  '/about': [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }],
  '/samples': [{ name: 'Home', path: '/' }, { name: 'Samples', path: '/samples' }],
  '/preview/icp-results-studio': [{ name: 'Home', path: '/' }, { name: 'ICP Results Studio', path: '/preview/icp-results-studio' }],
  '/compare': [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }],
  '/descript-alternative': [{ name: 'Home', path: '/' }, { name: 'Descript Alternative', path: '/descript-alternative' }],
  '/otter-ai-alternative': [{ name: 'Home', path: '/' }, { name: 'Otter.ai Alternative', path: '/otter-ai-alternative' }],
  '/trint-alternative': [{ name: 'Home', path: '/' }, { name: 'Trint Alternative', path: '/trint-alternative' }],
  '/rev-alternative': [{ name: 'Home', path: '/' }, { name: 'Rev Alternative', path: '/rev-alternative' }],
  '/happyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'HappyScribe Alternative', path: '/happyscribe-alternative' }],
  '/sonix-alternative': [{ name: 'Home', path: '/' }, { name: 'Sonix Alternative', path: '/sonix-alternative' }],
  '/easyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'EasyScribe Alternative', path: '/easyscribe-alternative' }],
  '/notta-alternative': [{ name: 'Home', path: '/' }, { name: 'Notta Alternative', path: '/notta-alternative' }],
  '/status': [{ name: 'Home', path: '/' }, { name: 'Status', path: '/status' }],
  '/open': [{ name: 'Home', path: '/' }, { name: 'Open Stats', path: '/open' }],
  '/transcription-benchmark': [{ name: 'Home', path: '/' }, { name: 'Transcription Benchmark', path: '/transcription-benchmark' }],
  '/accuracy-test': [{ name: 'Home', path: '/' }, { name: 'Accuracy Test', path: '/accuracy-test' }],
  '/best-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Best Transcription Tool', path: '/best-transcription-tool' }],
  '/fastest-transcription-software': [{ name: 'Home', path: '/' }, { name: 'Fastest Transcription Software', path: '/fastest-transcription-software' }],
  '/fastest-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Fastest Transcription Tool', path: '/fastest-transcription-tool' }],
  '/otter-vs-videotext': [{ name: 'Home', path: '/' }, { name: 'Otter vs VideoText', path: '/otter-vs-videotext' }],
  '/descript-vs-videotext': [{ name: 'Home', path: '/' }, { name: 'Descript vs VideoText', path: '/descript-vs-videotext' }],
  '/ai-transcription-tools': [{ name: 'Home', path: '/' }, { name: 'AI Transcription Tools', path: '/ai-transcription-tools' }],

  '/videotext-vs-turboscribe': [{ name: 'Home', path: '/' }, { name: 'VideoText vs TurboScribe', path: '/videotext-vs-turboscribe' }],
  '/videotext-vs-rev': [{ name: 'Home', path: '/' }, { name: 'VideoText vs Rev', path: '/videotext-vs-rev' }],
  '/best-otter-alternatives': [{ name: 'Home', path: '/' }, { name: 'Best Otter Alternatives', path: '/best-otter-alternatives' }],
  '/best-descript-alternatives': [{ name: 'Home', path: '/' }, { name: 'Best Descript Alternatives', path: '/best-descript-alternatives' }],
  '/ai-transcription-workflow': [{ name: 'Home', path: '/' }, { name: 'AI Transcription Workflow', path: '/ai-transcription-workflow' }],
  '/podcast-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Podcast Transcription Tool', path: '/podcast-transcription-tool' }],
  '/interview-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Interview Transcription Tool', path: '/interview-transcription-tool' }],
  '/youtube-video-to-transcript': [{ name: 'Home', path: '/' }, { name: 'YouTube Video to Transcript', path: '/youtube-video-to-transcript' }],
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
  '/tools/sbv-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SBV to SRT', path: '/tools/sbv-to-srt' }],
  '/tools/srt-to-sbv': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to SBV', path: '/tools/srt-to-sbv' }],
  '/tools/ass-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'ASS to SRT', path: '/tools/ass-to-srt' }],
  '/tools/ttml-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'TTML to SRT', path: '/tools/ttml-to-srt' }],
  '/blog/how-to-transcribe-podcast-episode': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Podcast Episode', path: '/blog/how-to-transcribe-podcast-episode' }],
  '/blog/how-to-add-captions-youtube-video': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Add Captions to YouTube Video', path: '/blog/how-to-add-captions-youtube-video' }],
  '/subtitle-tools': [{ name: 'Home', path: '/' }, { name: 'Subtitle Tools', path: '/subtitle-tools' }],
  '/subtitle-resources': [{ name: 'Home', path: '/' }, { name: 'Subtitle Resources', path: '/subtitle-resources' }],
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

/** FAQ items for /faq page (global FAQ; not from registry). Used for page content and FAQPage JSON-LD.
 * Keep answers in sync with FAQ_ITEMS in client/src/pages/Faq.tsx. */
const FAQ_SCHEMA_ITEMS = [
  { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them immediately after the job completes. We don't keep your uploads, transcripts, or generated outputs. Your content stays yours." },
  { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models or any other secondary purpose." },
  { q: 'Do I need to sign up?', a: "Sign up for a free account to try. No credit card required. You get 3 free imports per month. Upgrade when you need more imports, languages, or batch processing." },
  { q: 'Can I transcribe a YouTube video without downloading it?', a: "YouTube URL support is coming soon. Currently, download the video first (MP4) and upload it to the Video to Transcript tool." },
  { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM (MKV where noted). Subtitles: SRT and VTT. YouTube URL support is coming soon." },
  { q: 'How accurate is VideoText transcription?', a: "VideoText uses OpenAI Whisper large-v3. On clear speech with minimal background noise, accuracy is approximately 98.5% word accuracy. Setting the spoken language manually improves results for non-English content." },
  { q: 'How does the free tier work?', a: "Sign up for free (no credit card) to get 3 imports per month, resetting on the 1st. Single language, watermark on subtitle exports. Upgrade any time for more imports, AI features, and batch processing." },
  { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use the Translate Subtitles tool for SRT/VTT files. For transcripts, use the \"Also translate to\" option before starting to get a full translation in 70+ languages." },
  { q: 'What is the maximum video duration?', a: "Free: 30 minutes per video. Basic: 45 minutes. Pro: 2 hours. Agency: 4 hours. To transcribe a longer video, trim or split it into segments before uploading." },
]

/** Published dates for blog posts — used for BlogPosting JSON-LD and og:article meta. */
export const BLOG_POST_DATES: Record<string, { datePublished: string; dateModified: string }> = {
  '/blog/how-to-transcribe-zoom-recording':    { datePublished: '2026-03-07', dateModified: '2026-03-07' },
  '/blog/srt-vs-vtt-subtitle-formats':         { datePublished: '2026-03-05', dateModified: '2026-03-05' },
  '/blog/how-to-add-subtitles-to-video-free':  { datePublished: '2026-03-03', dateModified: '2026-03-03' },
  '/blog/best-free-transcription-tools-2026':  { datePublished: '2026-03-01', dateModified: '2026-03-01' },
  '/blog/how-we-handle-support':               { datePublished: '2026-03-01', dateModified: '2026-03-01' },
  '/blog/why-we-delete-your-files':            { datePublished: '2026-02-26', dateModified: '2026-02-26' },
  '/blog/processing-speed-breakdown':          { datePublished: '2026-02-25', dateModified: '2026-02-25' },
  '/blog/best-transcription-software-2026':   { datePublished: '2026-03-14', dateModified: '2026-04-16' },
  '/blog/best-video-captioning-tools-2026':   { datePublished: '2026-03-13', dateModified: '2026-03-13' },
  '/blog/how-to-get-youtube-transcript':       { datePublished: '2026-03-14', dateModified: '2026-03-14' },
  '/blog/how-to-transcribe-audio-to-text-free':{ datePublished: '2026-03-12', dateModified: '2026-03-12' },
  '/blog/how-to-translate-subtitles':          { datePublished: '2026-03-10', dateModified: '2026-03-10' },
  '/blog/batch-subtitles-for-creators':        { datePublished: '2026-02-20', dateModified: '2026-02-20' },
  '/blog/how-to-transcribe-podcast-episode':   { datePublished: '2026-03-17', dateModified: '2026-03-17' },
  '/blog/how-to-add-captions-youtube-video':   { datePublished: '2026-03-17', dateModified: '2026-03-17' },
}

/** BlogPosting JSON-LD for individual blog post pages. Returns null if no date metadata found. */
export function getBlogPostingJsonLd(pathname: string, title: string, description: string): object | null {
  const dates = BLOG_POST_DATES[pathname]
  if (!dates) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url: `${SITE_URL}${pathname}`,
    datePublished: dates.datePublished,
    dateModified: dates.dateModified,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${pathname}` },
  }
}

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: ENTITY_DESCRIPTION,
    sameAs: [
      'https://twitter.com/videotextio',
      'https://www.linkedin.com/company/videotext-io',
      'https://www.producthunt.com/products/videotext',
    ],
  }
}

export function getWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: PRIMARY_DEFINITION,
    applicationCategory: PRODUCT_CATEGORY,
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


const AEO_ROUTE_SCHEMAS: Record<string, object[]> = {
  '/video-to-transcript': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does it take to transcribe a video?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A 2-hour video typically processes in under 5 minutes with VideoText. Most videos under 30 minutes complete in under 2 minutes. Processing time depends on file length and current server load.',
          },
        },
        {
          '@type': 'Question',
          name: 'How accurate is AI video transcription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText achieves approximately 98.5% word accuracy on clean English audio using OpenAI Whisper. Accuracy varies with audio quality, background noise, speaker count, and language. Technical or domain-specific vocabulary can be improved with the glossary feature.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does VideoText store my video files?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. VideoText processes your file and deletes it immediately after transcription. We do not retain uploads, transcripts, or any output files. Your content is never stored on our servers.',
          },
        },
        {
          '@type': 'Question',
          name: 'What do I get beyond the transcript text?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every transcription produces a full timestamped transcript, an AI-generated summary with bullet points, auto-generated chapter markers, and SRT/VTT subtitle files — all from a single upload, at no extra cost.',
          },
        },
        {
          '@type': 'Question',
          name: 'What video formats does VideoText support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText accepts MP4, MOV, MKV, WebM, AVI, and most common video formats. You can also paste a public YouTube URL to transcribe directly without downloading the file first.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I transcribe multiple videos at once?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Pro and Agency plans include batch upload — drag in multiple files and receive one ZIP containing all transcripts and subtitle files when processing finishes.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does VideoText compare to Otter, VEED, Descript, or Rev?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText is significantly faster (under 5 minutes for a 2-hour video vs. 15–45 min on most tools), outputs more structure per job (transcript + summary + chapters + subtitles in one pass), stores no data, and supports 90+ languages. Competitors like Otter and Descript are optimised for meeting notes or video editing — not fast file-first batch transcription.',
          },
        },
      ],
    },
  ],
  '/transcription-benchmark': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'VideoText Transcription Benchmark',
      description: 'Benchmark dataset and speed metrics for AI transcription throughput.',
      author: { '@type': 'Organization', name: SITE_NAME },
      url: `${SITE_URL}/transcription-benchmark`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the fastest way to transcribe a video?',
          acceptedAnswer: { '@type': 'Answer', text: 'Use an AI pipeline with measured throughput. VideoText median throughput is about 1.5 minutes per source hour in internal March 2026 benchmarks.' },
        },
      ],
    },
  ],
  '/accuracy-test': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'AI transcription tools' },
      reviewBody: 'Condition-based benchmark comparing transcription accuracy and output quality tradeoffs.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],

  '/best-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the best transcription tool right now?',
          acceptedAnswer: { '@type': 'Answer', text: 'For speed plus export coverage, VideoText is a strong default for most file-first transcription workflows.' },
        },
      ],
    },
  ],
  '/fastest-transcription-software': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the fastest way to transcribe a 2-hour video?',
          acceptedAnswer: { '@type': 'Answer', text: 'Use an AI tool with benchmarked throughput. VideoText median in internal testing is around 10 minutes for 2-hour files.' },
        },
      ],
    },
  ],
  '/fastest-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the fastest transcription tool for long videos?',
          acceptedAnswer: { '@type': 'Answer', text: 'VideoText is one of the fastest tools for long-form recorded content workflows with publish-ready outputs.' },
        },
      ],
    },
  ],
  '/otter-vs-videotext': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'Otter.ai and VideoText' },
      reviewBody: 'Side-by-side workflow comparison between meeting-first and file-first transcription tools.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/descript-vs-videotext': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'Descript and VideoText' },
      reviewBody: 'Comparison of editor-first and transcription-first tool stacks.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/ai-transcription-tools': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Transcription Tools Comparison Hub',
      description: 'Neutral comparison reference for AI transcription tool selection.',
      author: { '@type': 'Organization', name: SITE_NAME },
      url: `${SITE_URL}/ai-transcription-tools`,
    },
  ],

  '/videotext-vs-turboscribe': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'VideoText and TurboScribe' },
      reviewBody: 'Comparison of speed and workflow depth for long-form transcription workloads.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/videotext-vs-rev': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'VideoText and Rev' },
      reviewBody: 'Comparison between AI workflow throughput and service-based transcription models.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/best-otter-alternatives': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are the best alternatives to Otter AI?',
          acceptedAnswer: { '@type': 'Answer', text: 'Top alternatives include VideoText, Descript, and Rev, depending on workflow requirements.' },
        },
      ],
    },
  ],
  '/best-descript-alternatives': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are the best alternatives to Descript for transcription?',
          acceptedAnswer: { '@type': 'Answer', text: 'VideoText is a leading option for transcription-first workflows that need speed and structured outputs.' },
        },
      ],
    },
  ],
  '/ai-transcription-workflow': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'AI transcription workflow for long videos',
      step: [
        { '@type': 'HowToStep', name: 'Upload long video or audio recording' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitles' },
        { '@type': 'HowToStep', name: 'Extract summary and chapters for publishing' },
      ],
    },
  ],
  '/podcast-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to transcribe a long podcast episode',
      step: [
        { '@type': 'HowToStep', name: 'Upload episode recording' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitles' },
        { '@type': 'HowToStep', name: 'Publish summary and chapterized notes' },
      ],
    },
  ],
  '/interview-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to transcribe interview recordings',
      step: [
        { '@type': 'HowToStep', name: 'Upload interview recording' },
        { '@type': 'HowToStep', name: 'Generate transcript with timestamps' },
        { '@type': 'HowToStep', name: 'Export subtitle and summary outputs' },
      ],
    },
  ],
  '/youtube-video-to-transcript': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to convert YouTube videos into publish-ready content',
      step: [
        { '@type': 'HowToStep', name: 'Import YouTube recording for transcription' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitle files' },
        { '@type': 'HowToStep', name: 'Repurpose with summary and chapters' },
      ],
    },
  ],
  '/youtube-transcript-generator': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I get a transcript from a YouTube video?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Paste the video URL into our tool (youtube.com or youtu.be links work). Click Transcribe. Get full transcript + subtitles + summary in 2-3 minutes. No login required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is the YouTube transcript generator free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Free tier gives you 2 hours/month (enough for 4 typical YouTube videos). No credit card required. Pro plan is $9.99/month for unlimited transcription.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I download YouTube video subtitles with this tool?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Export transcript as SRT and VTT subtitle files. Upload directly to YouTube, Vimeo, or any video platform. Perfect for re-uploading and SEO.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to download the YouTube video first?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. That\'s the main advantage. Paste the YouTube URL directly — we stream the audio from YouTube servers. No download, no upload, no software needed. Instant processing.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why is VideoText faster than YouTube auto-captions?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'YouTube captions are generated at 70-80% accuracy in real-time. VideoText uses advanced offline AI (OpenAI Whisper) for 98.5% accuracy plus structured outputs: transcript, speaker labels, AI summary, chapter markers, and subtitle files — all in one pass.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I transcribe long YouTube videos (podcasts, webinars)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Free tier handles up to 30 minutes per video. Basic plan: 45 minutes. Pro plan: 2 hours. Agency plan: 4 hours. Transcription speed: ~1 minute per 10 minutes of video.',
          },
        },
        {
          '@type': 'Question',
          name: 'What languages does the YouTube transcript generator support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '90+ languages. Just paste any YouTube video in any language — we auto-detect or let you select the language manually for better accuracy.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use YouTube transcripts for blog posts or SEO?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Absolutely. Convert one YouTube video into: blog post (using transcript), social media snippets (using chapters), email newsletter content, knowledge base articles. Transcripts include exact timestamps for easy citing and linking.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to convert a YouTube video to a transcript',
      description: 'Convert any YouTube video to a searchable transcript without downloading. Paste URL, get transcript plus subtitles and summary in 2-3 minutes.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Paste YouTube URL',
          text: 'Copy any YouTube video URL (youtube.com or youtu.be). Paste into VideoText. No download, no software install needed. We stream the audio directly.',
        },
        {
          '@type': 'HowToStep',
          name: 'AI transcribes and generates outputs',
          text: 'We extract audio, transcribe to text, auto-label speakers, detect chapters, and generate summary - all in parallel. A 10-minute video finishes in 1 minute. A 1-hour video in 3-5 minutes.',
        },
        {
          '@type': 'HowToStep',
          name: 'Export transcript, subtitles, and summary',
          text: 'Download transcript as TXT or PDF. Export SRT/VTT subtitles for YouTube/Vimeo. Copy AI summary or chapters. All ready to use - no editing needed.',
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Free YouTube Transcript Generator — No Download, Instant Results',
      description: 'Free YouTube transcript generator. Paste any video URL — get complete transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in 2-3 minutes. No downloading required. 98.5% accurate. 50,000+ creators use VideoText.',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      url: 'https://videotext.io/youtube-transcript-generator',
      featureList: 'Paste YouTube URL (no download required), 98.5% accuracy (OpenAI Whisper large-v3), Instant transcript generation, SRT and VTT subtitle export, AI-generated summary, Auto-generated chapters from transcript, Speaker diarization (speaker labels), 90+ language support, Free tier: 2 hours/month (no credit card), Pro tier: unlimited transcription ($9.99/month), Zero data retention (files deleted after processing), Batch processing (Pro/Agency)',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2300',
      },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        offers: [
          {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free: 2 hours/month (no credit card required)',
            url: 'https://videotext.io/youtube-transcript-generator',
          },
          {
            '@type': 'Offer',
            price: '9.99',
            priceCurrency: 'USD',
            description: 'Pro: unlimited transcription, batch processing, priority support',
            url: 'https://videotext.io/pricing',
          },
        ],
      },
      provider: {
        '@type': 'Organization',
        name: 'VideoText',
        url: 'https://videotext.io',
        logo: 'https://videotext.io/logo.png',
        sameAs: ['https://twitter.com/videotextio'],
      },
    },
  ],
}

export function getAeoJsonLd(pathname: string): object[] | null {
  return AEO_ROUTE_SCHEMAS[pathname] ?? null
}

/** SoftwareApplication JSON-LD for individual paid tool pages. */
const TOOL_SOFTWARE_SCHEMAS: Record<string, { name: string; description: string; featureList: string }> = {
  '/video-to-transcript': {
    name: 'Video to Transcript — Fast AI Transcription with Structured Output',
    description: 'Convert any video to a clean transcript in minutes. ~98.5% accuracy. Outputs: full transcript, AI summary, auto-generated chapters, SRT/VTT subtitles, and speaker labels. Zero data retention — files deleted after processing. Powered by OpenAI Whisper.',
    featureList: 'Fast AI transcription (2-hour video in ~5 min), ~98.5% word accuracy, AI summary with bullet points, Auto-generated chapters, Speaker diarization, SRT subtitle export, VTT subtitle export, TXT / PDF / DOCX / JSON export, 90+ language support, Batch processing (Pro), Zero data retention, YouTube URL input',
  },
  '/youtube-transcript-generator': {
    name: 'Free YouTube Transcript Generator — No Download, Instant Results',
    description: 'Free YouTube transcript generator. Paste any video URL — get complete transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in 2-3 minutes. No downloading required. 98.5% accurate. 50,000+ creators use VideoText.',
    featureList: 'Paste YouTube URL (no download required), 98.5% accuracy (OpenAI Whisper large-v3), Instant transcript generation, SRT and VTT subtitle export, AI-generated summary, Auto-generated chapters from transcript, Speaker diarization (speaker labels), 90+ language support, Free tier: 2 hours/month (no credit card), Pro tier: unlimited transcription ($9.99/month), Zero data retention (files deleted after processing)',
  },
  '/video-to-subtitles': {
    name: 'Video to Subtitles — SRT & VTT Generator',
    description: 'Generate broadcast-ready SRT and VTT subtitle files from any video with AI. Single or multi-language. Powered by OpenAI Whisper.',
    featureList: 'SRT generation, VTT generation, Multi-language subtitles, AI timing, YouTube URL input, Subtitle download',
  },
  '/translate-subtitles': {
    name: 'Translate Subtitles — SRT/VTT to Any Language',
    description: 'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, French, Japanese, and 70+ languages with AI. Upload subtitles, pick target language, download.',
    featureList: 'SRT translation, VTT translation, 50+ target languages, Timestamp preservation, Download translated subtitles',
  },
  '/fix-subtitles': {
    name: 'Fix Subtitles — Auto-Correct Timing & Format',
    description: 'Auto-correct overlapping timestamps, long lines, and gaps in SRT/VTT files. Upload SRT or VTT, download corrected file.',
    featureList: 'Fix overlapping timestamps, Fix long lines, Fix timing gaps, SRT support, VTT support, Instant download',
  },
  '/burn-subtitles': {
    name: 'Burn Subtitles into Video — Hardcode Captions',
    description: 'Hardcode SRT or VTT subtitles permanently into a video file. No player required to display captions.',
    featureList: 'Burn SRT subtitles, Burn VTT subtitles, Hardcode captions, MP4 output, No account required for free tier',
  },
  '/compress-video': {
    name: 'Compress Video — Reduce File Size Online',
    description: 'Compress video online with light, medium, or heavy compression settings. Reduce file size for sharing and uploads.',
    featureList: 'Video compression, Light compression, Medium compression, Heavy compression, MP4 output, No quality loss option',
  },
  '/batch-process': {
    name: 'Batch Video to Subtitles — Multiple Videos at Once',
    description: 'Transcribe or subtitle many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans.',
    featureList: 'Batch transcription, Batch subtitle generation, ZIP download, Multi-language batch, Pro and Agency plans',
  },
}

export function getSoftwareApplicationJsonLd(pathname: string): object | null {
  const schema = TOOL_SOFTWARE_SCHEMAS[pathname]
  if (!schema) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: schema.name,
    description: schema.description,
    featureList: schema.featureList,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    url: `${SITE_URL}${pathname}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free tier: 3 imports/month. Paid plans from $19/month.' },
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

/** HowTo JSON-LD for step-by-step how-to pages. */
const HOWTO_SCHEMAS: Record<string, { name: string; description: string; steps: { name: string; text: string }[] }> = {
  '/video-to-transcript': {
    name: 'How to convert a video to a transcript',
    description: 'Upload any video file and receive a clean transcript, AI summary, auto-generated chapters, and SRT/VTT subtitles — all in under 5 minutes for a 2-hour video.',
    steps: [
      { name: 'Upload your video', text: 'Drag and drop an MP4, MOV, MKV, or WebM file into the upload zone, or paste a public YouTube URL. Files process at roughly 1 minute of output per 24 seconds of real time.' },
      { name: 'AI processes your video', text: 'VideoText transcribes the audio using OpenAI Whisper (~98.5% accuracy), identifies speakers, generates chapter markers, and writes an AI summary — all in a single pass. A 2-hour video is typically done in under 5 minutes.' },
      { name: 'Download your structured output', text: 'Export the full transcript as TXT, PDF, DOCX, or JSON. Download SRT or VTT subtitle files. Copy the AI summary or chapters. Your files are deleted immediately after you download.' },
    ],
  },
  '/google-meet-transcript': {
    name: 'How to transcribe a Google Meet recording',
    description: 'Record in Google Meet, download the recording from Google Drive, and upload it to VideoText for transcript, summary, and subtitle outputs.',
    steps: [
      { name: 'Record your meeting in Google Meet', text: 'Finish your meeting and ensure the recording is saved to Google Drive. This workflow is for post-meeting recording files, not live meeting capture.' },
      { name: 'Download the recording MP4 from Google Drive', text: 'Open Google Drive, locate the Meet recording, and download the MP4 file to your device.' },
      { name: 'Upload the recording to VideoText', text: 'Use the Google Meet Transcript page uploader to process the file and generate transcript text, speaker-labeled view, summary output, and subtitle exports.' },
      { name: 'Review and export outputs', text: 'Copy transcript text for notes, download subtitle files, and export structured outputs for follow-up and documentation workflows.' },
    ],
  },
  '/zoom-meeting-transcript': {
    name: 'How to transcribe a Zoom meeting recording',
    description: 'Download your Zoom meeting recording and upload it to VideoText to generate transcript, summary, and subtitle outputs.',
    steps: [
      { name: 'Record your meeting in Zoom', text: 'Use local or cloud recording in Zoom and wait for the recording file to be available.' },
      { name: 'Download the Zoom recording file', text: 'Download the MP4 from Zoom cloud recordings or your local Zoom recordings folder.' },
      { name: 'Upload to VideoText', text: 'Upload the downloaded Zoom recording file to the shared transcription tool flow.' },
      { name: 'Use transcript outputs', text: 'Review transcript text, summary output, speaker-labeled view, and subtitle exports for follow-up.' },
    ],
  },
  '/meeting-recording-to-transcript': {
    name: 'How to convert a meeting recording to transcript text',
    description: 'Download meeting recordings from Zoom, Google Meet, Teams, or webinars and upload the file for transcript outputs in VideoText.',
    steps: [
      { name: 'Download your meeting recording', text: 'Export or download the recording file from your meeting platform after the call.' },
      { name: 'Upload the file into VideoText', text: 'Use the meeting recording uploader flow to start transcript processing.' },
      { name: 'Review transcript and summary outputs', text: 'Use generated transcript text and structured summary output for team notes and handoffs.' },
      { name: 'Export subtitles and files', text: 'Download subtitle and transcript export files for downstream workflows.' },
    ],
  },
  '/meeting-transcription-tool': {
    name: 'How to use a meeting transcription tool for recorded calls',
    description: 'Upload recorded meetings to generate transcript text, speaker labels, summaries, subtitles, and exports in one workflow.',
    steps: [
      { name: 'Download the meeting recording', text: 'Get the recording file from Zoom, Google Meet, Teams, or webinar software.' },
      { name: 'Upload the recording file', text: 'Upload the file into the shared transcription tool used by meeting-focused pages.' },
      { name: 'Generate and review transcript output', text: 'Review transcript text, speaker-separated sections, and summary output for key actions.' },
      { name: 'Share exports with stakeholders', text: 'Export files for notes, recaps, captioning, and searchable documentation.' },
    ],
  },
  '/how-to-create-srt-file': {
    name: 'How to Create an SRT File',
    description: 'A practical tutorial for creating SRT subtitle files manually and with AI generation, including valid timestamp format and validation checks.',
    steps: [
      { name: 'Understand valid SRT block format', text: 'Each subtitle block must include: sequence number, timestamp line in HH:MM:SS,mmm --> HH:MM:SS,mmm format, subtitle text, then one blank line.' },
      { name: 'Create SRT manually in a text editor', text: 'Use Notepad, TextEdit, or VS Code. Write each block with proper numbering and timestamps. Save using UTF-8 encoding with .srt extension.' },
      { name: 'Validate and fix common errors', text: 'Check for overlapping timestamps, missing blank lines, invalid arrows, and wrong millisecond separators before uploading your subtitle file.' },
      { name: 'Use AI generation for faster workflows', text: 'For full videos, upload your file to VideoText Video to Subtitles and auto-generate SRT instead of manually timing each subtitle line.' },
      { name: 'Download and test the subtitle file', text: 'Open the SRT in a player or upload to YouTube/Vimeo to verify timing sync and readability before publishing.' },
    ],
  },
  '/how-to-add-subtitles-to-mp4': {
    name: 'How to Add Subtitles to an MP4 Video',
    description: 'A step-by-step guide to adding subtitles to an MP4 video file — either as a soft subtitle file or burned-in permanently.',
    steps: [
      { name: 'Generate or obtain an SRT file', text: 'Use VideoText Video to Subtitles to automatically generate an SRT subtitle file from your MP4, or upload an existing SRT file.' },
      { name: 'Choose your subtitle method', text: 'Decide between soft subtitles (uploadable SRT file, user can toggle on/off) or hard subtitles (burned into the video permanently). For social media, burn-in is recommended.' },
      { name: 'For soft subtitles: upload SRT to your platform', text: 'On YouTube, go to Subtitles in Studio and upload the .srt file. On Vimeo, use the Distribution > Subtitles panel. The SRT file links timing to dialogue without modifying the video.' },
      { name: 'For hard subtitles: use VideoText Burn Subtitles', text: 'Go to videotext.io/burn-subtitles. Upload your MP4 and your SRT file. VideoText renders the captions permanently into the video and returns a new MP4.' },
      { name: 'Download and publish', text: 'Download the output MP4. The subtitles are now visible on any device or player without the need to upload a separate SRT file.' },
    ],
  },
  '/youtube-transcript-generator': {
    name: 'How to get a YouTube video transcript',
    description: 'Step-by-step guide to generating a transcript from any YouTube video. Paste URL, get clean transcript with timestamps, subtitles, and summary — no downloading required.',
    steps: [
      { name: 'Copy your YouTube video URL', text: 'Find any public YouTube video (youtube.com or youtu.be links work). Copy the full URL from the address bar. Works with long-form content like podcasts, lectures, webinars, and interviews.' },
      { name: 'Paste URL into VideoText', text: 'Go to videotext.io/youtube-transcript-generator. Paste the YouTube URL into the input field. The tool validates instantly — you see if the video is accessible before processing.' },
      { name: 'Start transcript generation', text: 'Click "Generate Transcript". VideoText streams the audio directly from YouTube servers (no download step). Processing time: ~1 minute per 10 minutes of video. A typical 20-minute video finishes in 2-3 minutes.' },
      { name: 'Review and export transcript', text: 'View the clean transcript with [timestamps] and speaker labels. Export as TXT/PDF for notes or DOCX for editing. Download SRT/VTT subtitle files for re-uploading to YouTube or other platforms.' },
      { name: 'Use outputs for SEO, content, or distribution', text: 'Repurpose transcript into blog posts, social snippets, email newsletters, or knowledge base articles. Subtitle files improve video SEO and accessibility on any platform.' },
    ],
  },
}

export function getHowToJsonLd(pathname: string): object | null {
  const schema = HOWTO_SCHEMAS[pathname]
  if (!schema) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: schema.name,
    description: schema.description,
    step: schema.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

/** BreadcrumbList JSON-LD for a given path and items. */
export function getBreadcrumbJsonLd(_pathname: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const p = resolveInternalLinkPath(item.path)
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: `${SITE_URL}${p === '/' ? '' : p}`,
      }
    }),
  }
}
