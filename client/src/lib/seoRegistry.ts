/**
 * SEO page registry — single source of truth for programmatic SEO wrapper pages.
 * Used by SeoToolPage template, meta derivation, and automation (sitemap, routes).
 * NO content rewriting; pure migration from existing wrapper pages.
 */
import { getProgrammaticSeoEntries } from './generateSeoPages'
import { resolveInternalLinkPath } from './primaryUrls'
import { REVENUE_TOOL_PATHS } from './revenueTools'

export interface FaqItem {
  q: string
  a: string
}

export interface SeoWorkflowStep {
  title: string
  detail: string
}

export interface SeoOutputExample {
  title: string
  body: string
}

export interface SeoUseCase {
  title: string
  body: string
}

export interface SeoComparisonRow {
  feature: string
  videotext: string
  alternatives: string
}

export interface SeoDeepContent {
  proofPoints?: string[]
  workflowSteps?: SeoWorkflowStep[]
  outputExamples?: SeoOutputExample[]
  comparisonRows?: SeoComparisonRow[]
  useCases?: SeoUseCase[]
  ctaText?: string
  ctaPath?: string
}

export type SeoToolKey =
  | 'video-to-transcript'
  | 'video-to-subtitles'
  | 'translate-subtitles'
  | 'fix-subtitles'
  | 'burn-subtitles'
  | 'compress-video'
  | 'batch-process'
  | 'voice-to-text'

export interface SeoRegistryEntry {
  /** Path (e.g. /video-to-text). Must match route path. */
  path: string
  /** Page title (used for <title> and og:title). */
  title: string
  /** Meta description. */
  description: string
  /** H1 on page. */
  h1: string
  /** Intro paragraph below H1. */
  intro: string
  /** FAQ items for FAQ section and FAQPage schema. */
  faq: FaqItem[]
  /** Breadcrumb label (last segment). */
  breadcrumbLabel: string
  /** Canonical tool path — which core tool component to render. */
  toolKey: SeoToolKey
  /** Related tool paths for cross-linking (CrossToolSuggestions). Must be existing and indexable. */
  relatedSlugs: string[]
  /** Include in sitemap and allow in relatedSlugs. Required. */
  indexable: boolean
  /** Unique intent identifier; prevents keyword cannibalization (one indexable per intentKey unless allowlisted). */
  intentKey: string
  /** Optional group for close variants; at most one primary indexable per group unless allowlisted. */
  canonicalGroup?: string
  /** When true, this page is the primary indexable for its canonicalGroup. */
  primaryInGroup?: boolean
  /** For video-to-transcript: open YouTube URL tab by default (improves conversion for YouTube SEO pages). */
  defaultInputMode?: 'youtube'
  /** Optional deep content sections for high-priority ranking pages. */
  deepContent?: SeoDeepContent
}

const MANUAL_REGISTRY: SeoRegistryEntry[] = [
  {
    path: '/video-to-text',
    title: 'Video to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert video to text online. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Sign up for free to try.',
    h1: 'Video to Text Online',
    intro:
      'Turn any video into text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Sign up for free to try.',
    breadcrumbLabel: 'Video to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-to-text',
    faq: [
      { q: 'What video formats are supported?', a: 'We support MP4, MOV, AVI, WebM, and MKV. Upload any of these formats and our AI extracts the speech track as plain text within seconds. If your file is in a different container, most video editors let you export to MP4 before uploading.' },
      { q: 'Is the transcript accurate?', a: 'Yes. We use AI speech recognition trained on diverse audio to deliver high accuracy for clear speech. Accuracy is best when the audio is clear with minimal background noise. Setting the spoken language before processing improves results for non-English content.' },
      { q: 'Can I copy or download the transcript?', a: 'Yes. After processing, click the Copy button to grab the full transcript as plain text, or use the download icon for a text file. Paid plans unlock additional export formats including JSON, CSV, Markdown, and Notion-style structured output.' },
      { q: 'Can I view the transcript in another language?', a: 'Yes. Click Translate after transcribing and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original. Translations are generated on demand and cached so you can switch between languages instantly without re-uploading.' },
    ],
  },
  // ── YouTube transcription (high SEO potential) ─────────────────────────────────
  {
    path: '/youtube-to-transcript',
    title: 'YouTube to Transcript – Paste URL, Get Text Instantly | VideoText',
    description:
      'Convert any YouTube video to transcript with one click. Paste a youtube.com or youtu.be link — no download, no upload. AI transcription in seconds. Free tier. Sign up for free to try.',
    h1: 'YouTube to Transcript — Paste URL, Get Text Instantly',
    intro:
      'Paste any YouTube URL and get a full transcript in seconds. No download, no file upload. Our worker streams the audio directly and transcribes it with AI. Works with public videos, playlists, shorts, and age-restricted content (with optional cookies). Same features as file upload: speakers, summary, chapters, translate to 6 languages.',
    breadcrumbLabel: 'YouTube to Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles', '/transcribe-video', '/meeting-transcript'],
    indexable: true,
    intentKey: 'youtube-to-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Can I transcribe a YouTube video without downloading it?', a: 'Yes. Paste any public YouTube URL (youtube.com/watch?v=… or youtu.be/…) and we stream the audio directly. No download, no file upload. The transcript is ready in seconds.' },
      { q: 'Does YouTube to transcript work with age-restricted or private videos?', a: 'Age-restricted videos work when you provide optional cookies (export from your browser). Private and unlisted videos are not supported — only public URLs.' },
      { q: 'What YouTube URL formats are supported?', a: 'We support youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…, and youtube.com/embed/…. Any format that contains the 11-character video ID works.' },
      { q: 'Is YouTube transcription free?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st). Paste a URL and get a transcript after signing up for free. Paid plans unlock more volume and multi-language output.' },
    ],
  },
  {
    path: '/youtube-transcript',
    title: 'YouTube Transcript – Get Transcript from Any YouTube Video | VideoText',
    description:
      'Get a transcript from any YouTube video. Paste the URL, no download needed. Accurate AI transcription. Download as TXT, SRT, or translate to 70+ languages. Free tier.',
    h1: 'YouTube Transcript — Get Text from Any Video',
    intro:
      'Get a transcript from any YouTube video in seconds. Paste the URL — we stream the audio and transcribe it with AI. Download the text, generate SRT subtitles, or translate to 6 languages. No software to install, no file to upload.',
    breadcrumbLabel: 'YouTube Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/podcast-transcript', '/subtitle-generator'],
    indexable: true,
    intentKey: 'youtube-transcript',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I get a transcript from a YouTube video?', a: 'Paste the YouTube URL into our transcript tool and click Transcribe. We extract the audio directly from YouTube and convert it to text with AI. The transcript appears in seconds — no downloading the video, no extra steps.' },
      { q: "Why is VideoText more accurate than YouTube's auto-captions?", a: "YouTube's auto-captions use Google's speech recognition, which is optimized for speed and broad coverage. VideoText uses Whisper large-v3, which achieves lower Word Error Rates particularly for accented speech, technical vocabulary, fast speech, and non-English content. For content where accuracy matters, Whisper produces cleaner transcripts." },
      { q: 'Can I use the YouTube transcript for SEO?', a: 'Yes. Add the full transcript to your video description or as text on the accompanying blog post or show notes page. Search engines cannot index YouTube audio — but they index text. A transcript makes every word in your video searchable, which increases long-tail keyword coverage significantly.' },
      { q: 'Can I use the YouTube transcript for subtitles?', a: 'Yes. After transcribing, download as SRT or VTT and upload to YouTube Studio → Subtitles → Upload file. Or use the Subtitle Generator to generate subtitles directly from any video file.' },
      { q: 'Does it work for YouTube Shorts?', a: 'Yes. Shorts URLs (youtube.com/shorts/…) are supported. Transcription quality is the same as regular YouTube videos.' },
      { q: 'Can I translate a YouTube transcript to another language?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated version appears alongside the original.' },
      { q: 'Is there a limit on video length for YouTube transcription?', a: 'Free tier: 3 imports per month (resets on the 1st). Paid plans support up to 4 hours per video. Very long videos may take a few minutes to process.' },
    ],
  },
  {
    path: '/youtube-video-transcript',
    title: 'YouTube Video Transcript – Convert Any YouTube Link to Text | VideoText',
    description:
      'Convert YouTube video to transcript. Paste a link, get accurate text. No download. Free AI transcription. Speakers, summary, chapters. Translate to Hindi, Spanish, Chinese, and more.',
    h1: 'YouTube Video Transcript — Convert Link to Text',
    intro:
      'Convert any YouTube video to a transcript with one click. Paste the link — no download, no upload. Our AI transcribes the speech and delivers a clean, readable transcript. Use Speakers for who-said-what, Summary for key points, Chapters to navigate by section.',
    breadcrumbLabel: 'YouTube Video Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/transcribe-video', '/audio-to-text'],
    indexable: true,
    intentKey: 'youtube-video-transcript',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Can I get a transcript from a YouTube video link?', a: 'Yes. Paste any youtube.com or youtu.be link and we transcribe the video. No download required.' },
      { q: 'Does it work with YouTube Shorts?', a: 'Yes. Shorts URLs (youtube.com/shorts/…) are supported. Same transcription quality as regular videos.' },
      { q: 'Can I translate the YouTube transcript?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian.' },
    ],
  },
  {
    path: '/transcribe-youtube-video',
    title: 'Transcribe YouTube Video – Free Online | VideoText',
    description:
      'Transcribe any YouTube video free. Paste the URL, get an accurate transcript. Sign up for free. AI-powered. Download as TXT or SRT. Translate to 70+ languages.',
    h1: 'Transcribe YouTube Video — Free Online',
    intro:
      'Transcribe any YouTube video for free. Paste the URL and get an accurate text transcript in seconds. Sign up for free. No download needed. Use the transcript for subtitles, blog posts, or translation.',
    breadcrumbLabel: 'Transcribe YouTube Video',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/free-transcription', '/podcast-transcript'],
    indexable: true,
    intentKey: 'transcribe-youtube-video',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Is it free to transcribe a YouTube video?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
      { q: 'How accurate is YouTube video transcription?', a: 'We use AI speech recognition trained on diverse content. Accuracy is high for clear speech. Set the spoken language for best results.' },
      { q: 'Can I transcribe YouTube videos in other languages?', a: 'Yes. Set the spoken language before processing. After transcribing, translate to 6 languages with one click.' },
    ],
  },
  {
    path: '/youtube-to-text',
    title: 'YouTube to Text – Convert YouTube Videos to Text Online | VideoText',
    description:
      'Convert YouTube videos to text online. Paste any YouTube URL and get a transcript instantly. No download. Free, AI-powered. Download or copy. Translate to 6 languages.',
    h1: 'YouTube to Text — Convert Videos to Text Online',
    intro:
      'Convert any YouTube video to text with one click. Paste the URL and get a full transcript. No download, no file upload. Download as plain text, copy to clipboard, or translate to English, Hindi, Spanish, Chinese, Russian, or Telugu.',
    breadcrumbLabel: 'YouTube to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-text', '/mp4-to-text'],
    indexable: true,
    intentKey: 'youtube-to-text',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I convert a YouTube video to text?', a: 'Paste the YouTube URL into our tool and click Transcribe. We extract the audio and convert it to text.' },
      { q: 'Is YouTube to text free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'Can I use the text for subtitles?', a: 'Yes. Download as SRT or VTT and upload to YouTube, Vimeo, or any platform.' },
    ],
  },
  {
    path: '/mp4-to-text',
    title: 'MP4 to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert MP4 to text online. Get an accurate transcript, then translate it to Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. Sign up for free to try.',
    h1: 'MP4 to Text Online',
    intro:
      'Convert MP4 video to text online. Upload your MP4, get an accurate transcript, then view it in Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. Sign up for free to try.',
    breadcrumbLabel: 'MP4 to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-text',
    faq: [
      { q: 'Can I convert MP4 to text?', a: 'Yes. Upload your MP4 file and our AI extracts the spoken audio as plain text. We also support MOV, AVI, WebM, and MKV. The entire process — upload, extraction, transcription — runs automatically in the background and results appear within seconds for short videos.' },
      { q: 'How long does MP4 transcription take?', a: 'Most videos are fully transcribed in 30–90 seconds. You see the transcript building in real time as segments complete, so you do not wait for the entire job before reading results. A 60-minute video typically finishes in 5–8 minutes.' },
      { q: 'Is there a file size limit for MP4 files?', a: 'Large MP4 files are supported — check the upload zone for the current limit. If your file exceeds it, trim the video to the segment you need before uploading. The tool processes the audio track, not the full video, so compression level does not affect speed.' },
      { q: 'Can I translate the MP4 transcript to another language?', a: 'Yes. After transcribing, click Translate and choose English, Hindi, Telugu, Spanish, Chinese, or Russian to view the transcript in that language. The translated view appears alongside the original, and you can switch between languages without re-uploading your file.' },
    ],
  },
  {
    path: '/mp4-to-srt',
    title: 'MP4 to SRT Online – Fast & Accurate | VideoText',
    description:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, download timed captions. Sign up for free to try.',
    h1: 'MP4 to SRT Online',
    intro:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, and download timed captions. Sign up for free to try.',
    breadcrumbLabel: 'MP4 to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-srt',
    faq: [
      { q: 'How do I get SRT subtitles from an MP4 file?', a: 'Upload your MP4 file, choose SRT as the output format, and click Generate. Our AI transcribes the speech and aligns each word to its timestamp, producing a timed SRT file you can download and upload directly to YouTube, Vimeo, or any video platform.' },
      { q: 'Can I get VTT instead of SRT from MP4?', a: 'Yes. The tool supports both SRT and VTT from the same upload. SRT is recommended for YouTube and most video platforms; VTT is the standard for HTML5 web players. Select your preferred format before processing — no re-upload needed to switch.' },
      { q: 'Does MP4 to SRT support multiple languages?', a: 'Yes. Set the spoken language for best accuracy, or use auto-detect for English and many other languages. Paid plans let you generate subtitle files in multiple output languages from a single upload, which is useful for multilingual audiences.' },
    ],
  },
  {
    path: '/subtitle-generator',
    title: 'Subtitle Generator Online – Fast & Accurate | VideoText',
    description:
      'Generate subtitles from any video online. Upload your file, get accurate SRT or VTT with timestamps in seconds. Free AI-powered subtitle generator. No software required.',
    h1: 'Subtitle Generator Online — AI-Powered',
    intro:
      'Generate subtitles from any video in seconds. Upload your video file and our AI transcribes the speech, aligns every word to a timestamp, and produces a ready-to-use SRT or VTT subtitle file. Upload to YouTube, embed in a web player, or burn directly into the video. Supports 90+ languages. Free tier.',
    breadcrumbLabel: 'Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles', '/video-to-srt', '/burn-subtitles-into-video'],
    indexable: true,
    intentKey: 'subtitle-generator',
    faq: [
      { q: 'What is an online subtitle generator?', a: 'An online subtitle generator takes a video file, transcribes the speech using AI, and produces a timed subtitle file (SRT or VTT) you can download and use immediately. You upload the video, wait a few seconds, and download the subtitles — no software to install, no manual typing required.' },
      { q: 'Which subtitle formats does the generator produce?', a: 'SRT and VTT, both generated from the same upload. SRT is the best choice for YouTube, Vimeo, LinkedIn, and most video platforms. VTT is the standard for HTML5 web players like Video.js and Plyr. You choose the format at the point of download — no re-upload needed to switch.' },
      { q: 'How accurate is the AI subtitle generator?', a: 'VideoText uses OpenAI Whisper large-v3, which achieves around 3–8% Word Error Rate on clear English speech. For technical vocabulary, strong accents, or low-quality audio, accuracy is lower. Setting the spoken language before processing (rather than using auto-detect) consistently improves results.' },
      { q: 'How do I add the generated subtitles to YouTube?', a: 'Download the SRT file from VideoText. In YouTube Studio, open your video → Subtitles → Add → Upload file. Select your SRT file. YouTube will sync it to the video automatically. The subtitles appear immediately without YouTube\'s auto-caption processing.' },
      { q: 'Can I generate subtitles in multiple languages?', a: 'Yes. Use the Translate Subtitles tool to translate an existing SRT or VTT file into another language. You can also set the spoken language to non-English before processing — VideoText will transcribe the speech in that language and generate correctly timed subtitles.' },
      { q: 'What video formats are supported?', a: 'MP4, MOV, WebM, MKV, AVI, and most other standard video formats. Audio files also work: MP3, WAV, M4A, AAC, OGG, FLAC. Upload directly — no conversion needed.' },
      { q: 'Can I burn the subtitles into the video (hard subtitles)?', a: 'Yes. After generating subtitles, use the Burn Subtitles into Video tool. Upload your video and SRT file, and download a new video with the captions permanently embedded. Useful for social media videos where external subtitle tracks are not supported.' },
      { q: 'Do I need to sign up to generate subtitles?', a: 'Yes. Sign up for free to try. You get 3 imports per month (resets on the 1st). Upgrade to a paid plan when you need more imports or multi-language subtitle output in one batch.' },
    ],
  },
  {
    path: '/srt-translator',
    title: 'SRT Translator Online – Fast & Accurate | VideoText',
    description:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose target language, download translated captions with timestamps intact.',
    h1: 'SRT Translator Online',
    intro:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose the target language, and download translated captions with timestamps intact.',
    breadcrumbLabel: 'SRT Translator',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'srt-translator',
    faq: [
      { q: 'What is an SRT translator?', a: 'An SRT translator converts the text inside an SRT or VTT subtitle file into another language while keeping every timestamp exactly as it was. You upload the subtitle file, select the target language, and download a translated version where the captions stay perfectly in sync with the video.' },
      { q: 'Which languages does the SRT translator support?', a: 'The translator supports 70+ languages including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, and more. The original timing is always preserved — only the text content changes. Set the source and target language before processing for best accuracy.' },
      { q: 'Can I edit the translated SRT subtitles?', a: 'Yes. After translation, preview the result and download. Paid plans unlock in-app editing so you can adjust translated text before downloading, which is useful for fixing AI translation nuances or adding context that direct translation misses.' },
    ],
  },
  {
    path: '/meeting-transcript',
    title: 'Meeting Transcript — Turn Meetings into Text | VideoText',
    description:
      'Convert meeting recordings to text. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Download or copy. Sign up for free to try.',
    h1: 'Meeting Transcript — Turn Meetings into Text',
    intro:
      'Convert meeting recordings to text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers and Summary for who said what and key points.',
    breadcrumbLabel: 'Meeting Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'meeting-transcript',
    faq: [
      { q: 'Is meeting transcription free?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st) — sign up for free to try. Create a free account to track usage across browser sessions. Paid plans start at $19/month for 450 minutes, covering most teams that process a few hours of meetings per week.' },
      { q: 'Does this work for Zoom, Teams, and Google Meet recordings?', a: 'Yes. Upload any meeting recording in MP4 or MOV format — Zoom cloud recordings, Teams downloads, and Google Meet exports all work. Use the Speakers branch after transcribing to see who said what, organized by speaker turn rather than continuous paragraphs.' },
      { q: 'Do timestamps stay accurate in meeting transcripts?', a: 'Yes. The transcript preserves paragraph structure aligned to the original audio timing. The Chapters branch breaks the meeting into navigable sections so you can jump to specific topics. Keywords indexes repeated terms and links each to where it first appears in the transcript.' },
      { q: 'Can I get the meeting transcript in another language?', a: 'Yes. Click Translate after transcribing and pick from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original. This is useful for global teams where meeting notes need to reach colleagues in different countries.' },
    ],
  },
  {
    path: '/speaker-diarization',
    title: 'Speaker-Separated Video Transcripts — Instantly Online | VideoText',
    description:
      'Get video transcripts with speaker labels. Transcribe, then view Speakers branch and translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Free tier.',
    h1: 'Speaker-Separated Video Transcripts — Instantly Online',
    intro:
      'Get video transcripts with speaker-style grouping. Transcribe, then open the Speakers branch and optionally view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
    breadcrumbLabel: 'Speaker Diarization',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'speaker-diarization',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'How are speakers labeled?', a: 'After transcribing, open the Speakers branch. Paragraphs are grouped and labeled (Speaker 1, 2, etc.) from the transcript structure.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript and all branches use the same underlying text; you can jump from Chapters or Keywords to the transcript.' },
    ],
  },
  {
    path: '/video-summary-generator',
    title: 'Video Summary Generator — Decisions, Actions, Key Points | VideoText',
    description:
      'Extract structured summaries from video: decisions, action items, key points. Transcribe, use Summary branch, and translate transcript to 6 languages. Free tier.',
    h1: 'Video Summary Generator — Decisions, Actions, Key Points',
    intro:
      'Extract structured summaries from video: decisions, action items, key points. Upload, transcribe, open the Summary branch, and translate the transcript to 6 languages if needed.',
    breadcrumbLabel: 'Video Summary Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-summary-generator',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'What does the summary include?', a: 'The Summary branch extracts decisions, action items, and key points from the transcript using simple pattern matching.' },
      { q: 'Can I export the summary?', a: 'Yes. Use the Exports branch to download JSON, CSV, Markdown, or Notion-style export (paid for full download).' },
    ],
  },
  {
    path: '/video-chapters-generator',
    title: 'Video Chapters Generator — Section Headings from Transcript | VideoText',
    description:
      'Generate chapter headings from your video transcript. Upload, transcribe, use Chapters branch. View or translate transcript in English, Hindi, Telugu, Spanish, Chinese, Russian. Free.',
    h1: 'Video Chapters Generator — Section Headings from Transcript',
    intro:
      'Generate chapter-style sections from your video transcript. Upload, transcribe, use the Chapters branch to jump by section, and view or translate the transcript in 6 languages.',
    breadcrumbLabel: 'Video Chapters Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-chapters-generator',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'How are chapters created?', a: 'Chapters are derived from transcript paragraphs. Open the Chapters branch after transcribing to see section headings and jump to that part of the transcript.' },
      { q: 'Can I use these on YouTube?', a: 'Chapters are for navigation in our tool. For YouTube chapters, use the timestamps in your video description; our transcript helps you find where sections start.' },
    ],
  },
  {
    path: '/keyword-indexed-transcript',
    title: 'Keyword-Indexed Transcript — Topic Index from Video | VideoText',
    description:
      'Get a keyword index from your video transcript. Repeated terms link to sections. Translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Upload, transcribe, open Keywords branch.',
    h1: 'Keyword-Indexed Transcript — Topic Index from Video',
    intro:
      'Get a keyword index from your video transcript. Upload, transcribe, open the Keywords branch, and view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
    breadcrumbLabel: 'Keyword Indexed Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'keyword-indexed-transcript',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'What are keywords?', a: 'Repeated terms in the transcript. The Keywords branch shows them and links each to the transcript section where it first appears.' },
      { q: 'Can I export the index?', a: 'Yes. The Exports branch offers JSON, CSV, Markdown, and Notion-style export (paid for full download).' },
    ],
  },
  {
    path: '/srt-to-vtt',
    title: 'SRT to VTT Converter — Subtitle Format Conversion | VideoText',
    description:
      'Generate VTT from video or convert SRT to VTT. Upload video for SRT/VTT, or use the convert step after generating. Free tier.',
    h1: 'SRT to VTT — Subtitle Format Conversion',
    intro:
      'Generate VTT from video or convert SRT to VTT. Upload a video for SRT/VTT, or use the convert step after generating. Free tier available.',
    breadcrumbLabel: 'SRT to VTT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'srt-to-vtt',
    faq: [
      { q: 'How do I get VTT from video?', a: 'Upload your video, choose VTT as the format, and click Generate. You get a timed VTT file for web players.' },
      { q: 'Can I convert SRT to VTT?', a: 'Yes. After generating SRT, use the Convert format section on the same page to get VTT or plain text.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock full export and multi-language.' },
    ],
  },
  {
    path: '/subtitle-converter',
    title: 'Subtitle Converter — SRT, VTT, TXT | VideoText',
    description:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats. Free tier.',
    h1: 'Subtitle Converter — SRT, VTT, TXT',
    intro:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats.',
    breadcrumbLabel: 'Subtitle Converter',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'subtitle-converter',
    faq: [
      { q: 'What formats are supported?', a: 'Generate SRT or VTT from video. After processing, you can convert to SRT, VTT, or plain text (TXT).' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Conversion preview is free; full download may require upgrade.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. Conversion only changes format; timestamps are preserved.' },
    ],
  },
  {
    path: '/subtitle-timing-fixer',
    title: 'Subtitle Timing Fixer — Fix Overlaps and Gaps | VideoText',
    description:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Timing Fixer — Fix Overlaps and Gaps',
    intro:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free.',
    breadcrumbLabel: 'Subtitle Timing Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-timing-fixer',
    faq: [
      { q: 'What does the fixer do?', a: 'It fixes overlapping timestamps, long lines, and gaps in SRT/VTT files so they meet platform and readability rules.' },
      { q: 'Is this free?', a: 'Yes. Upload your subtitle file, get a corrected file. Free.' },
      { q: 'Do I need to upload video?', a: 'No. You upload only the SRT or VTT file. The tool analyzes and corrects timing and format.' },
    ],
  },
  {
    path: '/subtitle-validation',
    title: 'Subtitle Validation — Check Timing and Format | VideoText',
    description:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Validation — Check Timing and Format',
    intro:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free.',
    breadcrumbLabel: 'Subtitle Validation',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-validation',
    faq: [
      { q: 'What does validation check?', a: 'Timing overlaps, line length, formatting. The tool reports issues and can fix them; you get a corrected SRT/VTT file.' },
      { q: 'Is this free?', a: 'Yes. Upload SRT or VTT, get validation and a corrected file. Free.' },
      { q: 'Can I edit subtitles after?', a: 'Yes. Paid plans unlock in-app editing; you can also download and edit the file elsewhere.' },
    ],
  },
  {
    path: '/subtitle-translator',
    title: 'Subtitle Translator — SRT/VTT to Any Language | VideoText',
    description:
      'Translate SRT or VTT subtitles to 70+ languages. Upload, pick target language, download. Timestamps stay intact. Free tier.',
    h1: 'Subtitle Translator — SRT/VTT to Any Language',
    intro:
      'Translate SRT or VTT subtitles to 70+ languages. Upload, pick target language, download. Timestamps stay intact.',
    breadcrumbLabel: 'Subtitle Translator',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-translator',
    faq: [
      { q: 'What languages does the subtitle translator support?', a: 'The subtitle translator supports 70+ languages including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Turkish, Italian, Dutch, and more. Pick your target language from the dropdown before processing. The source language is detected automatically or you can set it manually for better accuracy.' },
      { q: 'Do timestamps stay intact when translating subtitles?', a: 'Yes. Only the text content is translated — every start time and end time in the original SRT or VTT file stays exactly as it was. Your translated subtitles remain perfectly synchronized with the video without any timing adjustments needed.' },
      { q: 'Is the subtitle translator free?', a: 'Yes. Free tier is available after signing up for free. Upload an SRT or VTT file and download the translated version at no cost within the monthly free limit. Paid plans unlock higher minute limits and multi-language output so you can translate a file to multiple languages in one session.' },
    ],
  },
  {
    path: '/multilingual-subtitles',
    title: 'Multilingual Subtitles — Multiple Languages from One File | VideoText',
    description:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages. Free tier.',
    h1: 'Multilingual Subtitles — Multiple Languages from One File',
    intro:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages.',
    breadcrumbLabel: 'Multilingual Subtitles',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'multilingual-subtitles',
    faq: [
      { q: 'Can I get subtitles in multiple languages from one file?', a: 'Yes. Upload your subtitle file once and translate it to different languages individually — each download is a separate file for one target language. Paid plans let you generate multiple language outputs in a single batch, which saves time for creators distributing content to international audiences.' },
      { q: 'Is multilingual subtitle generation free?', a: 'Yes. Free tier is available after signing up for free. Single-language translation is free within the monthly limit. Upgrade to Pro or Agency plans to unlock multi-language batch output, where you generate subtitles in three or more languages from a single upload session.' },
      { q: 'Do timestamps stay accurate across all translated languages?', a: 'Yes. Subtitle translation only changes the text content — every timestamp is preserved exactly as it was in the original file. Your multilingual subtitles stay perfectly synchronized with the video in every language without any timing adjustments on your part.' },
    ],
  },
  {
    path: '/subtitle-language-checker',
    title: 'Subtitle Language Checker — Detect and Translate | VideoText',
    description:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
    h1: 'Subtitle Language Checker — Detect and Translate',
    intro:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
    breadcrumbLabel: 'Subtitle Language Checker',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-language-checker',
    faq: [
      { q: 'What does the subtitle language checker do?', a: 'You upload an SRT or VTT subtitle file and choose a target language. The tool translates the captions so you can verify the content in the new language, check for translation quality, or use the file on a platform that requires a specific language. Your original file is unchanged.' },
      { q: 'Is the subtitle language checker free?', a: 'Yes. Free tier is available after signing up for free. Upload an SRT or VTT file, select the target language, and download the translated version at no cost within the monthly free limit. Paid plans unlock higher limits and multi-language output options.' },
      { q: 'Does the checker modify my original subtitle file?', a: 'No. The translated version is a separate download — your original SRT or VTT file is never modified. You can keep both the original and translated versions and use each wherever needed, such as uploading the original to one platform and the translated version to another.' },
    ],
  },
  {
    path: '/subtitle-grammar-fixer',
    title: 'Subtitle Grammar Fixer — Auto-Correct Caption Text | VideoText',
    description:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Grammar Fixer — Auto-Correct Caption Text',
    intro:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free.',
    breadcrumbLabel: 'Subtitle Grammar Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-grammar-fixer',
    faq: [
      { q: 'What does the subtitle grammar fixer do?', a: 'The subtitle grammar fixer corrects timing, formatting, and structural issues in SRT and VTT files. It fixes overlapping timestamps, lines that are too long for the screen, and spacing errors. Enable the grammar-fix option when processing to also improve caption text capitalization and punctuation.' },
      { q: 'Is the subtitle grammar fixer free?', a: 'Yes. Upload your SRT or VTT file and download a corrected version at no cost within the monthly free limit. Sign up for free to try. The fixer handles timing and formatting automatically — you do not need to edit the file manually after downloading.' },
      { q: 'Do timestamps change when fixing grammar?', a: 'The fixer can correct overlapping or invalid timestamps — for example, when a cue starts before the previous one ends. Otherwise, valid timestamps stay exactly as they were. The output file is ready to upload to YouTube, Vimeo, or any platform immediately after downloading.' },
    ],
  },
  {
    path: '/subtitle-line-break-fixer',
    title: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping | VideoText',
    description:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
    h1: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping',
    intro:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
    breadcrumbLabel: 'Subtitle Line Break Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-line-break-fixer',
    faq: [
      { q: 'What does the subtitle line break fixer do?', a: 'The subtitle line break fixer splits caption lines that are too long to display properly and removes awkward mid-sentence breaks. It ensures captions meet platform limits — YouTube recommends a maximum of 42 characters per line — so subtitles are comfortable to read and display correctly on all screen sizes.' },
      { q: 'Is the line break fixer free?', a: 'Yes. Upload your SRT or VTT file and download a corrected version at no cost within the monthly free limit. Sign up for free to try. The fixer adjusts line lengths automatically, so you do not need to count characters manually or reformat each caption cue by hand.' },
      { q: 'Can I edit the subtitle file after fixing line breaks?', a: 'Yes. Download the corrected file and open it in any text editor or subtitle editing software. Paid plans unlock in-app editing where you can adjust individual caption lines before downloading, which is useful for fine-tuning translation output or fixing specific cues.' },
    ],
  },
  {
    path: '/hardcoded-captions',
    title: 'Hardcoded Captions — Burn Subtitles into Video | VideoText',
    description:
      'Burn SRT or VTT subtitles into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier.',
    h1: 'Hardcoded Captions — Burn Subtitles into Video',
    intro:
      'Burn SRT or VTT subtitles into your video. Upload video and subtitle file, get one video with hardcoded captions. Free tier available.',
    breadcrumbLabel: 'Hardcoded Captions',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/compress-video', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'hardcoded-captions',
    faq: [
      { q: 'What are hardcoded captions?', a: 'Hardcoded captions (also called burned-in or open captions) are subtitles permanently embedded into the video frame so they are always visible without the viewer toggling anything. Upload your video and an SRT or VTT file, and we produce a single MP4 with captions baked in — ready for Instagram, TikTok, or silent autoplay environments.' },
      { q: 'Are hardcoded captions free to create?', a: 'Yes. The free tier is available after signing up for free. Upload your video and subtitle file, choose your font size, position, and opacity, and download the output video at no cost within the monthly free limit. Upgrade to a paid plan for more minutes and larger video files.' },
      { q: 'Can I choose font size and position for hardcoded captions?', a: 'Yes. Before processing, set font size (small, medium, or large), vertical position (bottom or middle of screen), and background opacity (transparent to solid black box). These options let you match the caption style to your brand without needing a video editing tool.' },
    ],
  },
  {
    path: '/video-with-subtitles',
    title: 'Video with Subtitles — Add Captions to Video | VideoText',
    description:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. Sign up for free to try.',
    h1: 'Video with Subtitles — Add Captions to Video',
    intro:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. Sign up for free to try.',
    breadcrumbLabel: 'Video with Subtitles',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/compress-video', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-with-subtitles',
    faq: [
      { q: 'How do I add subtitles to a video permanently?', a: 'Upload your video (MP4, MOV, AVI, WebM, or MKV) and your SRT or VTT subtitle file. Our tool burns the captions into the video frames so they are always visible, and you download a single MP4 with subtitles permanently embedded. No video editing software or timeline work required.' },
      { q: 'Is adding subtitles to video free?', a: 'Yes. Free tier is available after signing up for free. Upload your video and subtitle file and download the output with captions burned in at no cost within the monthly free limit. Paid plans start at $19/month for 450 minutes if you need to process more videos per month.' },
      { q: 'What video formats are supported for adding subtitles?', a: 'MP4, MOV, AVI, WebM, and MKV are all accepted. The output file is an MP4, which is compatible with YouTube, Vimeo, Instagram, TikTok, and every major platform and device. If your original file is MOV or AVI, the output MP4 is ready for direct upload anywhere.' },
    ],
  },
  {
    path: '/video-compressor',
    title: 'Video Compressor — Reduce File Size Online | VideoText',
    description:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. Sign up for free to try.',
    h1: 'Video Compressor — Reduce File Size Online',
    intro:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. Sign up for free to try.',
    breadcrumbLabel: 'Video Compressor',
    toolKey: 'compress-video',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-compressor',
    faq: [
      { q: 'Is the video compressor free?', a: 'Yes. Free tier is available after signing up for free. Upload your video, choose a compression level, and download the smaller file at no cost within the monthly free limit. Paid plans unlock higher file size limits and priority processing so compressed videos are ready faster.' },
      { q: 'How much can I reduce video file size?', a: 'Light compression reduces file size by approximately 30%, medium by about 50%, and heavy by about 70%. You choose the compression level before processing. Heavier compression means a smaller file at a slightly lower bitrate, which is usually acceptable for web sharing and social media.' },
      { q: 'Does compression reduce video quality?', a: 'Compression reduces file size by lowering the bitrate, which can reduce visual quality at higher compression levels. Light compression is nearly lossless for most content. Heavy compression is suitable for social sharing where fast loading matters more than maximum resolution. Output remains reasonable for web use.' },
    ],
  },
  {
    path: '/reduce-video-size',
    title: 'Reduce Video Size — Compress Without Losing Quality | VideoText',
    description:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
    h1: 'Reduce Video Size — Compress Without Losing Quality',
    intro:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
    breadcrumbLabel: 'Reduce Video Size',
    toolKey: 'compress-video',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'reduce-video-size',
    faq: [
      { q: 'Is reducing video file size free?', a: 'Yes. Free tier is available after signing up for free. Upload your video, select a compression level, and download the reduced file at no cost. Paid plans support larger input files and priority processing, which is useful for high-resolution footage or large batches of content.' },
      { q: 'What compression levels are available to reduce video size?', a: 'Light, medium, and heavy compression levels. Light reduces file size by around 30% with minimal quality loss — good for keeping originals sharp. Medium (about 50% smaller) suits web use. Heavy (about 70% smaller) is ideal for social media sharing where fast upload and load times matter most.' },
      { q: 'What video formats are supported for reducing file size?', a: 'MP4, MOV, AVI, WebM, and MKV are all accepted. The output file is always an MP4, which is universally compatible with YouTube, Vimeo, Instagram, TikTok, and every major platform. If your original is a MOV or AVI, the smaller output MP4 is ready for direct upload.' },
    ],
  },
  {
    path: '/batch-video-processing',
    title: 'Batch Video Processing — Multiple Videos at Once | VideoText',
    description:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans. Same tool as Batch Process.',
    h1: 'Batch Video Processing — Multiple Videos at Once',
    intro:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans.',
    breadcrumbLabel: 'Batch Video Processing',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'batch-video-processing',
    faq: [
      { q: 'Is batch video processing free?', a: 'Batch processing is available on Pro and Agency plans. Free and Basic plans use single-file tools. Pro supports up to 20 videos per batch with a 60-minute total duration. Agency supports up to 100 videos with a 300-minute total, which covers full content calendars and client workflows.' },
      { q: 'What do I get from batch video processing?', a: 'Upload multiple videos in one session and receive a single ZIP file containing one SRT subtitle file per video, named to match your original filenames. Videos are processed in parallel workers — not sequentially — so a batch of 10 videos typically completes faster than processing them one by one.' },
      { q: 'Can I choose the language for batch processing?', a: 'Yes. Set the spoken language when starting the batch for best accuracy. Multi-language output — where each video gets subtitle files in two or more languages simultaneously — is available on Agency plans, which is useful for content localization workflows serving international audiences.' },
    ],
  },
  {
    path: '/bulk-subtitle-export',
    title: 'Bulk Subtitle Export — SRT for Many Videos | VideoText',
    description:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download ZIP. Pro+ plans. Same tool as Batch Process.',
    h1: 'Bulk Subtitle Export — SRT for Many Videos',
    intro:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download one ZIP. Pro and Agency plans.',
    breadcrumbLabel: 'Bulk Subtitle Export',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'bulk-subtitle-export',
    faq: [
      { q: 'What is bulk subtitle export?', a: 'Upload multiple videos and get SRT subtitle files for all of them in one ZIP. Same as Batch Processing.' },
      { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans. Free and Basic use single-file tools.' },
      { q: 'What format are the files?', a: 'SRT. One SRT per video in the ZIP.' },
    ],
  },
  {
    path: '/bulk-transcript-export',
    title: 'Bulk Transcript Export — Text for Many Videos | VideoText',
    description:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro+ plans. Same tool as Batch Process.',
    h1: 'Bulk Transcript Export — Text for Many Videos',
    intro:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro and Agency plans.',
    breadcrumbLabel: 'Bulk Transcript Export',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'bulk-transcript-export',
    faq: [
      { q: 'What is bulk transcript export?', a: 'Upload multiple videos and get transcript/subtitle output for all in one ZIP. Same as Batch Processing.' },
      { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans.' },
      { q: 'What do I get in the ZIP?', a: 'One SRT (or equivalent) per video. You can use each file as transcript or captions.' },
    ],
  },
  {
    path: '/bulk-video-transcription',
    title: 'Bulk Video Transcription — Transcribe Multiple Videos at Once | VideoText',
    description:
      'Transcribe multiple videos in one upload. Bulk video transcription and batch subtitle generation: upload many files, download one ZIP. Pro & Agency plans. Same workflow as Batch Process.',
    h1: 'Bulk Video Transcription — Multiple Videos, One Batch',
    intro:
      'Transcribe multiple videos at once or generate subtitles for a whole folder in a single run. Upload many MP4/MOV files, set the spoken language once, and download a ZIP with one SRT per video — ideal for bulk video transcription, batch subtitle generation, and creator pipelines. Available on Pro and Agency plans.',
    breadcrumbLabel: 'Bulk Video Transcription',
    toolKey: 'batch-process',
    relatedSlugs: ['/batch-process', '/video-to-transcript', '/video-to-subtitles', '/bulk-subtitle-export'],
    indexable: true,
    intentKey: 'bulk-video-transcription',
    faq: [
      {
        q: 'How do I transcribe multiple videos at once?',
        a: 'Use VideoText Batch Process: upload several videos in one session, choose transcript or subtitle output, and download a single ZIP with one file per video. Pro supports up to 20 videos per batch; Agency supports larger batches for teams and agencies.',
      },
      {
        q: 'What is bulk video transcription?',
        a: 'Bulk video transcription means processing many video files in one job instead of uploading one at a time. You get consistent naming, one ZIP download, and parallel processing so a batch of videos finishes faster than sequential uploads.',
      },
      {
        q: 'Can I use this for batch subtitle generation?',
        a: 'Yes. Batch Process generates timed subtitles (SRT) for each video in your upload. You can also run bulk transcript export if you need plain text. Multi-language batch output is available on higher plans for localization workflows.',
      },
      {
        q: 'Is bulk transcription free?',
        a: 'Batch processing is available on Pro and Agency plans. Free and Basic plans use single-file transcription and subtitle tools. Upgrade when you need to transcribe multiple videos at once or run batch subtitle generation regularly.',
      },
    ],
  },
  {
    path: '/subtitles-vs-closed-captions',
    title: 'Subtitles vs Closed Captions — What\'s the Difference? | VideoText',
    description:
      'Subtitles vs closed captions: subtitles transcribe speech for language access; closed captions include all audio cues for deaf/HOH viewers. Generate either free with VideoText — sign up for free.',
    h1: 'Subtitles vs Closed Captions — What\'s the Difference?',
    intro:
      'Subtitles and closed captions look similar but serve different purposes. Subtitles transcribe or translate speech for viewers who can hear but don\'t understand the language. Closed captions include all audio cues — speech, speaker labels, and sound effects — for deaf and hard-of-hearing viewers. VideoText generates both: upload a video and download SRT or VTT caption files in seconds. Free. Sign up for free to try. VideoText supports subtitles vs closed captions and related tools. VideoText supports subtitles vs closed captions and related tools.',
    breadcrumbLabel: 'Subtitles vs Closed Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/closed-caption-generator', '/caption-generator'],
    indexable: true,
    intentKey: 'subtitles-vs-closed-captions',
    faq: [
      { q: 'What is the difference between subtitles and closed captions?', a: 'Subtitles transcribe or translate speech for viewers who can hear but don\'t speak the language. Closed captions add non-speech audio descriptions (e.g., [music], [applause]) for deaf and hard-of-hearing viewers.' },
      { q: 'Which should I use — subtitles or closed captions?', a: 'Use closed captions for accessibility compliance and to reach deaf/HOH viewers. Use subtitles for foreign language audiences or viewers watching without sound.' },
      { q: 'How do I generate subtitles or closed captions?', a: 'Upload your video to VideoText. Our AI generates a timed SRT or VTT file in seconds — upload it to YouTube, Vimeo, or any platform as subtitles or closed captions.' },
      { q: 'Do subtitles and closed captions use the same file format?', a: 'Yes. Both use SRT or VTT files. The difference is in the content and labeling, not the file format. SRT is most widely supported.' },
    ],
  },
  // ── Transcription variants ──────────────────────────────────────────────────
  {
    path: '/transcribe-video',
    title: 'Transcribe Video Online – Free & Accurate | VideoText',
    description:
      'Transcribe video to text online, free. Upload MP4, MOV, WebM, or AVI and get an accurate transcript in seconds. View in English, Hindi, Spanish, Chinese, Russian, or Telugu. Sign up for free to try.',
    h1: 'Transcribe Video Online',
    intro:
      'Transcribe any video to text in seconds. Upload your video file — MP4, MOV, AVI, or WebM — and get an accurate, readable transcript powered by AI. View the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers for who-said-what, Summary for key points, and Chapters to jump by section. Sign up for free to try.',
    breadcrumbLabel: 'Transcribe Video',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-text', '/mp4-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'transcribe-video',
    faq: [
      { q: 'Is it free to transcribe a video online?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st) after signing up for free — just upload and go. Create a free account to track usage across browser sessions. Paid plans start at $19/month for 450 minutes, which covers most creators and small teams processing regular content.' },
      { q: 'What video formats can I transcribe?', a: 'MP4, MOV, AVI, WebM, and MKV are all supported. Upload your file and our AI extracts the speech track and converts it to plain text. If your file is in another format, export it to MP4 first using any video editor — most cameras and screen recorders produce MP4 or MOV natively.' },
      { q: 'How accurate is online video transcription?', a: 'Accuracy is high for clear audio with minimal background noise. We use AI speech recognition trained on diverse speakers, accents, and subjects. For best results, set the spoken language manually rather than relying on auto-detect, and trim the video to remove long silent sections before uploading.' },
      { q: 'Can I get the video transcript in another language?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original transcript. You can switch between all six languages instantly without re-uploading, which is useful for creating meeting notes in multiple languages.' },
    ],
  },
  {
    path: '/video-transcription',
    title: 'Video Transcription Online – Accurate & Fast | VideoText',
    description:
      'Free video transcription online. Upload any video and get a text transcript in seconds. Supports MP4, MOV, AVI, WebM. View in 6 languages. Summary, speakers, chapters included. Sign up for free to try.',
    h1: 'Video Transcription Online',
    intro:
      'Get accurate video transcription online — free. Upload any video and receive a plain-text transcript in seconds. After transcribing, use the Speakers branch for speaker labels, Summary for key points, or Chapters to jump by section. Translate to English, Hindi, Telugu, Spanish, Chinese, or Russian in one click. Sign up for free to try.',
    breadcrumbLabel: 'Video Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'video-transcription',
    faq: [
      { q: 'What is video transcription?', a: 'Video transcription is the process of converting spoken words in a video into written text using AI speech recognition. You upload a video file, and the transcription engine extracts the audio track, detects speech, and produces a readable plain-text transcript aligned to the timing of the original recording.' },
      { q: 'Is online video transcription free?', a: 'Yes. The free tier gives you 3 imports per month (resets on the 1st) after signing up for free. Create a free account to track usage across sessions. Paid plans start at $19/month for 450 minutes and include multi-language output, speaker diarization, and export in additional formats.' },
      { q: 'How long does video transcription take?', a: 'Most videos are fully transcribed in 30–90 seconds. You see the transcript building in real time as each segment completes — you do not wait for the entire job before reading results. A 60-minute video typically finishes in 5–8 minutes, depending on queue load.' },
      { q: 'Can I download the video transcript?', a: 'Yes. Click Download after transcribing to save the transcript as a plain text file, or click Copy to grab the full text to clipboard. Paid plans unlock additional export formats: JSON, CSV, Markdown, and Notion-style structured output with sections for summary, speakers, chapters, and keywords.' },
    ],
  },
  {
    path: '/free-transcription',
    title: 'Free Transcription Online – Sign Up to Try | VideoText',
    description:
      'Free video transcription. Sign up for free to try. Upload video and get a text transcript in seconds. 3 imports/month free tier (resets on the 1st). AI-powered. MP4, MOV, AVI, WebM supported.',
    h1: 'Free Transcription Online',
    intro:
      'Get a free transcript from any video — sign up for free. Upload an MP4, MOV, AVI, or WebM, and our AI transcribes the speech into text in seconds. The free tier gives you 3 imports per month (resets on the 1st) with no credit card required. Sign up when you need more minutes or multi-language output.',
    breadcrumbLabel: 'Free Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/ai-transcription'],
    indexable: true,
    intentKey: 'free-transcription',
    faq: [
      { q: 'Is transcription really free?', a: 'Yes. You get 3 imports per month (resets on the 1st) after signing up for free. No credit card needed to try.' },
      { q: 'What formats are supported for free?', a: 'MP4, MOV, AVI, WebM, and MKV. All formats are available on the free tier.' },
      { q: 'What is the free tier limit?', a: '3 imports per month (resets on the 1st), single language output. Sign up for a plan to unlock more minutes and multi-language support.' },
      { q: 'Do I need to install anything?', a: 'No. The tool runs in your browser. Upload your file and get a transcript — no installation required.' },
    ],
  },
  {
    path: '/online-transcription',
    title: 'Online Transcription – Free Video to Text | VideoText',
    description:
      'Online transcription for video files. Upload MP4, MOV, or WebM and get a text transcript in seconds. AI-powered, free tier. Sign up for free to try. Works for meetings, lectures, interviews.',
    h1: 'Online Transcription – Free Video to Text',
    intro:
      'Transcribe video to text online — free. Upload any video file and get a transcript in seconds. Works for meetings, lectures, interviews, podcasts, and more. View in 6 languages and use built-in Speakers, Summary, and Chapters for structured output. No software to install, sign up for free.',
    breadcrumbLabel: 'Online Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/free-transcription', '/transcribe-video', '/meeting-transcript'],
    indexable: true,
    intentKey: 'online-transcription',
    faq: [
      { q: 'Does this work in any browser?', a: 'Yes. The tool is browser-based. No download or plugin required. Works in Chrome, Firefox, Safari, and Edge.' },
      { q: 'What is online transcription?', a: 'Online transcription converts speech in a video file into text using AI — directly in your browser, without installing software.' },
      { q: 'Is there a file size limit?', a: 'Large files are supported. Check the upload zone for the current limit. You can also trim the video to focus on the segment you need.' },
      { q: 'Can I translate the transcript online?', a: 'Yes. After transcribing, click Translate to switch between English, Hindi, Telugu, Spanish, Chinese, or Russian — no extra upload needed.' },
    ],
  },
  {
    path: '/ai-transcription',
    title: 'AI Transcription – Fast, Accurate Video to Text | VideoText',
    description:
      'AI-powered video transcription. Upload your video and get a text transcript in seconds. Accurate speech recognition for interviews, meetings, lectures, and more. Free tier. Sign up for free to try.',
    h1: 'AI Transcription – Video to Text',
    intro:
      'VideoText uses AI speech recognition to transcribe your video in seconds. Upload any video, get a plain-text transcript, then use Speakers, Summary, Chapters, or Keywords for structured insight. Translate to 6 languages with a single click. Free tier. Sign up for free to try — no software to install.',
    breadcrumbLabel: 'AI Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/video-transcription'],
    indexable: true,
    intentKey: 'ai-transcription',
    faq: [
      { q: 'How does AI transcription work?', a: 'We run your video through AI speech recognition models that detect spoken words and produce text with high accuracy, even for technical content and accents.' },
      { q: 'Is AI transcription more accurate than manual?', a: 'For clear audio, AI transcription is very accurate and far faster than manual. You can review and edit the result afterward.' },
      { q: 'What languages does the AI support?', a: 'The AI supports many spoken languages. Set the spoken language for best results, or use auto-detect.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
    ],
  },
  {
    path: '/audio-to-text',
    title: 'Audio to Text – Transcribe Audio or Video Online | VideoText',
    description:
      'Convert audio to text online. Upload a video file (MP4, MOV, AVI, WebM) to transcribe the audio track to text. Free, AI-powered. Sign up for free to try. Works for interviews, meetings, podcasts.',
    h1: 'Audio to Text – Transcribe Audio Online',
    intro:
      'Turn audio into text online — free. Upload a video file containing your audio (MP4, MOV, AVI, or WebM) and get an accurate text transcript in seconds. Our AI extracts the speech and delivers a clean, readable transcript. View in 6 languages and download or copy the result. No signup for the free tier.',
    breadcrumbLabel: 'Audio to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/podcast-transcript'],
    indexable: true,
    intentKey: 'audio-to-text',
    faq: [
      { q: 'Can I transcribe audio files to text?', a: 'Yes. Upload your audio packaged as a video file — MP4, MOV, AVI, or WebM. Most recordings, podcasts, and interviews are shared in video containers that hold an audio track. If you have an audio-only file (MP3, WAV), export it to MP4 using any free converter before uploading.' },
      { q: 'What audio formats are supported for transcription?', a: 'We accept audio packaged in video containers: MP4, MOV, AVI, WebM, and MKV. These formats cover the vast majority of podcast recordings, interview files, Zoom exports, and screen recordings. The tool extracts the audio track and transcribes it — video resolution and bitrate do not affect speed or accuracy.' },
      { q: 'Is audio-to-text transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. Just upload your file and get a transcript immediately. Paid plans start at $19/month for 450 minutes and add multi-language output, speaker labels, summary, and export formats including JSON, CSV, and Markdown.' },
      { q: 'Can I translate transcribed audio to another language?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated transcript appears alongside the original. This is useful for meetings, interviews, or podcast content that needs to reach audiences in multiple languages without re-recording.' },
    ],
  },
  {
    path: '/podcast-transcript',
    title: 'Podcast Transcript – Transcribe Episodes Online | VideoText',
    description:
      'Get a transcript for any podcast episode. Upload your episode as an audio or video file and get accurate text in seconds. Free, AI-powered. Speaker labels, show notes, SRT export.',
    h1: 'Podcast Transcript — Transcribe Episodes Online',
    intro:
      'Create a podcast transcript in seconds. Upload your episode as an audio or video file (MP3, WAV, MP4, MOV) and get an accurate text transcript powered by Whisper AI. Use the Speakers branch to label who said what, Summary for automated show notes, Chapters to index by topic, and Translate to share across 6 languages. Free tier.',
    breadcrumbLabel: 'Podcast Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/mp3-to-text', '/interview-transcription', '/riverside-transcription'],
    indexable: true,
    intentKey: 'podcast-transcript',
    faq: [
      { q: 'Can I transcribe a podcast episode to text?', a: 'Yes. Upload your podcast episode as MP3, WAV, MP4, MOV, or WebM and get a full text transcript in seconds. Most podcast recording tools (Riverside, Squadcast, Zoom, Descript) export to MP4, MOV, or MP3. The AI extracts the speech and produces a clean, readable transcript.' },
      { q: 'Do I get speaker labels in a podcast transcript?', a: 'Yes. After transcribing, open the Speakers branch to see the transcript organized by speaker (Speaker 1, Speaker 2, etc.). For a two-host podcast, this cleanly separates each host\'s contributions. For interview formats, it labels the interviewer and guest without any manual tagging.' },
      { q: 'How do I use podcast transcripts for SEO?', a: 'Add the full transcript to your episode show notes page as body text (not a PDF). Search engines index text, not audio, so a full transcript makes every word you said searchable. This dramatically improves long-tail keyword discovery for each episode — listeners searching for topics you covered can find your episode via Google.' },
      { q: 'Can I generate podcast show notes automatically?', a: 'Yes. After transcribing, open the Summary branch. It extracts key topics, main points, and decisions automatically. Copy the summary output directly into your podcast platform as show notes. Most podcasters find this covers 80% of their show notes writing with one click.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. Most podcast episodes fit within this limit. Paid plans start at $19/month for 450 minutes, suitable for weekly podcasters transcribing every episode.' },
      { q: 'Can I compare Descript vs VideoText for podcast transcription?', a: 'Descript combines recording, editing, and transcription in one video editor. VideoText is a dedicated transcription tool — faster to use for transcription-only tasks, lower cost for teams who do not need video editing, and produces richer metadata outputs (chapters, keywords, keyword index). If you already record and edit elsewhere, VideoText adds transcription without a second subscription to a full editor.' },
      { q: 'Can I transcribe a podcast and get SRT subtitles?', a: 'Yes. After generating the transcript, use the Video to Subtitles tool with the same file to produce an SRT or VTT subtitle file. Useful for publishing podcast clips to YouTube or social media with captions.' },
    ],
  },
  {
    path: '/zoom-recording-transcript',
    title: 'Zoom Recording Transcript – Convert Calls to Text | VideoText',
    description:
      'Transcribe Zoom recordings to text. Upload your Zoom MP4 and get a transcript with speaker labels, action items, and chapter navigation. Free. No Zoom integration required.',
    h1: 'Zoom Recording Transcript — Convert Calls to Text',
    intro:
      'Transcribe any Zoom recording to text in seconds. Download your meeting as MP4 from Zoom, upload it here, and get a full transcript. Use the Speakers branch for who-said-what, Summary for action items and decisions, and Chapters to jump by section. No Zoom account integration required. Free tier.',
    breadcrumbLabel: 'Zoom Recording Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/google-meet-transcript', '/teams-meeting-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'zoom-recording-transcript',
    faq: [
      { q: 'How do I transcribe a Zoom recording to text?', a: 'Download your Zoom meeting as an MP4 file — from Zoom\'s cloud recording page or the local Zoom recordings folder on your computer. Upload the MP4 here and our AI produces a full text transcript. Most 60-minute Zoom calls transcribe in 5–8 minutes. No Zoom account connection or integration is required.' },
      { q: 'Does it label speakers from a Zoom call?', a: 'Yes. After transcribing, open the Speakers branch to see the transcript organized by speaker turn (Speaker 1, Speaker 2, etc.). This works well for Zoom calls with two to six participants. For the clearest speaker separation, use a Zoom recording where each participant has a separate audio track if available.' },
      { q: 'Can I get a summary of the Zoom meeting transcript?', a: 'Yes. The Summary branch automatically extracts decisions, action items, and key points from the transcript. This is useful for generating meeting notes immediately after a call — copy the summary and send it to attendees without reading through the full transcript manually.' },
      { q: 'How do I download a Zoom cloud recording as MP4?', a: 'Log into your Zoom account at zoom.us → Recordings → Cloud Recordings. Find the meeting and click the download icon next to the MP4 entry. If the recording is on your local machine, find it in Documents/Zoom on Mac or C:\\Users\\[name]\\Documents\\Zoom on Windows.' },
      { q: 'Does it work without Zoom\'s built-in transcription feature?', a: 'Yes. Zoom\'s built-in transcription requires a Business or Enterprise account and must be enabled before the meeting. VideoText works from any Zoom MP4 recording regardless of your Zoom plan — upload the file and get a transcript immediately.' },
      { q: 'Can I compare Zoom vs Google Meet vs Teams recordings?', a: 'All three recording formats (Zoom MP4, Google Meet MP4, Teams MP4) are supported equally. The transcript quality is the same across platforms — it depends on audio quality of the recording, not the source platform.' },
      { q: 'Is Zoom recording transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. A typical 30–60 minute Zoom call fits within this limit. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/interview-transcription',
    title: 'Interview Transcription – Convert Interviews to Text | VideoText',
    description:
      'Transcribe interview recordings to text online. Upload video or audio of your interview and get an accurate transcript with speaker labels. Free tier. Journalists, researchers, HR teams.',
    h1: 'Interview Transcription — Convert Interviews to Text',
    intro:
      'Transcribe interviews to text online — accurately and quickly. Upload your interview video (MP4, MOV, AVI, or WebM) or audio (MP3, WAV, M4A) and get a clean transcript in seconds. Use the Speakers branch to separate interviewer and interviewee, and Translate to share the transcript in 6 languages. Perfect for journalists, researchers, HR teams, and documentary filmmakers. Free tier.',
    breadcrumbLabel: 'Interview Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/speaker-diarization', '/podcast-transcript', '/zoom-recording-transcript', '/mp3-to-text'],
    indexable: true,
    intentKey: 'interview-transcription',
    faq: [
      { q: 'Can I transcribe an interview with two speakers?', a: 'Yes. After transcribing, open the Speakers branch. Speech is grouped by speaker turn (Speaker 1, Speaker 2, etc.) so you can clearly see who said what. For interviews with multiple participants, speakers beyond two are also labeled separately.' },
      { q: 'What formats are supported for interview recordings?', a: 'Video: MP4, MOV, AVI, WebM, MKV. Audio: MP3, WAV, M4A, AAC, OGG, FLAC. Most camera, phone, and screen-recording formats used in interviews are covered — upload directly without converting.' },
      { q: 'Is interview transcription accurate enough for journalism?', a: 'Yes. VideoText uses Whisper large-v3, which achieves around 3–8% Word Error Rate on clear speech. For journalistic use, always review the transcript against the recording before publishing — AI transcription may mishear proper nouns, technical terms, or overlapping speech. The transcript speeds up the review process but does not replace a final check.' },
      { q: 'Can I transcribe recorded phone interviews?', a: 'Yes. Phone recordings (typically MP3 or M4A from call recording apps) transcribe well, though audio quality is lower than in-person recordings. Clear speech at standard phone quality (8kHz voice codec) transcribes with reasonable accuracy. Higher-quality VOIP recordings (Zoom, Teams) give better results.' },
      { q: 'What are the legal considerations for transcribing interviews?', a: 'Legality of recording and transcribing varies by jurisdiction. In the US, one-party consent states allow recording with one party\'s knowledge; two-party consent states require all participants to consent. Always check local laws and inform interview subjects if required. VideoText processes and deletes your files — it does not retain transcribed content.' },
      { q: 'Is interview transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
      { q: 'Can I export the interview transcript in different formats?', a: 'Yes. Download as plain TXT, or export as SRT/VTT for timed captions. Paid plans add JSON and CSV export for structured data workflows.' },
    ],
  },
  {
    path: '/lecture-transcription',
    title: 'Lecture Transcription – Convert Lectures to Text | VideoText',
    description:
      'Transcribe lecture recordings to text online. Upload a lecture video or audio file and get an accurate transcript with chapters, keywords, and topic index. Free AI-powered. Students, educators.',
    h1: 'Lecture Transcription — Convert Lectures to Text',
    intro:
      'Transcribe lecture recordings to text — fast and accurate. Upload your lecture video (MP4, MOV, WebM) or audio (MP3, WAV) and get a full transcript powered by Whisper AI. Use Keywords to index every topic, Chapters to navigate by section, and Translate to share in 6 languages. Free tier — perfect for students, educators, and researchers.',
    breadcrumbLabel: 'Lecture Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/keyword-indexed-transcript', '/video-chapters-generator', '/transcribe-video', '/mp3-to-text'],
    indexable: true,
    intentKey: 'lecture-transcription',
    faq: [
      { q: 'Can I transcribe a university lecture?', a: 'Yes. Upload the lecture recording (MP4, MOV, WebM, MP3, WAV) and get a full text transcript. Works well for recorded talks, presentation recordings, Zoom class sessions, and physical classroom recordings.' },
      { q: 'Does it extract lecture topics automatically?', a: 'Yes. Open the Keywords branch after transcribing to see repeated terms and concepts indexed by where they appear in the transcript. The Chapters branch breaks the lecture into navigable sections based on topic shifts — useful for studying specific parts without listening to the whole recording.' },
      { q: 'How can students use lecture transcripts for studying?', a: 'Paste the transcript into your note-taking app (Notion, Obsidian, Google Docs) and highlight key concepts. Use the Keywords branch to find where specific terms are discussed. Use the Chapters branch to review particular sections. The full text is also searchable — Ctrl+F for any term the professor mentioned.' },
      { q: 'Can professors use transcripts for accessibility compliance?', a: 'Yes. Under ADA and Section 508 requirements, video content in educational settings should be accompanied by captions or transcripts for deaf and hard-of-hearing students. VideoText generates both — use the SRT for captioned video or TXT for a standalone transcript document.' },
      { q: 'Is this free for students?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Most students can transcribe all their key lectures within the free tier.' },
      { q: 'What lecture recording formats are supported?', a: 'MP4, MOV, WebM, MKV, AVI (video) and MP3, WAV, M4A, AAC (audio). Zoom lecture recordings, Loom recordings, and screen-captured lecture videos all work.' },
    ],
  },
  // ── Format-specific transcription ───────────────────────────────────────────
  {
    path: '/mov-to-text',
    title: 'MOV to Text – Transcribe MOV Video Online | VideoText',
    description:
      'Convert MOV video to text online. Upload your MOV file and get an accurate transcript in seconds. Free, AI-powered. Sign up for free to try. View in English, Hindi, Spanish, and more.',
    h1: 'MOV to Text – Transcribe MOV Videos Online',
    intro:
      'Convert MOV video to text online — free. Upload your MOV file from iPhone, Mac, or any camera and get an accurate transcript in seconds. View the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. No signup for the free tier.',
    breadcrumbLabel: 'MOV to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/transcribe-video'],
    indexable: true,
    intentKey: 'mov-to-text',
    faq: [
      { q: 'Can I convert MOV to text?', a: 'Yes. Upload your MOV file and we transcribe the speech to text. MOV is the default format for iPhone and Mac recordings.' },
      { q: 'Is there a file size limit for MOV files?', a: 'Large MOV files are supported; check the upload zone for the current limit. Trim the video to a segment if needed.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I get subtitles from my MOV file?', a: 'Yes. Use the Video to Subtitles tool (also supports MOV) to generate SRT or VTT subtitle files from your MOV video.' },
    ],
  },
  {
    path: '/webm-to-text',
    title: 'WebM to Text – Transcribe WebM Video Online | VideoText',
    description:
      'Convert WebM video to text online. Upload your WebM file and get an accurate transcript in seconds. Free, AI-powered. Sign up for free to try.',
    h1: 'WebM to Text – Transcribe WebM Videos Online',
    intro:
      'Convert WebM video to text online — free. Upload your WebM file (from Chrome, screen recorders, or web exports) and get an accurate text transcript in seconds. Translate to 6 languages. No signup for the free tier.',
    breadcrumbLabel: 'WebM to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/transcribe-video'],
    indexable: true,
    intentKey: 'webm-to-text',
    faq: [
      { q: 'Can I transcribe a WebM file?', a: 'Yes. WebM is a supported format. Upload your file and get a text transcript in seconds.' },
      { q: 'Where do WebM files come from?', a: 'WebM is common in screen recordings from Chrome, video editors, and web-based recording tools.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I convert WebM to SRT subtitles?', a: 'Yes. Use the Video to Subtitles tool, upload your WebM file, and choose SRT or VTT format for a timed caption file.' },
    ],
  },
  // ── Subtitle/Caption variants ────────────────────────────────────────────────
  {
    path: '/automatic-subtitles',
    title: 'Automatic Subtitles – AI-Generated Captions Online | VideoText',
    description:
      'Generate automatic subtitles for any video. Upload and get AI-generated SRT or VTT captions in seconds. Free tier. Sign up for free to try. Works for YouTube, web, and social media.',
    h1: 'Automatic Subtitles – AI-Generated Captions',
    intro:
      'Generate automatic subtitles for any video in seconds. Upload your video and our AI creates accurate, timed SRT or VTT captions ready for YouTube, web players, or social media. Supports multiple languages. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Automatic Subtitles',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/caption-generator', '/video-to-srt'],
    indexable: true,
    intentKey: 'automatic-subtitles',
    faq: [
      { q: 'How accurate are automatic subtitles?', a: 'Automatic subtitles generated by our AI are highly accurate for clear audio. We use state-of-the-art speech recognition trained on diverse speakers, accents, and topics. For best accuracy, set the spoken language manually rather than relying on auto-detect, and ensure the audio has minimal background noise or music.' },
      { q: 'Should I choose SRT or VTT for automatic subtitles?', a: 'Choose SRT for YouTube, Vimeo, LinkedIn, Facebook Video, and most video platforms — SRT is the most widely supported subtitle format. Choose VTT if you are embedding video on a website using an HTML5 player like Video.js or Plyr. Both formats are generated from the same upload at no extra cost.' },
      { q: 'Are automatic subtitles free to generate?', a: 'Yes. The free tier is available after signing up for free — upload a video and download SRT or VTT subtitles at no cost within the monthly free limit. Paid plans unlock multi-language subtitle output in a single batch and higher minute limits for creators with large video libraries.' },
      { q: 'Can I auto-generate subtitles for YouTube?', a: 'Yes. Generate SRT subtitles from your video here, then go to YouTube Studio → your video → Subtitles → Add → Upload File and select the SRT. YouTube maps the timestamps automatically, and your subtitles appear as a professional CC track — higher accuracy than YouTube\'s own auto-captions for most content.' },
    ],
  },
  {
    path: '/caption-generator',
    title: 'Caption Generator – Auto-Generate Video Captions | VideoText',
    description:
      'Generate captions for any video online. AI-powered caption generator creates SRT or VTT files in seconds. Free tier. Sign up for free to try. Perfect for YouTube, social media, and accessibility.',
    h1: 'Caption Generator – Auto-Generate Video Captions',
    intro:
      'Generate captions for your video automatically. Upload any video file, and our AI creates accurate, timed SRT or VTT captions in seconds. Perfect for YouTube, TikTok, Instagram, and accessibility compliance. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/automatic-subtitles', '/subtitle-generator', '/closed-caption-generator'],
    indexable: true,
    intentKey: 'caption-generator',
    faq: [
      { q: 'What is a caption generator and how does it work?', a: 'A caption generator uses AI speech recognition to transcribe speech in a video and align each word to its timestamp, producing timed caption files in SRT or VTT format. You upload a video file, wait 30–90 seconds, and download captions ready to upload to YouTube, Vimeo, or any platform.' },
      { q: 'Is the caption generator free?', a: 'Yes. Sign up for free to try. You get 3 imports per month (resets on the 1st). Paid plans start at $19/month for 450 minutes, which covers most creators and social media managers processing weekly content.' },
      { q: 'What caption formats does the generator output?', a: 'SRT and VTT, both generated from the same upload at no extra cost. SRT is the best choice for YouTube, Vimeo, LinkedIn, Facebook Video, and most video platforms. VTT is the standard for HTML5 web video players. You choose the format at the point of download — no re-processing needed.' },
      { q: 'Can I burn the generated captions into the video?', a: 'Yes. After generating captions and downloading the SRT or VTT file, upload both the video and the caption file to our Burn Subtitles tool. It hardcodes the captions permanently into the video frames — no software installation required. The output is an MP4 ready for Instagram, TikTok, or any platform.' },
    ],
  },
  {
    path: '/closed-caption-generator',
    title: 'Closed Caption Generator – Create CC for Video | VideoText',
    description:
      'Generate closed captions for any video. Upload and get timed SRT or VTT files in seconds. AI-powered, free tier. Sign up for free to try. Accessible captions for YouTube and web.',
    h1: 'Closed Caption Generator – Accessible Captions Online',
    intro:
      'Create closed captions for any video — free and fast. Upload your video and our AI generates accurate, timed SRT or VTT caption files in seconds. Download and add them to YouTube, Vimeo, or any web player to make your content accessible to deaf and hard-of-hearing viewers. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Closed Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/automatic-subtitles', '/subtitles-vs-closed-captions'],
    indexable: true,
    intentKey: 'closed-caption-generator',
    faq: [
      { q: 'What are closed captions and how are they different from subtitles?', a: 'Closed captions are text overlays that viewers can toggle on or off. Unlike subtitles (which only transcribe speech), closed captions include non-speech audio cues like [music], [applause], and speaker identification, making video content accessible to deaf and hard-of-hearing viewers. The "closed" in closed captions means they can be turned off.' },
      { q: 'How do I create closed captions for my video?', a: 'Upload your video to the caption generator here and download an SRT or VTT file in seconds. Then go to your video platform — YouTube Studio, Vimeo, Zoom, or your web player — and upload the caption file. The platform maps the timestamps automatically, adding a CC track viewers can toggle on or off.' },
      { q: 'Is the closed caption generator free?', a: 'Yes. Free tier is available after signing up for free. Upload a video and download an SRT or VTT closed caption file at no cost within the monthly free limit. Paid plans unlock higher minute limits and multi-language closed caption output for content that needs to be accessible in multiple languages.' },
      { q: 'Which platforms accept closed caption files?', a: 'YouTube, Vimeo, Zoom, Facebook Video, LinkedIn, Twitter/X, and most web players with HTML5 video support SRT or VTT closed caption files. For web players like Video.js and Plyr, use VTT. For all other platforms including YouTube, SRT is the recommended and most widely compatible format.' },
    ],
  },
  {
    path: '/free-subtitle-generator',
    title: 'Free Subtitle Generator – Sign Up to Try | VideoText',
    description:
      'Generate subtitles free online. Upload video and get accurate SRT or VTT subtitles in seconds. Sign up for free to try. AI-powered, fast, and supports 99 languages.',
    h1: 'Free Subtitle Generator – Sign Up to Try',
    intro:
      'Generate subtitles for free — sign up for free. Upload any video and get accurate, timed SRT or VTT subtitle files in seconds. Our AI supports 99 languages and produces captions ready for YouTube, TikTok, Instagram, and any web player. No credit card. Sign up for free to try.',
    breadcrumbLabel: 'Free Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/automatic-subtitles', '/caption-generator'],
    indexable: true,
    intentKey: 'free-subtitle-generator',
    faq: [
      { q: 'Is the subtitle generator really free?', a: 'Yes. You get 3 imports per month (resets on the 1st) after signing up for free. No credit card needed to try.' },
      { q: 'Do I need to sign up?', a: 'Yes. Sign up for free to try. Upgrade when you need more imports or additional features.' },
      { q: 'What subtitle formats can I download for free?', a: 'SRT and VTT on the free tier. Both are supported by YouTube, Vimeo, and most video platforms.' },
      { q: 'How many languages does the free tier support?', a: 'Single language per job on the free tier. Paid plans unlock multi-language subtitle output in one batch.' },
    ],
  },
  {
    path: '/video-to-srt',
    title: 'Video to SRT – Generate SRT Subtitle Files Online | VideoText',
    description:
      'Convert video to SRT subtitle file online. Upload any video and download a timed SRT file in seconds. Free, AI-powered. Sign up for free to try. Perfect for YouTube and video platforms.',
    h1: 'Video to SRT – Generate SRT Subtitle Files',
    intro:
      'Generate an SRT subtitle file from any video in seconds. Upload your video, our AI transcribes the speech and creates a timed SRT file ready to upload to YouTube or any video platform. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Video to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/mp4-to-srt', '/srt-generator', '/automatic-subtitles'],
    indexable: true,
    intentKey: 'video-to-srt',
    faq: [
      { q: 'What is an SRT file?', a: 'An SRT (SubRip Text) file is a plain-text subtitle format that contains numbered caption blocks, each with a start time, end time, and the spoken text. It is the most widely supported subtitle format, accepted by YouTube, Vimeo, VLC, LinkedIn, Facebook Video, and virtually every video platform and editing tool.' },
      { q: 'How do I create an SRT file from a video?', a: 'Upload your video to this tool, select SRT as the output format, and click Generate. Our AI transcribes the speech and creates a timed SRT file with accurate timestamps in seconds. Download the file and upload it directly to YouTube Studio, Vimeo, or any platform that accepts SRT subtitles.' },
      { q: 'Is creating a video-to-SRT file free?', a: 'Yes. Free tier is available after signing up for free. Upload your video and download an SRT subtitle file at no cost within the monthly free limit. Paid plans unlock multi-language SRT output in a single batch, higher minute limits, and priority processing for faster turnaround on longer videos.' },
      { q: 'Can I get VTT instead of SRT from my video?', a: 'Yes. Choose SRT or VTT format before processing — both are generated from the same upload at no extra cost. SRT is recommended for YouTube and most platforms. VTT is the standard for HTML5 web players. Switch between formats at the point of download without re-uploading your video.' },
    ],
  },
  {
    path: '/srt-generator',
    title: 'SRT Generator – Create SRT Subtitle Files from Video | VideoText',
    description:
      'Generate SRT subtitle files from any video. Upload your video and get a timed SRT file in seconds. Free, AI-powered, supports 99 languages. Sign up for free to try.',
    h1: 'SRT Generator – Create SRT Files from Video',
    intro:
      'Generate SRT subtitle files from any video with one click. Upload your video, our AI transcribes the speech with accurate timestamps, and you download an SRT file ready for YouTube, Vimeo, or any platform. Free tier. Sign up for free to try, 70+ languages supported.',
    breadcrumbLabel: 'SRT Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-srt', '/mp4-to-srt', '/subtitle-generator'],
    indexable: true,
    intentKey: 'srt-generator',
    faq: [
      { q: 'What is an SRT generator?', a: 'An SRT generator transcribes speech in a video and creates a properly timed SRT subtitle file automatically. You upload video and download captions.' },
      { q: 'Does it support multiple languages?', a: 'Yes. Set the spoken language before processing for best accuracy. Paid plans output multiple languages in one batch.' },
      { q: 'Is the SRT generator free?', a: 'Yes. Free tier is available after signing up for free.' },
      { q: 'How is SRT different from a plain text transcript?', a: 'SRT files have timestamps that sync text to the video. A transcript is plain text without timing. Use SRT for video platforms; use the transcript for notes or search.' },
    ],
  },
  // ── Video translation variants ───────────────────────────────────────────────
  {
    path: '/translate-video',
    title: 'Translate Video – Video Translation & Subtitles Online | VideoText',
    description:
      'Translate video to another language online. Transcribe and view translated transcript in Hindi, Spanish, Chinese, Russian, and more. Generate translated SRT/VTT subtitles. Free tier.',
    h1: 'Translate Video Online',
    intro:
      'Translate your video to another language — free online. Upload a video, get a transcript, and translate it to English, Hindi, Telugu, Spanish, Chinese, or Russian with one click. Or generate SRT/VTT subtitles and translate the subtitle file to 70+ languages. No signup for the free tier.',
    breadcrumbLabel: 'Translate Video',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-translation', '/subtitle-translator', '/multilingual-subtitles'],
    indexable: true,
    intentKey: 'translate-video',
    faq: [
      { q: 'How do I translate a video to another language?', a: 'Upload your video and transcribe it using the Video to Transcript tool. Click Translate to view the full transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. To translate subtitle files (SRT/VTT), generate subtitles first, then use Translate Subtitles to convert the caption file to any of 70+ languages.' },
      { q: 'Which languages can I translate my video to?', a: 'Transcript translation supports 6 languages: English, Hindi, Telugu, Spanish, Chinese, and Russian — switch between them instantly after transcribing. Subtitle file translation supports 70+ languages including Arabic, French, German, Portuguese, Japanese, Korean, Turkish, and more. Each translation preserves the original timestamps.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available after signing up for free for both transcript translation and subtitle file translation. Paid plans unlock multi-language subtitle output in a single batch — generate translated SRT files in three or more languages from one upload — and higher minute limits for larger video libraries.' },
      { q: 'Does video translation automatically burn subtitles into the video?', a: 'No — translation produces a translated SRT or VTT subtitle file, which you can upload to YouTube or any platform as a caption track. To burn translated captions permanently into the video (for Instagram, TikTok, or silent autoplay), use our Burn Subtitles tool with the translated SRT file.' },
    ],
  },
  {
    path: '/video-translation',
    title: 'Video Translation – Translate Video Content Online | VideoText',
    description:
      'Translate video content to 70+ languages. Transcribe video and view translated transcript in Hindi, Spanish, Chinese, Russian, or English. Export translated SRT/VTT subtitles. Free tier.',
    h1: 'Video Translation Online',
    intro:
      'Translate video content to any language online. Upload your video, get an accurate transcript, then translate it to English, Hindi, Telugu, Spanish, Chinese, or Russian. For subtitle translation, generate SRT or VTT and translate to 70+ languages. Export and burn into the video for multilingual content. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Video Translation',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/translate-video', '/subtitle-translator', '/multilingual-subtitles'],
    indexable: true,
    intentKey: 'video-translation',
    faq: [
      { q: 'What is video translation?', a: 'Video translation converts your video content into another language as text (transcript) or timed captions (SRT/VTT) that can be burned into the video or uploaded to a platform.' },
      { q: 'What languages are supported for video translation?', a: 'Transcript view: 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian). Subtitle file translation: 70+ languages via Translate Subtitles.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available after signing up for free.' },
      { q: 'How do I get translated captions on my video?', a: 'Generate subtitles, translate the SRT/VTT file, then use Burn Subtitles to hardcode the translated captions into the video.' },
    ],
  },
  // ── Phase 2: 30 high-intent SEO pages ──────────────────────────────────────────
  {
    path: '/youtube-transcript-generator',
    title: 'YouTube Transcript Generator – Convert YouTube Video to Text | VideoText',
    description: 'Generate transcripts from YouTube videos instantly. Paste a URL and export SRT, TXT, or DOCX with VideoText.',
    h1: 'YouTube Transcript Generator',
    intro: 'Convert any YouTube video to a transcript with one click. Paste a youtube.com or youtu.be link — no download, no upload. AI transcription in seconds. Export as TXT, SRT, or translate to 70+ languages. Free tier.',
    breadcrumbLabel: 'YouTube Transcript Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/transcribe-youtube-video'],
    indexable: true,
    intentKey: 'youtube-transcript-generator',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I generate a transcript from a YouTube video?', a: 'Paste the YouTube URL into our tool and click Transcribe. We stream the audio and convert it to text with AI. Export as TXT, SRT, or DOCX.' },
      { q: 'Is the YouTube transcript generator free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/video-to-text-converter',
    title: 'Video to Text Converter – Free Online | VideoText',
    description: 'Convert video to text online. Upload MP4, MOV, WebM or paste a YouTube URL. Get accurate transcripts in seconds. Export SRT, TXT, DOCX.',
    h1: 'Video to Text Converter',
    intro: 'Convert any video to text online. Upload your file or paste a YouTube URL. Our AI transcribes speech to text in seconds. Download as TXT, SRT, or view in 6 languages. Free tier.',
    breadcrumbLabel: 'Video to Text Converter',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'video-to-text-converter',
    faq: [
      { q: 'What video formats can I convert to text?', a: 'We support MP4, MOV, AVI, WebM, and MKV. You can also paste a YouTube URL for instant transcription without downloading.' },
      { q: 'How accurate is the video to text conversion?', a: 'Our AI delivers high accuracy for clear speech. Set the spoken language for best results with non-English content.' },
    ],
  },
  {
    path: '/audio-to-text-converter',
    title: 'Audio to Text Converter – Transcribe Online | VideoText',
    description: 'Convert audio to text online. Upload video files (MP4, MOV) containing audio. Get accurate transcripts. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Audio to Text Converter',
    intro: 'Convert audio to text online. Upload a video file (MP4, MOV, AVI, WebM) and our AI transcribes the audio track to text. Export SRT, TXT, or translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Audio to Text Converter',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/podcast-transcript', '/meeting-transcript'],
    indexable: true,
    intentKey: 'audio-to-text-converter',
    faq: [
      { q: 'What audio formats are supported?', a: 'We accept audio in video containers: MP4, MOV, AVI, WebM, MKV. Export MP3/WAV to MP4 first if needed.' },
      { q: 'Is the audio to text converter free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try.' },
    ],
  },
  {
    path: '/transcribe-video-online',
    title: 'Transcribe Video Online – Free AI Transcription | VideoText',
    description: 'Transcribe video online free. Upload any video or paste YouTube URL. Get accurate transcripts. Export SRT, TXT, DOCX. AI-powered. No download.',
    h1: 'Transcribe Video Online',
    intro: 'Transcribe any video online in seconds. Upload MP4, MOV, WebM or paste a YouTube link. Our AI converts speech to text. Export SRT, TXT, or translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Transcribe Video Online',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-transcript', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'transcribe-video-online',
    faq: [
      { q: 'How do I transcribe a video online?', a: 'Upload your video file or paste a YouTube URL. Click Transcribe and get a full text transcript in seconds.' },
      { q: 'Is online video transcription free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free.' },
    ],
  },
  {
    path: '/podcast-transcription',
    title: 'Podcast Transcription – Convert Episodes to Text | VideoText',
    description: 'Transcribe podcast episodes to text. Upload MP4, MOV, WebM. Get accurate transcripts with speaker labels. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Podcast Transcription',
    intro: 'Transcribe podcast episodes to text in seconds. Upload your episode as MP4, MOV, or WebM. Get speaker labels, key takeaways, and translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Podcast Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/audio-to-text', '/interview-transcription'],
    indexable: true,
    intentKey: 'podcast-transcription',
    faq: [
      { q: 'How do I transcribe a podcast?', a: 'Export your episode as MP4 or MOV, upload here, and get a full transcript with speaker labels in seconds.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month. Paid plans for weekly podcasters.' },
    ],
  },
  {
    path: '/webinar-transcription',
    title: 'Webinar Transcription – Convert Webinars to Text | VideoText',
    description: 'Transcribe webinars to text. Upload recording (MP4, MOV). Get accurate transcripts with chapters. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Webinar Transcription',
    intro: 'Transcribe webinar recordings to text. Upload your MP4, MOV, or WebM file. Get a full transcript with chapters and keywords. Export SRT, TXT, or translate. Free tier.',
    breadcrumbLabel: 'Webinar Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/lecture-transcription', '/zoom-recording-transcript'],
    indexable: true,
    intentKey: 'webinar-transcription',
    faq: [
      { q: 'How do I transcribe a webinar?', a: 'Download your webinar as MP4 or MOV, upload here, and get a full transcript in seconds. Works with Zoom, Webex, and other platforms.' },
      { q: 'Can I get speaker labels for webinars?', a: 'Yes. The Speakers branch labels who said what. Use Chapters for section navigation.' },
    ],
  },
  {
    path: '/meeting-transcription',
    title: 'Meeting Transcription – Convert Meetings to Text | VideoText',
    description: 'Transcribe meetings to text. Upload Zoom, Teams, or any recording. Get transcripts with speaker labels. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Meeting Transcription',
    intro: 'Transcribe meeting recordings to text. Upload MP4, MOV, or WebM. Get speaker labels, action items, and key points. Export SRT, TXT. Free tier.',
    breadcrumbLabel: 'Meeting Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/zoom-recording-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'meeting-transcription',
    faq: [
      { q: 'How do I transcribe a meeting recording?', a: 'Upload your meeting file (MP4, MOV, WebM) and get a full transcript with speaker labels in seconds.' },
      { q: 'Does it work with Zoom and Teams?', a: 'Yes. Download the recording as MP4 and upload. No integration required.' },
    ],
  },
  {
    path: '/video-caption-generator',
    title: 'Video Caption Generator – Add Captions to Video | VideoText',
    description: 'Generate captions for video. Upload any video, get SRT/VTT with accurate timestamps. Burn into video or export. Free tier.',
    h1: 'Video Caption Generator',
    intro: 'Generate captions for any video. Upload your file and get SRT or VTT with accurate timestamps. Download for YouTube, Vimeo, or burn into the video. Free tier.',
    breadcrumbLabel: 'Video Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/subtitle-generator', '/burn-subtitles'],
    indexable: true,
    intentKey: 'video-caption-generator',
    faq: [
      { q: 'How do I add captions to my video?', a: 'Upload your video, choose SRT or VTT, and click Generate. Download the caption file or burn it into the video with our Burn tool.' },
      { q: 'Is the caption generator free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/add-subtitles-to-video',
    title: 'Add Subtitles to Video – Auto-Generate SRT | VideoText',
    description: 'Add subtitles to video automatically. Upload video, get SRT/VTT. Burn captions into video or export. AI-powered. Free tier.',
    h1: 'Add Subtitles to Video',
    intro: 'Add subtitles to any video in seconds. Upload your file and our AI generates timed SRT or VTT captions. Download for upload to YouTube, or burn directly into the video. Free tier.',
    breadcrumbLabel: 'Add Subtitles to Video',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/subtitle-generator', '/burn-subtitles'],
    indexable: true,
    intentKey: 'add-subtitles-to-video',
    faq: [
      { q: 'How do I add subtitles to a video?', a: 'Upload your video and generate SRT or VTT. Use Burn Subtitles to hardcode captions into the video, or upload the SRT to YouTube.' },
      { q: 'Can I add subtitles to a video for free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free.' },
    ],
  },
  {
    path: '/auto-subtitle-generator',
    title: 'Auto Subtitle Generator – Generate Subtitles Automatically | VideoText',
    description: 'Auto-generate subtitles for video. Upload, get SRT/VTT with accurate timestamps. No manual typing. AI-powered. Free tier.',
    h1: 'Auto Subtitle Generator',
    intro: 'Generate subtitles automatically from any video. Upload your file and get SRT or VTT with accurate timestamps. No manual typing. Free tier.',
    breadcrumbLabel: 'Auto Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/automatic-subtitles', '/subtitle-generator', '/video-to-srt'],
    indexable: true,
    intentKey: 'auto-subtitle-generator',
    faq: [
      { q: 'How does automatic subtitle generation work?', a: 'Our AI transcribes speech and aligns each word to timestamps. Upload your video and get SRT or VTT in seconds.' },
      { q: 'Is the auto subtitle generator free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/burn-subtitles-into-video',
    title: 'Burn Subtitles into Video – Hardcode Captions | VideoText',
    description: 'Burn subtitles into video. Upload video + SRT/VTT. Get video with captions baked in. For Instagram, TikTok, social. Free tier.',
    h1: 'Burn Subtitles into Video',
    intro: 'Burn subtitles directly into your video. Upload your video and SRT or VTT file. Get a new video with captions hardcoded. Perfect for Instagram, TikTok, and social. Free tier.',
    breadcrumbLabel: 'Burn Subtitles into Video',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/burn-subtitles', '/hardcoded-captions', '/video-with-subtitles'],
    indexable: true,
    intentKey: 'burn-subtitles-into-video',
    faq: [
      { q: 'How do I burn subtitles into a video?', a: 'Upload your video and SRT or VTT file. Our tool renders the captions onto the video. Download the new file.' },
      { q: 'Why burn subtitles into video?', a: 'Burned captions play on any platform without support for caption tracks — Instagram, TikTok, Facebook, etc.' },
    ],
  },
  {
    path: '/youtube-subtitle-generator',
    title: 'YouTube Subtitle Generator – Create Captions from Videos | VideoText',
    description: 'Generate YouTube subtitles. Paste URL or upload video. Get SRT/VTT for YouTube. Accurate timestamps. Free tier.',
    h1: 'YouTube Subtitle Generator',
    intro: 'Generate subtitles for YouTube videos. Paste a YouTube URL or upload your video. Get SRT or VTT with accurate timestamps. Upload to YouTube Studio. Free tier.',
    breadcrumbLabel: 'YouTube Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/subtitle-generator'],
    indexable: true,
    intentKey: 'youtube-subtitle-generator',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I generate subtitles for a YouTube video?', a: 'Paste the YouTube URL and choose SRT. Download the file and upload to YouTube Studio as captions.' },
      { q: 'Can I use this for YouTube Shorts?', a: 'Yes. Shorts URLs are supported. Same process.' },
    ],
  },
  {
    path: '/caption-video-online',
    title: 'Caption Video Online – Add Captions to Video | VideoText',
    description: 'Caption video online. Upload video, get SRT/VTT. Burn or export. AI-powered. Free. No software download.',
    h1: 'Caption Video Online',
    intro: 'Add captions to video online. Upload your file and get SRT or VTT. Burn captions into the video or export for YouTube. No software to install. Free tier.',
    breadcrumbLabel: 'Caption Video Online',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/add-subtitles-to-video', '/video-to-srt'],
    indexable: true,
    intentKey: 'caption-video-online',
    faq: [
      { q: 'How do I caption a video online?', a: 'Upload your video and generate SRT or VTT. Download the caption file or burn it into the video.' },
      { q: 'Is online video captioning free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/generate-subtitles-from-video',
    title: 'Generate Subtitles from Video – SRT/VTT | VideoText',
    description: 'Generate subtitles from video. Upload any video, get SRT/VTT. Accurate timestamps. Export for YouTube, Vimeo. Free tier.',
    h1: 'Generate Subtitles from Video',
    intro: 'Generate subtitles from any video. Upload MP4, MOV, WebM. Get SRT or VTT with accurate timestamps. Export for YouTube, Vimeo, or any platform. Free tier.',
    breadcrumbLabel: 'Generate Subtitles from Video',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/subtitle-generator', '/srt-generator'],
    indexable: true,
    intentKey: 'generate-subtitles-from-video',
    faq: [
      { q: 'How do I generate subtitles from a video?', a: 'Upload your video and choose SRT or VTT. Click Generate. Download the caption file.' },
      { q: 'What subtitle formats are supported?', a: 'SRT and VTT. Both work with YouTube, Vimeo, LinkedIn, and most video platforms.' },
    ],
  },
  {
    path: '/descript-alternative',
    title: 'Descript Alternative – Video Transcription & Editing | VideoText',
    description: 'VideoText as a Descript alternative. Transcribe video, generate subtitles, translate. Fast, private, no data retention. Free tier.',
    h1: 'Descript Alternative',
    intro: 'Looking for a Descript alternative? VideoText transcribes video, generates SRT subtitles, translates captions, and burns them into video. We process and delete your files — no retention. Free tier.',
    breadcrumbLabel: 'Descript Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/transcribe-video', '/otter-ai-alternative', '/happyscribe-alternative'],
    indexable: true,
    intentKey: 'descript-alternative',
    faq: [
      { q: 'How is VideoText different from Descript?', a: 'VideoText focuses on transcription and subtitles. We do not store your data. Process and delete. Fast AI transcription, SRT export, translate, burn.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required.' },
    ],
  },
  {
    path: '/otter-ai-alternative',
    title: 'Otter.ai Alternative – Transcription & Meeting Notes | VideoText',
    description: 'VideoText as an Otter.ai alternative. Transcribe meetings, podcasts, videos. Speaker labels, summary. We don\'t store your data. Free tier.',
    h1: 'Otter.ai Alternative',
    intro: 'Looking for an Otter.ai alternative? VideoText transcribes meetings, podcasts, and videos. Get speaker labels, action items, and key points. We process and delete files — no retention. Free tier.',
    breadcrumbLabel: 'Otter.ai Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/podcast-transcript', '/rev-alternative', '/easyscribe-alternative'],
    indexable: true,
    intentKey: 'otter-ai-alternative',
    faq: [
      { q: 'How does VideoText compare to Otter.ai?', a: 'VideoText transcribes meetings, podcasts, and videos. We don\'t store your data. Upload, transcribe, export. Free tier with 3 imports/month.' },
      { q: 'Can I transcribe Zoom meetings with VideoText?', a: 'Yes. Download your Zoom recording as MP4 and upload. Get a full transcript with speaker labels.' },
    ],
  },
  {
    path: '/rev-alternative',
    title: 'Rev Alternative – Professional Transcription | VideoText',
    description: 'VideoText as a Rev alternative. Fast AI transcription. SRT, TXT, DOCX export. We don\'t store your data. Free tier.',
    h1: 'Rev Alternative',
    intro: 'Looking for a Rev alternative? VideoText offers fast AI transcription for video and audio. Export SRT, TXT, translate subtitles. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Rev Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/audio-to-text', '/trint-alternative'],
    indexable: true,
    intentKey: 'rev-alternative',
    faq: [
      { q: 'How is VideoText different from Rev?', a: 'VideoText uses AI for fast turnaround. We don\'t store your data. Export SRT, TXT, translate. Free tier available.' },
      { q: 'Is VideoText cheaper than Rev?', a: 'VideoText offers a free tier (3 imports/month). Paid plans start at $19 for 450 minutes.' },
    ],
  },
  {
    path: '/trint-alternative',
    title: 'Trint Alternative – Transcription & Subtitles | VideoText',
    description: 'VideoText as a Trint alternative. Transcribe video, generate SRT, translate. Fast AI. No data retention. Free tier.',
    h1: 'Trint Alternative',
    intro: 'Looking for a Trint alternative? VideoText transcribes video and audio, generates SRT subtitles, and translates. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Trint Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/turboscribe-alternative', '/sonix-alternative'],
    indexable: true,
    intentKey: 'trint-alternative',
    faq: [
      { q: 'How does VideoText compare to Trint?', a: 'VideoText offers fast AI transcription, SRT export, and translation. We don\'t store your data. Free tier with 3 imports/month.' },
      { q: 'Can I export SRT from VideoText?', a: 'Yes. Generate subtitles and download SRT or VTT. Upload to any video platform.' },
    ],
  },
  {
    path: '/turboscribe-alternative',
    title: 'TurboScribe Alternative – Fast Transcription | VideoText',
    description: 'VideoText as a TurboScribe alternative. Fast AI transcription. SRT, TXT export. We don\'t store your data. Free tier.',
    h1: 'TurboScribe Alternative',
    intro: 'Looking for a TurboScribe alternative? VideoText transcribes video and audio with AI. Export SRT, TXT, translate. Fast and private. Free tier.',
    breadcrumbLabel: 'TurboScribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/fastest-transcription-tool', '/video-to-transcript', '/transcribe-video'],
    indexable: true,
    intentKey: 'turboscribe-alternative',
    faq: [
      { q: 'How fast is VideoText compared to TurboScribe?', a: 'VideoText transcribes most videos in 30–90 seconds. Real-time streaming of results as segments complete.' },
      { q: 'Does VideoText store my files?', a: 'No. We process and delete. Your content is never stored.' },
    ],
  },
  {
    path: '/happyscribe-alternative',
    title: 'Best Free HappyScribe Alternative – Transcription & Subtitles | VideoText',
    description: 'HappyScribe starts at $17/month with no free tier and no YouTube input. VideoText is free to start — upload video or paste a YouTube URL, get SRT, translate, burn subtitles.',
    h1: 'HappyScribe Alternative',
    intro: 'Looking for a HappyScribe alternative? VideoText transcribes video and YouTube URLs, generates SRT/VTT subtitle files, translates to 70+ languages, and burns captions into video — all free to start. No credit card. Files deleted after processing.',
    breadcrumbLabel: 'HappyScribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/sonix-alternative', '/descript-alternative'],
    indexable: true,
    intentKey: 'happyscribe-alternative',
    faq: [
      { q: 'Is VideoText free unlike HappyScribe?', a: 'Yes. VideoText has a permanent free tier — 3 imports per month, no credit card. HappyScribe has no free tier, only a 10-minute one-time trial.' },
      { q: 'Can VideoText transcribe YouTube videos like HappyScribe?', a: 'Yes, and it\'s easier. Paste any YouTube URL — no download needed. HappyScribe requires you to download and upload the file manually.' },
      { q: 'Does VideoText burn subtitles into video like HappyScribe?', a: 'Yes. VideoText includes a burn-subtitles tool. HappyScribe only exports SRT — you need a separate tool to hard-code captions.' },
      { q: 'Does HappyScribe delete my files after processing?', a: 'No. HappyScribe stores your media until you manually delete it. VideoText removes your file immediately after the job finishes.' },
      { q: 'How is VideoText pricing compared to HappyScribe?', a: 'HappyScribe starts at $17/month for 120 minutes. VideoText Creator Pro is $10/month. The free tier covers 3 imports/month with no payment.' },
    ],
  },
  {
    path: '/sonix-alternative',
    title: 'Best Free Sonix Alternative – No Per-Minute Fees | VideoText',
    description: 'Sonix charges $22/month + $0.10/minute overage. VideoText starts free and costs $10/month flat — same Whisper AI accuracy, YouTube URL support, subtitle burning, zero per-minute billing.',
    h1: 'Sonix Alternative',
    intro: 'Looking for a Sonix alternative? VideoText transcribes video and YouTube URLs with Whisper AI, exports SRT/VTT, translates subtitles to 70+ languages, and burns captions — all at a flat price with no per-minute fees. Free tier. Files deleted after processing.',
    breadcrumbLabel: 'Sonix Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/fastest-transcription-tool', '/happyscribe-alternative', '/trint-alternative'],
    indexable: true,
    intentKey: 'sonix-alternative',
    faq: [
      { q: 'Is VideoText cheaper than Sonix?', a: 'Yes. Sonix is $22/month base + $0.10/min overage. VideoText Creator Pro is $10/month flat — no surprise charges for longer videos.' },
      { q: 'Does VideoText support YouTube URL input like Sonix does not?', a: 'Correct. VideoText lets you paste any YouTube URL and transcribes it directly. Sonix requires downloading and uploading the file.' },
      { q: 'How does VideoText accuracy compare to Sonix?', a: 'Both use Whisper-based AI. VideoText uses Whisper large-v3 at ~98.5% word accuracy. Output quality is comparable for most content.' },
      { q: 'Does Sonix store files permanently?', a: 'Yes. Sonix retains your media and transcripts in their cloud. VideoText deletes your file the moment processing finishes.' },
      { q: 'Does VideoText have a free tier unlike Sonix?', a: 'Yes. VideoText has 3 free imports per month with no credit card. Sonix only offers a 30-minute trial then requires payment.' },
    ],
  },
  {
    path: '/easyscribe-alternative',
    title: 'Best EasyScribe Alternative for Video & Subtitles | VideoText',
    description: 'EasyScribe covers basic audio transcription only. VideoText transcribes video files and YouTube URLs, exports SRT subtitles, translates to 70+ languages, and burns captions. Free tier.',
    h1: 'EasyScribe Alternative',
    intro: 'Looking for an EasyScribe alternative? VideoText handles the full video transcription workflow — MP4 uploads, YouTube URL input, SRT/VTT subtitle export, 70+ language translation, subtitle burning, and batch processing. Free tier, no credit card needed.',
    breadcrumbLabel: 'EasyScribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/happyscribe-alternative', '/turboscribe-alternative'],
    indexable: true,
    intentKey: 'easyscribe-alternative',
    faq: [
      { q: 'What can VideoText do that EasyScribe cannot?', a: 'VideoText generates SRT/VTT subtitle files, translates to 70+ languages, burns subtitles into video, supports YouTube URLs, and processes batches. EasyScribe only produces plain-text transcripts.' },
      { q: 'Is VideoText free to try unlike EasyScribe?', a: 'Yes. VideoText has a permanent free tier with 3 imports per month. No credit card required to get started.' },
      { q: 'Can VideoText transcribe YouTube videos?', a: 'Yes. Paste any YouTube URL and VideoText streams and transcribes it. No need to download the video first.' },
      { q: 'Is VideoText more accurate than EasyScribe?', a: 'VideoText uses OpenAI Whisper large-v3 at ~98.5% word accuracy on clean audio — one of the most accurate models available.' },
      { q: 'Does VideoText delete my files after transcription?', a: 'Yes. Your file is deleted immediately after processing completes. Nothing is stored on our servers.' },
    ],
  },
  {
    path: '/best-transcription-tool',
    title: 'Best Transcription Tool in 2026: Fast AI, Clean Output | VideoText',
    description: 'Best transcription tool for creators, podcasters, and teams. Convert a 2-hour video in ~5 minutes. Transcript, summary, chapters, subtitles, and exports in one flow.',
    h1: 'Best Transcription Tool in 2026',
    intro: 'Need the best transcription tool for real publishing workflows, not just raw text? VideoText turns long videos and audio into clean transcript output, auto summaries, chapter timestamps, and subtitle files in minutes. Built for creators, editors, agencies, and journalists who need speed and structure.',
    breadcrumbLabel: 'Best Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcription', '/youtube-url-to-transcription', '/podcast-transcription-tool', '/otter-ai-alternative', '/descript-alternative'],
    indexable: true,
    intentKey: 'best-transcription-tool',
    faq: [
      { q: 'What makes VideoText one of the best transcription tools?', a: 'Most tools stop at raw transcript text. VideoText outputs a full publish-ready package: transcript, AI summary, chapters, speaker labels, and subtitle exports (SRT/VTT). For long-form creators, that removes hours of manual cleanup.' },
      { q: 'How fast is VideoText on long recordings?', a: 'A 2-hour recording typically processes in around 5 minutes depending on audio quality and queue load. You can start reviewing segments while processing completes.' },
      { q: 'Is this built for teams or solo creators?', a: 'Both. Solo creators use it for fast transcript-to-publish workflows; teams and agencies use batch workflows and export-ready outputs for client delivery.' },
      { q: 'Does VideoText replace Otter, Descript, Rev, or Notta?', a: 'For pure transcription and subtitle workflows, yes in many cases. VideoText is optimized for speed and clean structured output rather than timeline-heavy editing.' },
    ],
  },
  {
    path: '/video-to-transcription',
    title: 'Video to Transcription: Convert Video to Text in Minutes | VideoText',
    description: 'Convert video to transcription online. Upload file or paste link and get transcript, summary, chapters, and subtitle exports. Fast AI workflow for creators and teams.',
    h1: 'Video to Transcription in Minutes',
    intro: 'Convert any video into a clean transcription workflow: full transcript, key summary, chapter markers, and subtitle-ready files. No manual typing, no editing bottleneck.',
    breadcrumbLabel: 'Video to Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/youtube-url-to-transcription', '/best-transcription-tool', '/video-transcription', '/transcribe-video'],
    indexable: true,
    intentKey: 'video-to-transcription',
    faq: [
      { q: 'How do I convert video to transcription?', a: 'Upload a video (MP4, MOV, WebM, MKV, AVI) or use a supported URL input, then click Transcribe. VideoText returns transcript text plus optional summaries, chapters, and subtitle exports.' },
      { q: 'Is video to transcription different from video to text?', a: 'Practically, they are the same intent. This page focuses on full workflow output: transcript + structure (summary, chapters, speakers), not just plain text extraction.' },
      { q: 'Can I export subtitle files from a transcription run?', a: 'Yes. After transcription, you can generate or export SRT/VTT and use them on YouTube, web players, or social workflows.' },
      { q: 'Is there a free tier?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Paid plans unlock higher volume and advanced workflows.' },
    ],
  },
  {
    path: '/youtube-url-to-transcription',
    title: 'YouTube URL to Transcription: Paste Link, Get Transcript Fast | VideoText',
    description: 'Turn any YouTube URL into transcript, summary, and chapters. No download required. Paste link, transcribe fast, and export text or subtitle files.',
    h1: 'YouTube URL to Transcription',
    intro: 'Paste a YouTube URL and get a structured transcript workflow in minutes: text, summary, chapters, and subtitle-ready output. No manual download step.',
    breadcrumbLabel: 'YouTube URL to Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/youtube-transcript', '/best-youtube-transcription-tool', '/best-transcription-tool', '/transcribe-youtube-video'],
    indexable: true,
    intentKey: 'youtube-url-to-transcription',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    deepContent: {
      proofPoints: [
        '2-hour creator interview → transcript + summary + chapters in ~5 minutes.',
        'No manual download flow: paste YouTube URL directly and transcribe.',
        'Structured output includes transcript text, chapter points, and subtitle-ready exports.',
      ],
      workflowSteps: [
        { title: 'Step 1 — Paste YouTube URL', detail: 'Paste any supported YouTube watch/short link. The page opens with YouTube mode ready so users can start in seconds.' },
        { title: 'Step 2 — Generate transcript output', detail: 'Run transcription to get clean text with optional summary and chapter extraction for faster editing and publishing.' },
        { title: 'Step 3 — Export and publish', detail: 'Copy transcript, export subtitle files, and repurpose output into descriptions, posts, and show notes.' },
      ],
      outputExamples: [
        { title: 'Transcript output', body: 'Readable paragraph format with speaker context for fast scanning and clip extraction.' },
        { title: 'Summary output', body: 'Key takeaway bullets for descriptions, newsletters, and social copy.' },
        { title: 'Chapter output', body: 'Auto-generated chapter points that map long videos into clickable sections.' },
      ],
      comparisonRows: [
        { feature: 'YouTube URL-first flow', videotext: 'Paste URL and transcribe directly', alternatives: 'Often require extra steps or manual file workflow' },
        { feature: 'Structured output', videotext: 'Transcript + summary + chapters + subtitle exports', alternatives: 'Frequently plain transcript only' },
        { feature: 'Publishing speed', videotext: 'Designed for same-session publish workflow', alternatives: 'More cleanup before publish' },
      ],
      useCases: [
        { title: 'YouTubers', body: 'Turn a long-form video into chapters, summary text, and searchable transcript assets.' },
        { title: 'Video editors', body: 'Extract the transcript quickly for cut planning and caption prep.' },
        { title: 'Agencies', body: 'Run repeatable client workflows from URL to publish-ready outputs.' },
      ],
      ctaText: 'Paste a YouTube URL and transcribe now',
      ctaPath: '/youtube-url-to-transcription',
    },
    faq: [
      { q: 'Can I transcribe YouTube directly from a URL?', a: 'Yes. Paste any supported YouTube link format and VideoText streams audio for transcription. You do not need to download the file first.' },
      { q: 'What output do I get from YouTube URL transcription?', a: 'You get full transcript text plus optional summary, chapter points, and subtitle export formats like SRT/VTT.' },
      { q: 'Does this work for Shorts?', a: 'Yes. Shorts URLs are supported with the same transcription flow as standard YouTube videos.' },
      { q: 'Is YouTube URL transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to test with real videos.' },
    ],
  },
  {
    path: '/podcast-transcription-tool',
    title: 'Podcast Transcription Tool for Show Notes, Chapters & Clips | VideoText',
    description: 'Podcast transcription tool built for publishing speed. Convert episodes into transcript text, chapter markers, summaries, and subtitle-ready assets.',
    h1: 'Podcast Transcription Tool',
    intro: 'Turn podcast episodes into reusable assets quickly: searchable transcript text, chapter timestamps, key takeaways, and subtitle exports for clips. Built for weekly publishing cadence.',
    breadcrumbLabel: 'Podcast Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/best-podcast-transcription-tool', '/fastest-transcription-tool', '/best-transcription-tool', '/audio-to-text'],
    indexable: true,
    intentKey: 'podcast-transcription-tool',
    deepContent: {
      proofPoints: [
        '2-hour podcast episode → transcript package in ~5 minutes.',
        'No cleanup-first workflow: transcript, summary, and chapter structure are generated together.',
        'Built for recurring publishing cadence (weekly episodes, clips, show notes).',
      ],
      workflowSteps: [
        { title: 'Step 1 — Upload episode audio/video', detail: 'Upload your podcast export file and start transcription. Use speaker segmentation for host/guest readability.' },
        { title: 'Step 2 — Review structured outputs', detail: 'Get transcript text plus summary and chapter sections to speed up show-note drafting and content repurposing.' },
        { title: 'Step 3 — Publish everywhere', detail: 'Use transcript text for SEO pages, summary bullets for episode descriptions, and captions for social clips.' },
      ],
      outputExamples: [
        { title: 'Show-note draft', body: 'Summary bullets + chapter points provide a strong first draft for episode pages.' },
        { title: 'Clip captions', body: 'Subtitle-ready outputs make short-form clip publishing faster.' },
        { title: 'Searchable archive', body: 'Transcript text creates searchable content across your back catalog.' },
      ],
      comparisonRows: [
        { feature: 'Podcast workflow focus', videotext: 'Optimized for show notes + chapters + clips', alternatives: 'General-purpose transcript tools only' },
        { feature: 'Output readiness', videotext: 'Structured assets with minimal cleanup', alternatives: 'More manual editing before publish' },
        { feature: 'Speed on long episodes', videotext: 'Minutes, not hours, for long-form episodes', alternatives: 'Slower handoff or editing loops' },
      ],
      useCases: [
        { title: 'Podcast hosts', body: 'Generate transcript and summary immediately after recording.' },
        { title: 'Editors', body: 'Find quotable moments quickly with transcript and chapter structure.' },
        { title: 'Content teams', body: 'Repurpose one episode into newsletter, blog, and social content faster.' },
      ],
      ctaText: 'Transcribe your podcast episode now',
      ctaPath: '/podcast-transcription-tool',
    },
    faq: [
      { q: 'How is this different from basic podcast transcription tools?', a: 'Beyond transcript text, VideoText adds summaries, chapter sections, and export-ready outputs that speed up show notes and content repurposing.' },
      { q: 'What formats can I upload for podcast transcription?', a: 'Upload common podcast exports like MP4, MOV, and WebM containers. If your workflow starts with MP3/WAV, export to a supported container or use your video recording source file.' },
      { q: 'Can I use this for multi-speaker interviews?', a: 'Yes. Speaker segmentation helps split host/guest sections and improves editing speed for long episodes.' },
      { q: 'How fast is the workflow?', a: 'A long episode usually completes within minutes, allowing same-day show notes and social clip prep without manual transcription.' },
    ],
  },
  {
    path: '/meeting-transcription-tool',
    title: 'Meeting Transcription Tool with Summaries & Action Items | VideoText',
    description: 'Convert Zoom, Teams, and webinar recordings into searchable transcripts with structured summaries and action points. Faster than manual meeting notes.',
    h1: 'Meeting Transcription Tool',
    intro: 'Upload meeting recordings and get structured outputs your team can act on: transcript text, speaker turns, concise summaries, and action-item friendly notes.',
    breadcrumbLabel: 'Meeting Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/meeting-transcription', '/zoom-recording-transcript', '/microsoft-teams-alternative', '/best-transcription-tool'],
    indexable: true,
    intentKey: 'meeting-transcription-tool',
    faq: [
      { q: 'Can I transcribe Zoom or Teams recordings?', a: 'Yes. Export the meeting as MP4, upload it to VideoText, and get a searchable transcript plus structured summary output.' },
      { q: 'Does this help with action items?', a: 'Yes. Summaries and chapter-style sections make follow-ups easier than raw transcript blocks.' },
      { q: 'Is speaker labeling supported?', a: 'Yes. Speaker separation is available for clearer meeting documentation and handoff notes.' },
      { q: 'Is this suitable for agencies and client calls?', a: 'Yes. Teams use it to document discovery calls, interviews, and handoffs with faster turnaround.' },
    ],
  },
  {
    path: '/interview-transcription-tool',
    title: 'Interview Transcription Tool for Journalists & Researchers | VideoText',
    description: 'Transcribe interviews into clean, searchable text with speaker separation and fast turnaround. Built for newsroom and research workflows.',
    h1: 'Interview Transcription Tool',
    intro: 'Transcribe interviews fast without losing context. VideoText produces clean transcript output with speaker structure so journalists and researchers can quote, edit, and publish faster.',
    breadcrumbLabel: 'Interview Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/interview-transcription', '/journalism-transcription', '/research-interview-transcription', '/best-transcription-tool', '/podcast-transcription-tool'],
    indexable: true,
    intentKey: 'interview-transcription-tool',
    faq: [
      { q: 'Is this accurate enough for quote extraction?', a: 'For clear recordings, yes. You should still review sensitive quotes before publication, but structured output and speaker segmentation reduce manual verification time significantly.' },
      { q: 'Can I transcribe long interviews quickly?', a: 'Yes. Long recordings are processed in minutes, and you can start reviewing earlier segments while processing continues.' },
      { q: 'Does this work for field interviews and noisy audio?', a: 'It works best with clean audio, but supports varied recording conditions. For difficult audio, preprocessing (noise reduction) improves output quality.' },
      { q: 'Can I export text for editorial workflows?', a: 'Yes. Export formats support transcript handoff into docs, captioning, and downstream publishing workflows.' },
    ],
  },
  {
    path: '/best-video-transcription-tool',
    title: 'Best Video Transcription Tool 2026 – AI-Powered | VideoText',
    description: 'Best video transcription tool. Fast AI transcription. SRT, TXT, DOCX. Speaker labels, chapters. We don\'t store your data. Free tier.',
    h1: 'Best Video Transcription Tool',
    intro: 'VideoText is among the best video transcription tools. Fast AI transcription, speaker labels, chapters, SRT export. We process and delete your files — no retention. Free tier.',
    breadcrumbLabel: 'Best Video Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-transcription', '/transcribe-video', '/fastest-transcription-tool'],
    indexable: true,
    intentKey: 'best-video-transcription-tool',
    faq: [
      { q: 'What makes VideoText a good video transcription tool?', a: 'Fast AI transcription, SRT/VTT export, speaker labels, chapters, translation. We don\'t store your data.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required.' },
    ],
  },
  {
    path: '/best-youtube-transcription-tool',
    title: 'Best YouTube Transcription Tool – Paste URL, Get Text | VideoText',
    description: 'Best YouTube transcription tool. Paste URL, get transcript. No download. SRT, TXT export. Fast. Free tier.',
    h1: 'Best YouTube Transcription Tool',
    intro: 'VideoText is among the best YouTube transcription tools. Paste any YouTube URL — no download. Get a transcript in seconds. Export SRT, TXT. Free tier.',
    breadcrumbLabel: 'Best YouTube Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/youtube-transcript', '/transcribe-youtube-video'],
    indexable: true,
    intentKey: 'best-youtube-transcription-tool',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I transcribe a YouTube video with VideoText?', a: 'Paste the YouTube URL and click Transcribe. No download. Transcript ready in seconds.' },
      { q: 'Is YouTube transcription free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/best-podcast-transcription-tool',
    title: 'Best Podcast Transcription Tool – Fast & Accurate | VideoText',
    description: 'Best podcast transcription tool. Upload episode, get transcript. Speaker labels, summary. We don\'t store your data. Free tier.',
    h1: 'Best Podcast Transcription Tool',
    intro: 'VideoText is among the best podcast transcription tools. Upload your episode as MP4 or MOV. Get speaker labels, key takeaways, translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Best Podcast Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/podcast-transcription', '/audio-to-text'],
    indexable: true,
    intentKey: 'best-podcast-transcription-tool',
    faq: [
      { q: 'How do I transcribe a podcast with VideoText?', a: 'Export your episode as MP4 or MOV, upload here, and get a full transcript with speaker labels in seconds.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/fastest-transcription-tool',
    title: 'Fastest Transcription Tool – AI-Powered | VideoText',
    description: 'Fastest transcription tool. Transcribe video in seconds. Real-time results. SRT, TXT export. We don\'t store your data. Free tier.',
    h1: 'Fastest Transcription Tool',
    intro: 'VideoText is one of the fastest transcription tools. Most videos transcribe in 30–90 seconds. See results stream in real time. Export SRT, TXT. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Fastest Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-transcription', '/turboscribe-alternative'],
    indexable: true,
    intentKey: 'fastest-transcription-tool',
    faq: [
      { q: 'How fast is VideoText?', a: 'Most short videos transcribe in 30–90 seconds. Results stream in real time as segments complete.' },
      { q: 'Does VideoText store my files?', a: 'No. We process and delete. No retention.' },
    ],
  },
  {
    path: '/free-video-transcription-tool',
    title: 'Free Video Transcription Tool – No Credit Card | VideoText',
    description: 'Free video transcription tool. 3 imports/month. SRT, TXT export. AI-powered. We don\'t store your data. Sign up for free.',
    h1: 'Free Video Transcription Tool',
    intro: 'VideoText offers a free video transcription tool. 3 imports per month, no credit card. Transcribe video, get SRT or TXT. We process and delete your files. Sign up for free.',
    breadcrumbLabel: 'Free Video Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/free-transcription', '/transcribe-video', '/video-transcription'],
    indexable: true,
    intentKey: 'free-video-transcription-tool',
    faq: [
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). No credit card required.' },
      { q: 'What do I get with the free tier?', a: 'Transcript, SRT/VTT export, speaker labels, summary, chapters. Watermark on subtitle exports.' },
    ],
  },

  // ── Cluster A: Platform-Specific Pages ──────────────────────────────────────
  {
    path: '/tiktok-to-transcript',
    title: 'TikTok to Transcript – Get Text from Any TikTok Video | VideoText',
    description: 'Transcribe TikTok videos to text. Paste the TikTok URL or upload the video and get a full transcript in seconds. Free AI transcription. Download TXT or SRT.',
    h1: 'TikTok to Transcript — Paste URL or Upload',
    intro: 'Get a transcript from any TikTok video in seconds. Paste the video URL or upload the file directly. Our AI transcribes the speech and delivers clean, readable text. Download as TXT for repurposing content, or SRT for adding captions to your own videos. Free tier, no credit card.',
    breadcrumbLabel: 'TikTok to Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/instagram-reel-transcript', '/screen-recording-transcript', '/youtube-to-transcript', '/video-to-transcript'],
    indexable: true,
    intentKey: 'tiktok-to-transcript',
    faq: [
      { q: 'Can I transcribe a TikTok video to text?', a: 'Yes. Upload the TikTok video file or paste the URL, and our AI transcribes the spoken words to text. Works with TikTok content in any language Whisper supports — set the spoken language before processing for best accuracy.' },
      { q: "Why are TikTok's built-in captions not enough?", a: "TikTok auto-captions are display-only — you can't export them as a file, they don't support all languages, and they have no timestamps you can repurpose. VideoText gives you a full transcript file (TXT, SRT, VTT) you can reuse as YouTube captions, blog content, or subtitles for your reposted video." },
      { q: 'How do I get the TikTok video file to upload?', a: 'On mobile, use TikTok\'s built-in save feature to download the video to your camera roll, then upload it here. On desktop, several browser extensions allow downloading TikTok videos. Once you have the MP4, upload it directly.' },
      { q: 'Can I use the TikTok transcript for SEO?', a: 'Yes. TikTok videos are not indexed by Google, but if you republish the content as a blog post or YouTube video and include the transcript, you make that content searchable. Repurposing the transcript is one of the fastest ways to generate text content from your existing video library.' },
      { q: 'Is TikTok transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/instagram-reel-transcript',
    title: 'Instagram Reel Transcript – Transcribe Reels to Text | VideoText',
    description: 'Transcribe Instagram Reels to text. Upload the video and get a full transcript in seconds. Download TXT or SRT. Free AI-powered transcription.',
    h1: 'Instagram Reel Transcript — Paste URL or Upload',
    intro: 'Get a transcript from any Instagram Reel. Upload the video file and our AI transcribes the spoken content to text instantly. Use the transcript for repurposing into blogs, YouTube scripts, or subtitles for other platforms. Download as TXT or SRT. Free tier.',
    breadcrumbLabel: 'Instagram Reel Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/tiktok-to-transcript', '/screen-recording-transcript', '/video-to-transcript', '/subtitle-generator'],
    indexable: true,
    intentKey: 'instagram-reel-transcript',
    faq: [
      { q: 'How do I transcribe an Instagram Reel?', a: 'Download the Reel as a video file (MP4) using Instagram\'s save feature or a third-party tool, then upload it here. Our AI extracts the speech and produces a clean text transcript in seconds.' },
      { q: "Why not use Instagram's built-in captions?", a: "Instagram auto-captions are styled overlays, not exportable subtitle files. You cannot extract them as SRT, they don't include timestamps, and they only appear in the Instagram app. VideoText gives you a real transcript file you can repurpose anywhere." },
      { q: 'Can I get subtitles from my Instagram Reel for YouTube?', a: 'Yes. Upload your Reel, choose Video to Subtitles mode, and download an SRT file. Upload that SRT directly to YouTube Studio as your caption track. You get accurate, timed captions without manually typing anything.' },
      { q: 'Does it work for Reels in other languages?', a: 'Yes. Whisper supports 90+ languages. Set the spoken language before processing to get the best transcription accuracy for non-English Reels.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/loom-transcription',
    title: 'Loom Transcription – Transcribe Loom Videos to Text | VideoText',
    description: 'Transcribe Loom screen recordings to text. Download the Loom video, upload here, and get a full transcript with speaker labels. Free. AI-powered.',
    h1: 'Loom Transcription — Transcribe Loom Videos Online',
    intro: 'Transcribe Loom screen recordings and video messages to text. Download your Loom video as MP4, upload it here, and get a full transcript in seconds. Use the Speakers branch to separate speakers, Summary for key decisions, and Chapters to navigate by topic. Free tier.',
    breadcrumbLabel: 'Loom Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/screen-recording-transcript', '/zoom-recording-transcript', '/meeting-transcript', '/video-to-transcript'],
    indexable: true,
    intentKey: 'loom-transcription',
    faq: [
      { q: 'How do I transcribe a Loom video?', a: 'Open the Loom video, click the download button (three-dot menu → Download), and save the MP4 to your computer. Upload the MP4 here and our AI transcribes the spoken content. Most Loom videos process in under a minute.' },
      { q: "Does Loom have built-in transcription?", a: "Yes, Loom offers auto-transcription on paid plans. However, VideoText gives you additional outputs — speaker labels, summary, chapters, keyword index, and export to SRT/VTT/TXT/JSON. If you want to repurpose Loom content as text, copy to Notion, or generate subtitles, VideoText provides more flexibility." },
      { q: 'Can I get a summary of a Loom video?', a: 'Yes. After transcribing, open the Summary branch to see key decisions, action items, and main points extracted automatically. Useful for async video updates where recipients want the TL;DR without watching the full recording.' },
      { q: 'Does it work for Loom recordings with multiple speakers?', a: 'Yes. Upload the Loom MP4 and after transcribing, open the Speakers branch. Speech turns are grouped by speaker (Speaker 1, Speaker 2, etc.) for easy navigation.' },
      { q: 'Is Loom transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/google-meet-transcript',
    title: 'Google Meet Transcript – Transcribe Meet Recordings | VideoText',
    description: 'Transcribe Google Meet recordings to text. Download the Meet recording, upload here, and get a full transcript with speaker labels and action items. Free tier.',
    h1: 'Google Meet Transcript — Transcribe Recordings Online',
    intro: 'Transcribe Google Meet recordings to text in seconds. Download your meeting recording from Google Drive, upload the MP4 here, and get a full transcript. Use Speakers for who-said-what, Summary for action items and decisions, and Chapters to navigate the meeting by topic. Free tier, no credit card.',
    breadcrumbLabel: 'Google Meet Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/teams-meeting-transcript', '/zoom-recording-transcript', '/meeting-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'google-meet-transcript',
    faq: [
      { q: 'How do I transcribe a Google Meet recording?', a: 'Google Meet saves recordings to your Google Drive. Open Drive, find the recording, download it as MP4, and upload it here. Our AI produces a full text transcript. Most 60-minute calls transcribe in 5–8 minutes.' },
      { q: "Does Google Meet have a built-in transcript?", a: "Google Meet offers live captions and post-meeting transcripts on Workspace Business and Enterprise plans. If you don't have those plans, or if you want speaker-labeled text with a summary and chapters, VideoText provides that from any Meet recording download." },
      { q: 'Can I get speaker labels from a Google Meet transcript?', a: 'Yes. After transcribing, open the Speakers branch. Each participant\'s speech is grouped by speaker turn. For the clearest separation, ensure participants were not muted for long stretches and that audio quality is good.' },
      { q: 'Can I get action items from the meeting transcript?', a: 'Yes. The Summary branch automatically extracts key decisions, action items, and main points. Copy and paste directly into your team\'s Slack, Notion, or email as meeting notes.' },
      { q: 'Is Google Meet transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.' },
      { q: 'What format does Google Meet save recordings in?', a: 'Google Meet saves recordings as MP4 files to Google Drive. Download the MP4 and upload it directly. No conversion needed.' },
    ],
  },
  {
    path: '/teams-meeting-transcript',
    title: 'Microsoft Teams Transcript – Transcribe Teams Recordings | VideoText',
    description: 'Transcribe Microsoft Teams meeting recordings to text. Download the Teams recording, upload here, get a full transcript with speaker labels and action items. Free tier.',
    h1: 'Microsoft Teams Transcript — Transcribe Recordings Online',
    intro: 'Transcribe Microsoft Teams recordings to text. Download the meeting recording from Teams or SharePoint, upload the MP4 here, and get a full transcript in seconds. Speaker labels, action item summary, chapter navigation — all available after a single upload. Free tier.',
    breadcrumbLabel: 'Teams Meeting Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/google-meet-transcript', '/zoom-recording-transcript', '/meeting-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'teams-meeting-transcript',
    faq: [
      { q: 'How do I transcribe a Microsoft Teams recording?', a: 'In Teams, go to the meeting chat or the Recordings tab and download the recording as MP4. Alternatively, find it in SharePoint under the channel Files. Upload the MP4 here and our AI produces a full transcript. Most meetings transcribe in 5–10 minutes.' },
      { q: "Does Teams have built-in transcription?", a: "Yes, Microsoft Teams offers meeting transcription on Microsoft 365 Business Basic plans and above. However, Teams transcription is limited to supported languages, requires the feature to be enabled by an admin, and the transcript lives only inside Teams. VideoText works from any recording download, requires no admin setup, and exports to TXT, SRT, VTT, and JSON." },
      { q: 'Can I get speaker labels from a Teams transcript?', a: 'Yes. After transcribing, open the Speakers branch to see each participant\'s contributions grouped by speaker turn. This works from standard stereo recordings — you do not need a multi-track export.' },
      { q: 'Can I get meeting notes from a Teams transcript automatically?', a: 'Yes. The Summary branch extracts action items, key decisions, and main discussion points. Paste directly into your Teams chat, Outlook email, or Confluence page as meeting notes.' },
      { q: 'Is Teams meeting transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes, suitable for teams with weekly meetings.' },
      { q: 'What video format do Teams recordings use?', a: 'Teams recordings are saved as MP4 files. Download the MP4 from Teams or SharePoint and upload it directly. No conversion is needed.' },
    ],
  },
  {
    path: '/vimeo-transcription',
    title: 'Vimeo Transcription – Transcribe Vimeo Videos to Text | VideoText',
    description: 'Transcribe Vimeo videos to text. Download the Vimeo video, upload here, and get an accurate transcript. Export TXT, SRT, or VTT. Free AI-powered transcription.',
    h1: 'Vimeo Transcription — Transcribe Videos Online',
    intro: 'Transcribe Vimeo videos to text in seconds. Download your Vimeo video, upload the file here, and get a full AI-powered transcript. Export as plain text for repurposing, or SRT/VTT for adding closed captions back to Vimeo or other platforms. Free tier.',
    breadcrumbLabel: 'Vimeo Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/screen-recording-transcript', '/video-to-transcript', '/subtitle-generator'],
    indexable: true,
    intentKey: 'vimeo-transcription',
    faq: [
      { q: 'How do I transcribe a Vimeo video?', a: 'Download the Vimeo video as MP4 (available from Vimeo\'s download button if the creator enables it, or on your own Vimeo account). Upload the MP4 here and get a full transcript.' },
      { q: "Does Vimeo have built-in transcription?", a: "Vimeo offers auto-generated captions on paid plans (Vimeo Pro and above). If you are on the free tier or want a more accurate transcript to export and repurpose, VideoText provides a higher-accuracy alternative powered by Whisper." },
      { q: 'Can I get SRT captions from a Vimeo video?', a: 'Yes. Upload your Vimeo video, use the Video to Subtitles tool, and download an SRT file. You can then upload the SRT back to Vimeo in Video Manager → Advanced → Captions & Subtitles.' },
      { q: 'Is Vimeo transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'What video format should I download from Vimeo?', a: 'Download as MP4 (1080p or 720p). All standard Vimeo MP4 downloads work directly with VideoText — no conversion needed.' },
    ],
  },
  {
    path: '/riverside-transcription',
    title: 'Riverside Transcription – Transcribe Riverside Recordings | VideoText',
    description: 'Transcribe Riverside.fm podcast and interview recordings to text. Export from Riverside, upload here, get a full transcript with speaker labels. Free tier.',
    h1: 'Riverside Transcription — Transcribe Riverside Recordings',
    intro: 'Transcribe Riverside.fm podcast and interview recordings to text. Export your recording from Riverside, upload the video or audio here, and get a full transcript with speaker labels. Use Summary for show notes and Chapters to index your episode by topic. Free tier.',
    breadcrumbLabel: 'Riverside Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/loom-transcription', '/interview-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'riverside-transcription',
    faq: [
      { q: 'How do I transcribe a Riverside recording?', a: 'In Riverside, go to your recording, click Download, and export the composite video (MP4) or separate audio tracks (MP3/WAV). Upload here and get a full transcript. For podcasts with two guests, the composite export works well for speaker labeling.' },
      { q: "Does Riverside have built-in transcription?", a: "Yes, Riverside includes transcription on paid plans. VideoText is a useful alternative or complement if you want to: (a) transcribe exports from older recordings, (b) get a richer feature set (keyword index, chapter navigation, JSON export), or (c) avoid upgrading your Riverside plan." },
      { q: 'Can I get podcast show notes from a Riverside transcript?', a: 'Yes. The Summary branch extracts key points and topics automatically. This is the fastest way to generate show notes from a Riverside recording — transcribe, open Summary, copy the output into your podcast platform.' },
      { q: 'Does it support separate Riverside audio tracks?', a: 'Yes. If you export separate MP3 tracks per participant, you can upload each one individually. For a combined transcript with speaker labels, upload the composite video or merged audio.' },
      { q: 'Is Riverside transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/screen-recording-transcript',
    title: 'Screen Recording Transcript – Transcribe Screen Recordings | VideoText',
    description: 'Transcribe screen recordings to text. Upload your screen recording (MP4, WebM, MOV) and get a full transcript with timestamps. Free AI-powered transcription.',
    h1: 'Screen Recording Transcript — Transcribe Screen Recordings',
    intro: 'Transcribe any screen recording to text. Upload your screen recording file (MP4, WebM, MOV) and get a full AI-powered transcript in seconds. Works with recordings from Loom, OBS, QuickTime, Zoom, Screenflow, Camtasia, and any other screen recording tool. Free tier.',
    breadcrumbLabel: 'Screen Recording Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/loom-transcription', '/zoom-recording-transcript', '/webm-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'screen-recording-transcript',
    faq: [
      { q: 'What screen recording formats are supported?', a: 'MP4, WebM, MOV, MKV, and AVI are all supported. Most screen recording tools export to one of these formats — Loom (MP4), OBS (MP4/MKV), QuickTime (MOV), Zoom (MP4), and Screenflow (MP4). Upload directly without converting.' },
      { q: 'Does it transcribe voiceover narration in screen recordings?', a: 'Yes. The AI transcribes all spoken audio in the recording — voiceover narration, system audio with speech, and microphone input. For best results, ensure the audio track has clear speech without excessive background noise.' },
      { q: 'Can I transcribe a tutorial or course video?', a: 'Yes. Screen recording transcripts are widely used for online course creators who want searchable text, accessibility captions, or article content repurposed from tutorial videos. Upload the video and get SRT for captions or TXT for blog posts.' },
      { q: 'Is screen recording transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.' },
      { q: 'Can I generate subtitles from a screen recording?', a: 'Yes. Use the Video to Subtitles tool with your screen recording file to generate SRT or VTT captions. These can be burned into the video using the Burn Subtitles tool or uploaded to YouTube as a caption track.' },
    ],
  },

  // ── Cluster B: Language-Specific Pages ──────────────────────────────────────
  {
    path: '/spanish-transcription',
    title: 'Spanish Video Transcription – Transcribe Spanish Videos Online | VideoText',
    description: 'Transcribe Spanish videos and audio to text online. AI-powered, Whisper-based. Upload video or paste URL. Accurate Spanish transcription with timestamps. Free tier.',
    h1: 'Spanish Video Transcription — AI-Powered Online',
    intro: 'Transcribe Spanish videos to text with high accuracy. Upload any video or audio file in Spanish and get a full transcript powered by Whisper AI. Works for Latin American and Castilian Spanish. Export as TXT, SRT, or VTT. Translate to English or other languages. Free tier.',
    breadcrumbLabel: 'Spanish Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/video-to-transcript', '/french-transcription'],
    indexable: true,
    intentKey: 'spanish-transcription',
    faq: [
      { q: 'How accurate is Spanish video transcription?', a: 'VideoText uses OpenAI Whisper, which achieves a Word Error Rate (WER) of around 3–5% on clear Spanish audio — comparable to human accuracy for standard accents. It handles both Latin American Spanish and Castilian Spanish well. Accuracy is highest when you select "Spanish" as the source language before processing.' },
      { q: 'Does it work for Mexican, Argentine, and Spanish Spanish accents?', a: 'Yes. Whisper was trained on a diverse Spanish corpus covering multiple regional accents including Mexican, Argentine, Colombian, and Castilian varieties. For heavily regional or fast speech, setting the language explicitly to Spanish improves accuracy.' },
      { q: 'Can I transcribe a Spanish video and translate it to English?', a: 'Yes. Upload your Spanish video, get the transcript, then click Translate and choose English as the target language. You get a translated version alongside the original Spanish transcript.' },
      { q: 'What are common use cases for Spanish transcription?', a: 'YouTube creators publishing to Spanish-speaking audiences, corporate training videos in Spanish, podcast transcription for Spanish-language shows, customer support call recordings, legal and academic interview transcription, and subtitle generation for Spanish content.' },
      { q: 'Can I generate Spanish subtitles (SRT) from a video?', a: 'Yes. Set the spoken language to Spanish, then use the Video to Subtitles tool. You get a timed SRT or VTT file in Spanish you can upload to YouTube, Vimeo, or burn into the video.' },
      { q: 'Is Spanish transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/french-transcription',
    title: 'French Video Transcription – Transcribe French Videos Online | VideoText',
    description: 'Transcribe French videos and audio to text online. Whisper AI. Upload video or audio, get accurate French transcript. Export TXT, SRT, VTT. Free tier.',
    h1: 'French Video Transcription — AI-Powered Online',
    intro: 'Transcribe French videos to text with high accuracy. Upload any French-language video or audio file and get a full Whisper-powered transcript. Works for French, Canadian French, and Belgian French. Export as TXT, SRT, or VTT. Translate to English or other languages. Free tier.',
    breadcrumbLabel: 'French Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/video-to-transcript', '/spanish-transcription'],
    indexable: true,
    intentKey: 'french-transcription',
    faq: [
      { q: 'How accurate is French transcription with Whisper?', a: 'Whisper achieves low Word Error Rates on French audio — around 4–6% for standard French. It handles metropolitan French, Canadian French (Québécois), and Belgian French. Set the language to French before processing to enable the French-specific model weights.' },
      { q: 'Does it work for Canadian French (Québécois)?', a: 'Yes. Whisper was trained on diverse French data including Canadian French. Accuracy on Québécois is slightly lower than standard French due to distinct phonology, but generally remains high for clear speech.' },
      { q: 'Can I transcribe a French video and get English subtitles?', a: 'Yes. Transcribe the French video, then use the Translate function to translate to English. Download the translated version as SRT or VTT for English subtitles.' },
      { q: 'What formats are supported for French audio?', a: 'All standard video and audio formats: MP4, MOV, WebM, MP3, WAV, M4A, AAC. Upload directly — no conversion needed.' },
      { q: 'Is French transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/portuguese-transcription',
    title: 'Portuguese Transcription Online – Transcribe Portuguese Videos | VideoText',
    description: 'Transcribe Portuguese and Brazilian Portuguese videos and audio to text. Whisper AI. Upload video or audio file, get accurate transcript. Free tier.',
    h1: 'Portuguese Transcription Online — AI-Powered',
    intro: 'Transcribe Portuguese videos and audio recordings to text with Whisper AI. Supports both European Portuguese and Brazilian Portuguese. Upload any video or audio file and get a full, accurate transcript. Export TXT, SRT, or VTT. Translate to English or other languages. Free tier.',
    breadcrumbLabel: 'Portuguese Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/spanish-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'portuguese-transcription',
    faq: [
      { q: 'Does it support Brazilian Portuguese?', a: 'Yes. Whisper supports both European Portuguese (PT-PT) and Brazilian Portuguese (PT-BR). For best accuracy, you can specify "Portuguese" as the language — Whisper will auto-detect the regional variant from the audio.' },
      { q: 'What are the main use cases for Portuguese transcription?', a: 'Brazilian YouTube creators transcribing videos for SEO and subtitles, corporate training content in Portuguese, podcast shows targeting Brazil or Portugal, academic interviews, and customer service call recordings from Portuguese-speaking regions.' },
      { q: 'Can I transcribe a Brazilian Portuguese video and translate to English?', a: 'Yes. Upload the video, set the language to Portuguese, get the transcript, and then click Translate to generate an English version alongside the original.' },
      { q: 'Is Portuguese transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/hindi-transcription',
    title: 'Hindi Video Transcription – Transcribe Hindi Videos Online | VideoText',
    description: 'Transcribe Hindi videos and audio to text online. Whisper AI. Upload Bollywood content, YouTube videos, or corporate recordings. Accurate Hindi transcription. Free tier.',
    h1: 'Hindi Video Transcription — AI-Powered Online',
    intro: 'Transcribe Hindi videos and audio to text with Whisper AI. Works for YouTube videos, Bollywood content, corporate training, podcasts, and interviews in Hindi. Export as TXT, SRT, or VTT. Translate to English or other languages. Free tier, no credit card.',
    breadcrumbLabel: 'Hindi Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/video-to-transcript', '/arabic-transcription'],
    indexable: true,
    intentKey: 'hindi-transcription',
    faq: [
      { q: 'How accurate is Hindi transcription?', a: 'Whisper achieves strong accuracy on Hindi audio — WER is around 10–15% for clear speech. Accuracy is best on standard Hindi (Khariboli). Code-switched Hindi-English (Hinglish) may have slightly higher error rates. Always set the language to Hindi before processing.' },
      { q: 'What are common uses for Hindi video transcription?', a: 'YouTube content creators publishing to Indian audiences, Bollywood film subtitles, corporate training content for Indian teams, online education platforms, podcast transcription for Hindi-language shows, and news/interview recordings in Hindi.' },
      { q: 'Can I generate Hindi subtitles for a video?', a: 'Yes. Upload your Hindi video, use the Video to Subtitles tool, and download the SRT or VTT file in Hindi. These can be uploaded to YouTube or burned into the video.' },
      { q: 'Can I transcribe a Hindi video and translate it to English?', a: 'Yes. Upload and transcribe the Hindi video, then click Translate to English. The English version appears alongside the Hindi transcript.' },
      { q: 'Does it work for regional Indian languages?', a: 'Whisper supports many Indian languages beyond Hindi: Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, and others. Set the spoken language before processing for best accuracy on each language.' },
      { q: 'Is Hindi transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/german-transcription',
    title: 'German Transcription Online – Transcribe German Videos | VideoText',
    description: 'Transcribe German videos and audio to text online. Whisper AI accuracy. Upload video or audio, get full German transcript. Export TXT, SRT, VTT. Free tier.',
    h1: 'German Transcription Online — AI-Powered',
    intro: 'Transcribe German videos and audio to text with Whisper AI. Works for German, Austrian German, and Swiss German. Upload any video or audio file and get a full, accurate transcript. Export TXT, SRT, or VTT. Translate to English or other languages. Free tier.',
    breadcrumbLabel: 'German Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/french-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'german-transcription',
    faq: [
      { q: 'How accurate is German transcription?', a: 'Whisper achieves around 4–7% Word Error Rate on clear German audio, making it comparable to human transcription speed. German compound words are handled well, though complex technical terminology in specialized domains may have slightly higher errors.' },
      { q: 'Does it work for Austrian and Swiss German?', a: 'Yes. Whisper handles standard German (Hochdeutsch), Austrian German, and Swiss Standard German. Dialects like Bavarian or Alemannic have slightly higher error rates due to phonological differences from standard German.' },
      { q: 'What are common uses for German transcription?', a: 'Corporate meetings and webinars in German, academic lecture transcription, podcast shows targeting German-speaking audiences, YouTube channel subtitles, and legal or medical interview recordings.' },
      { q: 'Is German transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/arabic-transcription',
    title: 'Arabic Transcription Online – Transcribe Arabic Videos | VideoText',
    description: 'Transcribe Arabic videos and audio to text. Whisper AI. Supports Modern Standard Arabic and regional dialects. Upload video or audio, get accurate transcript. Free tier.',
    h1: 'Arabic Transcription Online — AI-Powered',
    intro: 'Transcribe Arabic videos and audio to text with Whisper AI. Supports Modern Standard Arabic (MSA) and major regional dialects. Upload any video or audio file and get a full transcript. Export TXT, SRT, or VTT. Translate to English. Free tier.',
    breadcrumbLabel: 'Arabic Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/hindi-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'arabic-transcription',
    faq: [
      { q: 'How accurate is Arabic transcription with Whisper?', a: 'Whisper achieves around 10–15% WER on Modern Standard Arabic. Dialects (Egyptian, Gulf, Levantine, Maghrebi) have higher error rates as they differ significantly from MSA in vocabulary and phonology. For best accuracy, set the language to Arabic before processing.' },
      { q: 'Does it support different Arabic dialects?', a: 'Whisper transcribes all Arabic dialects to some degree, with best results on Modern Standard Arabic and Egyptian Arabic (the most widely understood dialect). For formal or broadcast Arabic content, accuracy is highest.' },
      { q: 'Can I get English subtitles from an Arabic video?', a: 'Yes. Transcribe the Arabic video, then use the Translate function to generate an English version. Download as SRT for subtitles or TXT for translation repurposing.' },
      { q: 'Is Arabic transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/chinese-transcription',
    title: 'Chinese Video Transcription – Transcribe Mandarin Videos Online | VideoText',
    description: 'Transcribe Chinese (Mandarin) videos and audio to text. Whisper AI. Upload video or audio, get full Chinese transcript. Export TXT, SRT, VTT. Free tier.',
    h1: 'Chinese Video Transcription — AI-Powered Online',
    intro: 'Transcribe Mandarin Chinese videos and audio to text with Whisper AI. Works for Simplified and Traditional Chinese content. Upload any video or audio file and get a full transcript. Export TXT, SRT, or VTT. Translate to English. Free tier.',
    breadcrumbLabel: 'Chinese Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/japanese-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'chinese-transcription',
    faq: [
      { q: 'Does it transcribe Mandarin Chinese accurately?', a: 'Yes. Whisper achieves around 8–12% WER on clear Mandarin audio. Set the language to Chinese (Simplified or Traditional) before processing. Accuracy is highest for standard Putonghua and lower for regional dialects like Cantonese.' },
      { q: 'Does it support Cantonese?', a: 'Whisper has basic Cantonese support, but accuracy is significantly lower than for Mandarin. For Cantonese-specific transcription, results are less reliable. Mandarin content gets the best results.' },
      { q: 'Can I transcribe a Chinese video and get English subtitles?', a: 'Yes. Upload and transcribe the Chinese video, then use the Translate function to generate English text. Download as SRT for subtitles.' },
      { q: 'What are common use cases for Chinese transcription?', a: 'YouTube channels and Bilibili creators publishing Mandarin content, corporate training videos for Chinese-speaking teams, academic lectures, podcast transcription, and subtitle generation for Chinese films or shows.' },
      { q: 'Is Chinese transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/japanese-transcription',
    title: 'Japanese Video Transcription – Transcribe Japanese Videos Online | VideoText',
    description: 'Transcribe Japanese videos and audio to text. Whisper AI. Upload video or audio, get accurate Japanese transcript with timestamps. Export TXT, SRT, VTT. Free tier.',
    h1: 'Japanese Video Transcription — AI-Powered Online',
    intro: 'Transcribe Japanese videos and audio to text with Whisper AI. Works for standard Japanese. Upload any video or audio file and get a full transcript with timestamps. Export TXT, SRT, or VTT. Translate to English. Free tier.',
    breadcrumbLabel: 'Japanese Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/chinese-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'japanese-transcription',
    faq: [
      { q: 'How accurate is Japanese transcription with Whisper?', a: 'Whisper achieves around 8–15% WER on clear Japanese audio. It outputs in kanji/hiragana/katakana as appropriate. For formal speech (news, presentations, lectures) accuracy is highest. Casual conversation and heavy regional dialect use may have more errors.' },
      { q: 'Does it output kanji, hiragana, and katakana correctly?', a: 'Yes. Whisper outputs Japanese in native script — the same mix of kanji, hiragana, and katakana you would expect in natural written Japanese. It does not romanize (romaji) the output by default.' },
      { q: 'Can I get English subtitles from a Japanese video?', a: 'Yes. Transcribe the Japanese video, then use the Translate function to generate English text. Download as SRT or VTT for subtitles.' },
      { q: 'Is Japanese transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/korean-transcription',
    title: 'Korean Video Transcription – Transcribe Korean Videos Online | VideoText',
    description: 'Transcribe Korean videos and audio to text. Whisper AI. Upload video or audio, get accurate Korean transcript. Export TXT, SRT, VTT. Korean subtitle generator. Free tier.',
    h1: 'Korean Video Transcription — AI-Powered Online',
    intro: 'Transcribe Korean videos and audio to text with Whisper AI. Works for standard Korean. Upload any video or audio file and get a full transcript. Export TXT, SRT, or VTT. Generate Korean subtitles or translate to English. Free tier.',
    breadcrumbLabel: 'Korean Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/japanese-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'korean-transcription',
    faq: [
      { q: 'How accurate is Korean transcription?', a: 'Whisper achieves around 10–15% WER on clear Korean audio. Accuracy is highest for standard Seoul Korean. For best results, set the language to Korean before processing.' },
      { q: 'Can I generate Korean subtitles for a video?', a: 'Yes. Upload your Korean video, use the Video to Subtitles tool, and download an SRT or VTT file with Korean text and timestamps. Upload to YouTube or burn into the video.' },
      { q: 'Can I transcribe a Korean video and get English subtitles?', a: 'Yes. Transcribe the Korean video, then use the Translate function to generate English text. Download as SRT for English subtitles.' },
      { q: 'What are common use cases for Korean transcription?', a: 'K-drama content creators, K-pop commentary channels, YouTube creators targeting Korean-speaking audiences, corporate content in Korean, and subtitle generation for Korean video content.' },
      { q: 'Is Korean transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/italian-transcription',
    title: 'Italian Video Transcription – Transcribe Italian Videos Online | VideoText',
    description: 'Transcribe Italian videos and audio to text. Whisper AI. Upload video or audio, get accurate Italian transcript. Export TXT, SRT, VTT. Free tier.',
    h1: 'Italian Video Transcription — AI-Powered Online',
    intro: 'Transcribe Italian videos and audio to text with Whisper AI. Works for standard Italian. Upload any video or audio file and get a full, accurate transcript. Export TXT, SRT, or VTT. Translate to English or other languages. Free tier.',
    breadcrumbLabel: 'Italian Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/translate-subtitles', '/subtitle-generator', '/french-transcription', '/video-to-transcript'],
    indexable: true,
    intentKey: 'italian-transcription',
    faq: [
      { q: 'How accurate is Italian transcription with Whisper?', a: 'Whisper achieves around 5–8% WER on clear Italian audio. Standard Italian (based on Florentine/Tuscan) gets the best results. Regional dialects may have higher error rates.' },
      { q: 'Can I get Italian subtitles from a video?', a: 'Yes. Upload the video, use the Video to Subtitles tool, and download an SRT or VTT file in Italian with timestamps.' },
      { q: 'Can I transcribe an Italian video and translate to English?', a: 'Yes. Upload and transcribe, then click Translate to English to get an English version alongside the Italian transcript.' },
      { q: 'Is Italian transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },

  // ── Cluster C: Competitor Alternative Pages ──────────────────────────────────
  {
    path: '/fireflies-alternative',
    title: 'Fireflies.ai Alternative – Better Meeting Transcription | VideoText',
    description: 'VideoText as a Fireflies.ai alternative. Transcribe meetings from any recording file. No bot joining your calls. Speaker labels, action items, SRT export. Free tier.',
    h1: 'Fireflies.ai Alternative',
    intro: 'Looking for a Fireflies.ai alternative? VideoText transcribes meetings from any recording file — no bot, no calendar access, no integrations required. Upload your MP4 and get a transcript with speaker labels, action items, and chapter navigation. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Fireflies.ai Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/zoom-recording-transcript', '/otter-ai-alternative', '/google-meet-transcript'],
    indexable: true,
    intentKey: 'fireflies-alternative',
    faq: [
      { q: 'How does VideoText compare to Fireflies.ai?', a: 'Fireflies.ai joins your meetings as a bot and transcribes live. VideoText transcribes from any recording file you upload — no bot, no calendar access, no integration required. Upload a Zoom, Teams, or Meet recording and get a transcript immediately. VideoText also does not retain your files after processing.' },
      { q: 'Why do people look for Fireflies alternatives?', a: 'Common reasons: privacy concerns about a bot joining confidential calls, the need to transcribe past recordings not captured by Fireflies, teams that do not want to grant calendar access to a third-party service, and users who want SRT/VTT subtitle export rather than meeting-note-only output.' },
      { q: 'Does VideoText support speaker labels like Fireflies?', a: 'Yes. After transcribing, open the Speakers branch to see each participant\'s contributions grouped by speaker turn. VideoText identifies speakers from audio cues rather than calendar identities, so names appear as Speaker 1, Speaker 2, etc.' },
      { q: 'Can I get meeting action items like Fireflies?', a: 'Yes. The Summary branch automatically extracts action items, decisions, and key points from any meeting transcript. This covers the core use case of Fireflies without requiring a bot or calendar integration.' },
      { q: 'Does VideoText work without installing anything?', a: 'Yes. VideoText is fully browser-based. No app, no extension, no bot. Upload the recording file and get results. Works on any device with a browser.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/riverside-alternative',
    title: 'Riverside.fm Alternative – Transcription Without the Recording Platform | VideoText',
    description: 'VideoText as a Riverside.fm alternative for transcription. Transcribe any podcast or interview recording. Speaker labels, show notes, SRT export. Free tier.',
    h1: 'Riverside.fm Alternative',
    intro: 'Looking for a Riverside.fm alternative for transcription? VideoText transcribes any podcast or interview recording — from Riverside, Zoom, Squadcast, or any other source. Upload the video or audio file and get speaker-labeled text, summary show notes, and keyword indexing. Free tier.',
    breadcrumbLabel: 'Riverside.fm Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/interview-transcription', '/fireflies-alternative', '/descript-alternative'],
    indexable: true,
    intentKey: 'riverside-alternative',
    faq: [
      { q: 'How does VideoText compare to Riverside for transcription?', a: 'Riverside.fm is a recording platform with built-in transcription on paid plans. VideoText is a dedicated transcription tool that works from any recording source. If you record on Riverside but want more transcription features — keyword indexing, SRT export, multi-language translation — VideoText adds those on top of your existing Riverside workflow.' },
      { q: 'Why do people look for Riverside transcription alternatives?', a: 'Common reasons: Riverside transcription is only available on paid plans, users want to transcribe older recordings made before using Riverside, teams want SRT/VTT subtitle output rather than just text, or users need multi-language translation of the transcript.' },
      { q: 'Can I transcribe a Riverside recording in VideoText?', a: 'Yes. Export your Riverside recording as MP4, upload it here, and get a full transcript with speaker labels and summary show notes.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/kapwing-alternative',
    title: 'Kapwing Alternative – Subtitle Generator Without the Video Editor | VideoText',
    description: 'VideoText as a Kapwing alternative for subtitles and transcription. Faster subtitle generation, no video editing required, no watermark on transcripts. Free tier.',
    h1: 'Kapwing Alternative',
    intro: 'Looking for a Kapwing alternative for subtitles or transcription? VideoText generates subtitles and transcripts without the full video editing suite. Upload your video and get SRT, VTT, or TXT in seconds — no timeline editor, no design tools, no watermark on transcripts. Free tier.',
    breadcrumbLabel: 'Kapwing Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/video-to-srt', '/descript-alternative', '/submagic-alternative'],
    indexable: true,
    intentKey: 'kapwing-alternative',
    faq: [
      { q: 'How does VideoText compare to Kapwing for subtitles?', a: 'Kapwing is a full video editor with subtitle features included. VideoText is purpose-built for transcription and subtitle generation — faster subtitle output, no editing overhead, and SRT/VTT export without requiring you to export a new video file.' },
      { q: 'Why do people look for Kapwing alternatives?', a: 'Common reasons: Kapwing adds a watermark on free tier exports, users only need subtitle files (not video editing), the editor is slower for simple subtitle tasks, or users want bulk subtitle processing rather than one-by-one video editing.' },
      { q: 'Does VideoText add a watermark?', a: 'Transcript exports (TXT, SRT, VTT) are available without a watermark on the free tier. Subtitle-burned video exports include a watermark on the free tier — upgrade to remove it.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/zubtitle-alternative',
    title: 'Zubtitle Alternative – Subtitle Generation Without Per-Video Pricing | VideoText',
    description: 'VideoText as a Zubtitle alternative. Generate subtitles from any video. Flat monthly pricing. SRT, VTT export. Speaker labels, transcript, translation. Free tier.',
    h1: 'Zubtitle Alternative',
    intro: 'Looking for a Zubtitle alternative? VideoText generates accurate subtitles from any video on a flat monthly plan — no per-video charges. Upload and get SRT, VTT, or burned-in captions. Includes transcript, speaker labels, and multi-language translation. Free tier.',
    breadcrumbLabel: 'Zubtitle Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/kapwing-alternative', '/submagic-alternative', '/video-to-srt'],
    indexable: true,
    intentKey: 'zubtitle-alternative',
    faq: [
      { q: 'How does VideoText compare to Zubtitle?', a: 'Zubtitle charges per video or per minute of video processed. VideoText uses a flat monthly subscription — process as many videos as your plan allows for one price. VideoText also adds transcript, speaker labels, and summary features that Zubtitle does not include.' },
      { q: 'Why do people look for Zubtitle alternatives?', a: 'Common reasons: per-video pricing becomes expensive for high-volume creators, users want a full transcript alongside subtitles, or users need SRT files rather than burned-in captions only.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/submagic-alternative',
    title: 'Submagic Alternative – AI Subtitle Generation Without the Price Tag | VideoText',
    description: 'VideoText as a Submagic alternative. Generate accurate AI subtitles. Export SRT, VTT, or burn captions into video. Full transcript included. Free tier.',
    h1: 'Submagic Alternative',
    intro: 'Looking for a Submagic alternative? VideoText generates AI-powered subtitles from any video with the same accuracy — plus a full transcript, speaker labels, and multi-language translation. Export SRT, VTT, or burn captions into video. Free tier.',
    breadcrumbLabel: 'Submagic Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/kapwing-alternative', '/zubtitle-alternative', '/video-to-srt'],
    indexable: true,
    intentKey: 'submagic-alternative',
    faq: [
      { q: 'How does VideoText compare to Submagic?', a: 'Submagic focuses on animated captions styled for short-form social content. VideoText focuses on accurate subtitle generation for any video — SRT/VTT files, burned-in captions, full transcripts, and multi-language support. If you need subtitle files rather than styled social captions, VideoText is the better fit.' },
      { q: 'Does VideoText support animated captions?', a: 'VideoText generates SRT/VTT files and can burn plain subtitles into video. Animated caption styles (pop-up words, color-highlighted captions) are Submagic\'s specialty. If styled social captions are the priority, Submagic may still be the right tool. If accurate transcription and SRT export matter, VideoText is stronger.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try.' },
    ],
  },
  {
    path: '/adobe-premiere-captions-alternative',
    title: 'Adobe Premiere Pro Captions Alternative – Faster Subtitle Export | VideoText',
    description: 'VideoText as an alternative to Adobe Premiere Pro captions. Generate SRT, VTT, or transcripts without a video editor. Faster, cheaper, no Adobe subscription required.',
    h1: 'Adobe Premiere Pro Captions Alternative',
    intro: 'Looking for an alternative to Adobe Premiere Pro\'s caption tools? VideoText generates SRT and VTT subtitle files directly from any video — no video editor, no Adobe subscription, no rendering required. Upload the video, download the SRT, and import it back into Premiere if needed. Free tier.',
    breadcrumbLabel: 'Adobe Premiere Captions Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/video-to-srt', '/kapwing-alternative', '/burn-subtitles-into-video'],
    indexable: true,
    intentKey: 'adobe-premiere-captions-alternative',
    faq: [
      { q: 'How does VideoText compare to Premiere Pro captions?', a: 'Premiere Pro\'s Speech to Text tool generates captions inside the editing timeline. VideoText generates an SRT or VTT file outside the editor in seconds — useful when you need captions quickly without opening Premiere, or when you want to generate captions for a video you are not actively editing.' },
      { q: 'Can I import VideoText SRT files back into Premiere Pro?', a: 'Yes. Download the SRT from VideoText, then in Premiere go to File → Import and import the SRT file. It appears as a caption track in your sequence, ready to style and export.' },
      { q: 'Does it work without an Adobe subscription?', a: 'Yes. VideoText requires no Adobe software. It runs entirely in the browser and exports SRT/VTT files compatible with Premiere, DaVinci Resolve, Final Cut Pro, and any NLE that accepts caption files.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try.' },
    ],
  },
  {
    path: '/whisper-online',
    title: 'Whisper AI Online – Use OpenAI Whisper in Your Browser | VideoText',
    description: 'Use OpenAI Whisper online — no setup, no Python, no GPU. Upload a video or audio file and get a Whisper-powered transcript instantly. Free tier. SRT, TXT export.',
    h1: 'Whisper AI Online — Use Whisper in Your Browser',
    intro: 'Use OpenAI\'s Whisper speech recognition model online — no Python, no local GPU, no command line. Upload any video or audio file and get a Whisper-powered transcript in seconds. VideoText runs Whisper server-side so you get the full model quality in your browser. Export TXT, SRT, VTT, or JSON. Free tier.',
    breadcrumbLabel: 'Whisper Online',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/audio-to-text', '/ai-transcription', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'whisper-online',
    faq: [
      { q: 'What is Whisper AI?', a: 'Whisper is an open-source speech recognition model developed by OpenAI. It achieves near-human accuracy across 90+ languages and was trained on 680,000 hours of multilingual audio. It is widely considered the most accurate freely available speech-to-text model as of 2024.' },
      { q: 'Can I use Whisper without installing Python or running a local server?', a: 'Yes. VideoText runs Whisper on its servers and exposes it through a browser interface. Upload your file, get results — no installation, no GPU, no Python environment. You get the same model quality as running Whisper locally, without any setup.' },
      { q: 'Which Whisper model does VideoText use?', a: 'VideoText uses large-v3, the most accurate Whisper model available. This model has the best accuracy for complex audio, accents, technical vocabulary, and non-English languages.' },
      { q: 'What file formats does Whisper support?', a: 'Any standard video or audio format: MP4, MOV, WebM, MKV, AVI, MP3, WAV, M4A, AAC, OGG, FLAC. Upload the file directly — no conversion needed.' },
      { q: 'What languages does Whisper support?', a: 'Whisper supports 90+ languages. Best accuracy for English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, and Korean. See the full language list on the OpenAI Whisper paper.' },
      { q: 'Is using Whisper online free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). No GPU or compute costs — VideoText absorbs the compute. Sign up for free to try.' },
    ],
  },
  {
    path: '/assembly-ai-alternative',
    title: 'AssemblyAI Alternative – Whisper-Powered Transcription Online | VideoText',
    description: 'VideoText as an AssemblyAI alternative. No API integration needed. Upload video or audio, get accurate AI transcript. Speaker labels, SRT export. Free tier.',
    h1: 'AssemblyAI Alternative',
    intro: 'Looking for an AssemblyAI alternative without API integration? VideoText provides browser-based transcription powered by Whisper — upload a file and get results immediately, no API key, no code, no developer setup. Speaker labels, SRT/VTT export, multi-language support. Free tier.',
    breadcrumbLabel: 'AssemblyAI Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/whisper-online', '/ai-transcription', '/otter-ai-alternative', '/video-to-transcript'],
    indexable: true,
    intentKey: 'assembly-ai-alternative',
    faq: [
      { q: 'How does VideoText compare to AssemblyAI?', a: 'AssemblyAI is a developer API for speech-to-text — you integrate it into your application via REST API. VideoText is a consumer web app — upload a file in the browser and get results with no code. If you need a browser tool for individual transcription tasks rather than programmatic integration, VideoText is a faster choice.' },
      { q: 'Why do people look for AssemblyAI alternatives?', a: 'Common reasons: teams need a non-developer UI for non-technical users, individual users who do not want to write code, projects that need a quick one-off transcription without API setup, or users who want richer output features (chapters, keyword indexing, translation) in a single interface.' },
      { q: 'Does VideoText support speaker labels like AssemblyAI?', a: 'Yes. After transcribing, open the Speakers branch to see speech grouped by speaker turn. VideoText does not require speaker count pre-configuration — it auto-detects from the audio.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/castmagic-alternative',
    title: 'Castmagic Alternative – Podcast Transcription Without the Content Suite | VideoText',
    description: 'VideoText as a Castmagic alternative for podcast transcription. Transcribe episodes, get show notes, speaker labels, SRT export. Simpler pricing. Free tier.',
    h1: 'Castmagic Alternative',
    intro: 'Looking for a Castmagic alternative? VideoText transcribes podcast episodes, generates show notes via Summary, and exports speaker-labeled transcripts — without the full AI content generation suite. Simpler tool, simpler pricing. Free tier.',
    breadcrumbLabel: 'Castmagic Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/interview-transcription', '/riverside-alternative', '/descript-alternative'],
    indexable: true,
    intentKey: 'castmagic-alternative',
    faq: [
      { q: 'How does VideoText compare to Castmagic?', a: 'Castmagic combines transcription with AI-generated social posts, blog articles, email newsletters, and other content repurposing outputs. VideoText focuses on accurate transcription, speaker labels, summary, and subtitle export. If you need a transcript and show notes without a full AI content factory, VideoText is simpler and less expensive.' },
      { q: 'Why do people look for Castmagic alternatives?', a: 'Common reasons: Castmagic pricing scales with podcast volume and can become expensive for high-frequency publishers, teams who only need transcription and show notes (not full content generation), or users who want SRT subtitle files from their podcast content.' },
      { q: 'Can I get podcast show notes from VideoText?', a: 'Yes. The Summary branch extracts key points, topics discussed, and action items from any transcript. This covers the core show notes use case at a simpler price point.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try.' },
    ],
  },

  // ── Cluster D: Audio Format Pages ────────────────────────────────────────────
  {
    path: '/mp3-to-text',
    title: 'MP3 to Text – Convert MP3 Audio to Text Online | VideoText',
    description: 'Convert MP3 audio files to text online. Upload your MP3 and get an accurate AI transcript in seconds. Free. Export TXT, SRT, or VTT. No signup for the free tier.',
    h1: 'MP3 to Text — Convert MP3 Audio to Text Online',
    intro: 'Convert MP3 audio files to text in seconds. Upload your MP3 — podcast episode, interview, lecture, voice memo, or music with lyrics — and get a full AI-powered transcript. Export as plain text, SRT subtitle file, or VTT. Powered by Whisper. Free tier, no credit card.',
    breadcrumbLabel: 'MP3 to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/wav-to-text', '/podcast-transcript', '/video-to-transcript'],
    indexable: true,
    intentKey: 'mp3-to-text',
    faq: [
      { q: 'How do I convert an MP3 to text?', a: 'Upload your MP3 file to VideoText. Our AI (powered by OpenAI Whisper) transcribes the audio and produces a full text transcript. Most MP3 files under 60 minutes process in 2–5 minutes. Download the result as TXT, SRT, or VTT.' },
      { q: 'What MP3 bitrates and sample rates are supported?', a: 'All standard MP3 bitrates (64kbps–320kbps) and sample rates (22kHz, 44.1kHz, 48kHz) are supported. Both mono and stereo MP3 files work correctly. 128kbps stereo is the most common podcast format and gives excellent transcription accuracy.' },
      { q: 'Can I convert an MP3 podcast to text for show notes?', a: 'Yes. This is one of the most common uses. Upload your MP3 episode, get the transcript, then use the Summary branch to generate show notes automatically. The summary extracts key topics, main points, and timestamps.' },
      { q: 'Can I get SRT subtitles from an MP3 file?', a: 'Yes. VideoText can generate a timed SRT file from any MP3. This is useful for creating captions for a video that uses audio-only source material, or for syncing text to audio in a media player.' },
      { q: 'What languages does MP3 transcription support?', a: 'Whisper supports 90+ languages. Upload an MP3 in any language and set the source language before processing for best accuracy. Transcription works for English, Spanish, French, German, Hindi, Arabic, Chinese, Japanese, Korean, and many others.' },
      { q: 'Is MP3 to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/wav-to-text',
    title: 'WAV to Text – Transcribe WAV Audio Files Online | VideoText',
    description: 'Convert WAV audio files to text online. Upload WAV and get a full AI transcript instantly. Free. Export TXT, SRT, or VTT. Supports all WAV sample rates.',
    h1: 'WAV to Text — Convert WAV Audio to Text Online',
    intro: 'Convert WAV audio files to text in seconds. Upload your WAV file — interview recording, field audio, studio session, or call recording — and get a full AI transcript powered by Whisper. Export as TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'WAV to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/mp3-to-text', '/audio-to-text', '/m4a-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'wav-to-text',
    faq: [
      { q: 'Can I transcribe a WAV file to text?', a: 'Yes. Upload your WAV file and our AI transcribes the speech to text. WAV is an uncompressed format that provides excellent audio quality for transcription — often better accuracy than compressed formats at equivalent content.' },
      { q: 'What WAV sample rates and bit depths are supported?', a: 'All standard WAV configurations are supported: 16kHz, 22kHz, 44.1kHz, 48kHz, 96kHz sample rates and 16-bit/24-bit/32-bit depths. Both PCM and IEEE float WAV files work. Mono and stereo are both supported.' },
      { q: 'Why use WAV instead of MP3 for transcription?', a: 'WAV is lossless — it preserves all audio fidelity without compression artifacts. For transcription, WAV files often produce slightly higher accuracy on difficult audio because the speech signal is not degraded by MP3 compression, particularly at lower bitrates.' },
      { q: 'Is WAV to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I get SRT subtitles from a WAV file?', a: 'Yes. VideoText generates timed SRT or VTT files from any audio or video input, including WAV. Upload the file, select subtitle output, and download the timed caption file.' },
    ],
  },
  {
    path: '/m4a-to-text',
    title: 'M4A to Text – Convert M4A Audio to Text Online | VideoText',
    description: 'Convert M4A audio files to text online. Upload M4A from iPhone voice memos, GarageBand, or any recorder and get a full AI transcript. Free. Export TXT, SRT, VTT.',
    h1: 'M4A to Text — Convert M4A Audio to Text Online',
    intro: 'Convert M4A audio files to text in seconds. Upload your M4A file — iPhone voice memo, GarageBand recording, iTunes podcast, or any AAC-encoded M4A — and get a full AI transcript powered by Whisper. Export as TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'M4A to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/mp3-to-text', '/wav-to-text', '/audio-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'm4a-to-text',
    faq: [
      { q: 'Can I transcribe an M4A file to text?', a: 'Yes. M4A is a fully supported audio format. Upload your M4A and get a full text transcript. M4A is the default format for iPhone Voice Memos and many mobile recording apps.' },
      { q: 'Where do M4A files come from?', a: 'M4A files are most common from: iPhone/iPad Voice Memos, GarageBand, iTunes podcast downloads, Android voice recorders, and many professional audio interfaces that export AAC audio.' },
      { q: 'Is M4A transcription as accurate as MP3?', a: 'Yes, M4A (AAC encoding) generally provides equal or better accuracy compared to MP3 at the same bitrate because AAC is a more efficient codec that preserves more audio detail. Standard iPhone Voice Memos at 128kbps AAC transcribe with high accuracy.' },
      { q: 'Is M4A to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/aac-to-text',
    title: 'AAC to Text – Transcribe AAC Audio Files Online | VideoText',
    description: 'Convert AAC audio files to text online. Upload AAC and get a full AI transcript. Free. Export TXT, SRT, or VTT. Powered by Whisper.',
    h1: 'AAC to Text — Convert AAC Audio to Text Online',
    intro: 'Convert AAC audio files to text in seconds. Upload your AAC file and get a full AI transcript powered by Whisper. AAC is the audio codec used in M4A files, iPhone recordings, and many streaming audio formats. Export TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'AAC to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/m4a-to-text', '/mp3-to-text', '/audio-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'aac-to-text',
    faq: [
      { q: 'Can I transcribe an AAC audio file?', a: 'Yes. AAC is supported directly. Upload your .aac file and get a full transcript. AAC is the underlying codec in M4A containers and is used by iOS, Android, and many streaming platforms.' },
      { q: 'What is the difference between AAC and M4A?', a: 'AAC (Advanced Audio Coding) is the audio codec. M4A is a container format that typically contains AAC audio. An .aac file is raw AAC without the M4A container. Both are supported by VideoText without any conversion.' },
      { q: 'Is AAC to text transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/mkv-to-text',
    title: 'MKV to Text – Transcribe MKV Video Files Online | VideoText',
    description: 'Convert MKV video files to text online. Upload MKV and get a full AI transcript. Free. Export TXT, SRT, or VTT. Powered by Whisper.',
    h1: 'MKV to Text — Convert MKV Video to Text Online',
    intro: 'Convert MKV video files to text in seconds. Upload your MKV file — Matroska video from OBS recordings, downloads, or any MKV source — and get a full AI transcript powered by Whisper. Export as TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'MKV to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/avi-to-text', '/mp4-to-text', '/webm-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'mkv-to-text',
    faq: [
      { q: 'Can I transcribe an MKV file to text?', a: 'Yes. MKV (Matroska Video) is supported. Upload your MKV file and get a full transcript. Most MKV files contain H.264 or H.265 video with AAC or AC3 audio — all handled automatically.' },
      { q: 'Where do MKV files come from?', a: 'MKV files are common for: OBS Studio screen and game recordings, downloaded video content, anime and subtitled video files, and video archives from media servers like Plex.' },
      { q: 'Can I get SRT subtitles from an MKV file?', a: 'Yes. Upload your MKV, use the Video to Subtitles tool, and download an SRT file with accurate timestamps. You can then remux the SRT back into the MKV or use it separately.' },
      { q: 'Is MKV to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/avi-to-text',
    title: 'AVI to Text – Transcribe AVI Video Files Online | VideoText',
    description: 'Convert AVI video files to text online. Upload AVI and get a full AI transcript. Free. Export TXT, SRT, or VTT. Powered by Whisper.',
    h1: 'AVI to Text — Convert AVI Video to Text Online',
    intro: 'Convert AVI video files to text in seconds. Upload your AVI file and get a full AI transcript powered by Whisper. AVI is a legacy Windows video format still common in older recordings and archives. Export as TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'AVI to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/mkv-to-text', '/mp4-to-text', '/mov-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'avi-to-text',
    faq: [
      { q: 'Can I transcribe an AVI file to text?', a: 'Yes. AVI is supported. Upload your AVI file and get a full transcript. AVI files commonly contain DivX, Xvid, or MPEG-4 video with MP3 or PCM audio.' },
      { q: 'Where do AVI files come from?', a: 'AVI is common for: older camcorder recordings, legacy Windows Movie Maker projects, older screen recording software, and archived video files from the early 2000s–2010s.' },
      { q: 'Is AVI transcription as accurate as MP4?', a: 'Accuracy depends on the audio quality in the file, not the container format. AVI files with clear speech at standard audio bitrates transcribe with the same accuracy as MP4.' },
      { q: 'Is AVI to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/ogg-to-text',
    title: 'OGG to Text – Transcribe OGG Audio Files Online | VideoText',
    description: 'Convert OGG audio files to text online. Upload OGG Vorbis files and get a full AI transcript. Free. Export TXT, SRT, or VTT. Powered by Whisper.',
    h1: 'OGG to Text — Convert OGG Audio to Text Online',
    intro: 'Convert OGG audio files to text in seconds. Upload your OGG file — podcast export, game audio, or any Ogg Vorbis recording — and get a full AI transcript powered by Whisper. Export as TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'OGG to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/mp3-to-text', '/wav-to-text', '/audio-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'ogg-to-text',
    faq: [
      { q: 'Can I transcribe an OGG file to text?', a: 'Yes. OGG (Ogg Vorbis) is supported. Upload your .ogg file and get a full text transcript.' },
      { q: 'Where do OGG files come from?', a: 'OGG files are common for: open-source audio exports (Audacity, Ardour), game audio assets, Linux-based recording software, and some podcast platforms that use open formats.' },
      { q: 'Is OGG to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  // ── Cluster E: Journalist & Student Pages ────────────────────────────────────
  {
    path: '/transcription-for-journalists',
    title: 'Transcription Tool for Journalists – Fast Interview & Press Conference Transcription | VideoText',
    description:
      'Transcription software built for journalists. Transcribe interview recordings, press conferences, and field audio to text in seconds. Speaker labels, exact quotes, free tier. Used by reporters, news writers, and freelance journalists.',
    h1: 'Transcription Tool for Journalists',
    intro:
      'Journalists need accurate transcripts fast — for quotes, fact-checking, and story filing. VideoText transcribes interview recordings, press conference audio, phone calls, and field recordings to text in seconds. Get speaker-labeled quotes, searchable full text, and export as TXT or SRT. Works with every format you record in: MP4, MP3, WAV, M4A. Free tier — no credit card.',
    breadcrumbLabel: 'Transcription for Journalists',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/interview-transcription',
      '/press-conference-transcription',
      '/speaker-diarization',
      '/best-transcription-tool-for-journalists',
      '/mp3-to-text',
    ],
    indexable: true,
    intentKey: 'transcription-for-journalists',
    faq: [
      {
        q: 'Is VideoText accurate enough for journalism?',
        a: 'VideoText uses OpenAI Whisper large-v3 with ~97–99% word accuracy on clear speech. For journalism, always verify quotes against the original recording before publishing — AI transcription may mishear proper nouns, names, and technical jargon. The transcript dramatically speeds up review but does not replace a final listen-back.',
      },
      {
        q: 'Can I transcribe a phone interview recording?',
        a: 'Yes. Upload the recording as MP3, M4A, or WAV. Phone call quality (8kHz) transcribes at lower accuracy than in-person or VOIP recordings. For better results, use a call recording app that captures both sides in higher quality (e.g., Recorder on Android, TapeACall, or Zoom audio).',
      },
      {
        q: 'Does it separate the interviewer and interviewee in the transcript?',
        a: 'Yes. Open the Speakers branch after transcribing — speech is grouped by speaker turn (Speaker 1, Speaker 2). For two-person interviews this clearly separates Q and A. Rename speakers to real names by editing the labels.',
      },
      {
        q: 'Can I transcribe a press conference recording?',
        a: 'Yes. Upload your press conference MP4 or audio file. Multi-speaker press conferences work well — the AI labels each speaker turn. For best accuracy with multiple microphones or a room full of questions, use a recording captured from the main PA feed rather than ambient room audio.',
      },
      {
        q: 'Does VideoText delete my files after transcription?',
        a: 'Yes. Your file is deleted immediately after processing completes. Nothing is stored on our servers — important for sensitive sources and embargoed material.',
      },
      {
        q: 'What file formats do journalists typically use?',
        a: 'Common formats supported: MP3 (most voice recorders), M4A (iPhone Voice Memos), MP4 (video interviews, Zoom calls), WAV (broadcast-quality field recorders), AAC, OGG, FLAC. No conversion needed before upload.',
      },
      {
        q: 'Is there a deadline-friendly fast turnaround?',
        a: 'Yes. Most files transcribe in 30–90 seconds for short clips; a 60-minute interview typically finishes in 5–8 minutes. Results stream in real time as each segment completes — you can start reading before the full file is done.',
      },
    ],
  },
  {
    path: '/transcription-for-students',
    title: 'Transcription Tool for Students – Transcribe Lectures, Classes & Interviews Free | VideoText',
    description:
      'Free transcription tool for students. Transcribe lecture recordings, class sessions, professor interviews, and study group audio to text. Searchable notes, chapter navigation, keyword index. No credit card.',
    h1: 'Transcription Tool for Students',
    intro:
      'Turn any recorded lecture, class session, or study interview into searchable, shareable notes. Upload your recording (MP4 from Zoom class, MP3 from your recorder, M4A from iPhone) and get a full text transcript in seconds. Use Keywords to index every topic, Chapters to navigate by section, and Translate to study in your native language. Free tier — 3 imports per month, no credit card.',
    breadcrumbLabel: 'Transcription for Students',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/lecture-transcription',
      '/keyword-indexed-transcript',
      '/video-chapters-generator',
      '/best-transcription-tool-for-students',
      '/zoom-recording-transcript',
    ],
    indexable: true,
    intentKey: 'transcription-for-students',
    faq: [
      {
        q: 'Is VideoText free for students?',
        a: 'Yes. The free tier includes 3 imports per month with no credit card required. Most students can transcribe all their key lectures and interviews within the free limit. Sign up for free to start.',
      },
      {
        q: 'Can I transcribe a Zoom lecture recording?',
        a: 'Yes. Download the Zoom recording as MP4 from the Zoom cloud or your local Zoom folder, then upload it here. Works for any Zoom class, seminar, or office-hours recording.',
      },
      {
        q: 'How do I use the transcript for studying?',
        a: 'Paste it into Notion, Obsidian, or Google Docs and highlight key concepts. Use the Keywords branch to find every time a term was mentioned. Use Chapters to jump to specific lecture sections. Use Ctrl+F to search for anything the professor said.',
      },
      {
        q: 'Can I transcribe an iPhone lecture recording?',
        a: 'Yes. iPhone Voice Memos saves as M4A — upload directly, no conversion needed. Screen recordings from an iPad also work as MP4. Most campus recording devices export MP3 or WAV, both supported.',
      },
      {
        q: 'Does it support technical or academic terminology?',
        a: 'Whisper large-v3 handles most academic vocabulary well. Accuracy is highest for clearly spoken English. For highly specialized jargon or strong accents, review the transcript against the recording for critical terms.',
      },
      {
        q: 'Can I share the transcript with classmates?',
        a: 'Yes. Download the TXT file and share it via Google Drive, email, or your LMS. The transcript can also be pasted into a collaborative note document.',
      },
      {
        q: 'Does it support non-English lectures?',
        a: 'Yes. Whisper supports 90+ languages. Set the spoken language before processing for best accuracy. After transcribing, use the Translate branch to get a version in English, Spanish, Hindi, French, Chinese, or Russian.',
      },
    ],
  },
  {
    path: '/best-transcription-tool-for-journalists',
    title: 'Best Transcription Tool for Journalists 2026 – Fast, Accurate, Private | VideoText',
    description:
      'Best transcription tool for journalists in 2026. Transcribe interviews, press conferences, and field audio fast. Speaker labels, exact quotes, files deleted after processing. Free tier.',
    h1: 'Best Transcription Tool for Journalists',
    intro:
      'The best transcription tool for journalists combines speed, accuracy, and privacy. VideoText transcribes interview recordings, press conferences, and field audio in seconds using Whisper large-v3. Get speaker-labeled quotes, full-text search, and SRT export — files are deleted immediately after processing. Free tier, no credit card.',
    breadcrumbLabel: 'Best Transcription Tool for Journalists',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/transcription-for-journalists',
      '/interview-transcription',
      '/press-conference-transcription',
      '/speaker-diarization',
    ],
    indexable: true,
    intentKey: 'best-transcription-tool-for-journalists',
    faq: [
      {
        q: 'What makes a transcription tool good for journalism?',
        a: 'Key factors: accuracy (Whisper large-v3 ~97–99% on clear speech), speed (30–90 seconds for short clips), speaker separation (Q&A format), privacy (files deleted after processing), and format support (MP3, M4A, WAV, MP4 from any recorder).',
      },
      {
        q: 'Does VideoText keep my interview recordings?',
        a: 'No. Your file is deleted immediately after transcription completes. No storage, no retention — important for protecting sources and sensitive embargoed content.',
      },
      {
        q: 'Is VideoText free for journalists?',
        a: 'Yes. Free tier includes 3 imports per month with no credit card. Paid plans start at $19/month for 450 minutes — enough for most active reporters.',
      },
    ],
  },
  {
    path: '/best-transcription-tool-for-students',
    title: 'Best Free Transcription Tool for Students 2026 | VideoText',
    description:
      'Best free transcription tool for students in 2026. Transcribe lectures, class recordings, and interviews. Chapters, keywords, translate to your language. No credit card. Free tier.',
    h1: 'Best Free Transcription Tool for Students',
    intro:
      'The best transcription tool for students is free, accurate, and built for lecture recordings. VideoText transcribes class recordings, Zoom lectures, and research interviews with chapter navigation and keyword indexing — all free to start. No credit card, no download.',
    breadcrumbLabel: 'Best Transcription Tool for Students',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/transcription-for-students',
      '/lecture-transcription',
      '/keyword-indexed-transcript',
      '/video-chapters-generator',
    ],
    indexable: true,
    intentKey: 'best-transcription-tool-for-students',
    faq: [
      {
        q: 'Why do students need a transcription tool?',
        a: 'Lecture transcripts make studying more efficient: you can search for any term, copy definitions directly into notes, review sections you missed, share notes with classmates, and create summaries without re-listening to the whole recording.',
      },
      {
        q: 'What is the best free transcription tool for students?',
        a: 'VideoText offers 3 free imports per month with no credit card. Whisper large-v3 accuracy is among the best available. You get chapters, keywords, speaker labels, translation, and TXT/SRT export — all in the free tier.',
      },
      {
        q: 'Is VideoText better than Otter.ai for students?',
        a: 'VideoText and Otter.ai both offer free tiers. VideoText gives you more export formats (SRT, VTT, JSON), chapter navigation, keyword indexing, and instant translation. Otter.ai offers live recording in its app. For already-recorded lectures and class sessions, VideoText is more feature-complete.',
      },
    ],
  },
  {
    path: '/press-conference-transcription',
    title: 'Press Conference Transcription – Convert Press Conferences to Text | VideoText',
    description:
      'Transcribe press conference recordings to text online. Upload video or audio of any press conference and get a full, speaker-labeled transcript in seconds. Free. Used by journalists, PR teams.',
    h1: 'Press Conference Transcription — Convert Press Conferences to Text',
    intro:
      'Transcribe press conference recordings to text quickly and accurately. Upload your press conference video (MP4, MOV) or audio (MP3, WAV) and get a full transcript with speaker labels. Use Speakers to track who said what across multiple officials and journalists, and Summary to extract key announcements. Free tier — perfect for journalists, PR teams, and communications professionals.',
    breadcrumbLabel: 'Press Conference Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/interview-transcription',
      '/transcription-for-journalists',
      '/speaker-diarization',
      '/mp4-to-text',
    ],
    indexable: true,
    intentKey: 'press-conference-transcription',
    faq: [
      {
        q: 'Can I transcribe a press conference with multiple speakers?',
        a: 'Yes. After transcribing, the Speakers branch groups speech by speaker turn. Multiple officials, moderators, and journalists asking questions are each assigned a separate speaker label. For recordings from a PA feed or broadcast stream, speaker separation is cleanest.',
      },
      {
        q: 'What formats work for press conference recordings?',
        a: 'MP4, MOV, AVI, WebM (video) and MP3, WAV, M4A (audio). Broadcast recordings from TV streams, official government YouTube feeds, and recorder files from press pools all work without conversion.',
      },
      {
        q: 'Can I get a summary of the key announcements?',
        a: 'Yes. The Summary branch automatically extracts key decisions, statements, and action items from the transcript. Useful for generating a quick brief without reading the full transcript.',
      },
      {
        q: 'Is press conference transcription free?',
        a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try. Paid plans start at $19/month for 450 minutes.',
      },
    ],
  },
  {
    path: '/research-interview-transcription',
    title: 'Research Interview Transcription – Qualitative Research Transcription | VideoText',
    description:
      'Transcribe research interviews to text for qualitative analysis. Upload interview recordings and get speaker-labeled, accurate transcripts. Export TXT or SRT. Free tier. Used by researchers, academics, PhD students.',
    h1: 'Research Interview Transcription — For Qualitative Research',
    intro:
      'Transcribe research interviews, focus groups, and fieldwork recordings for qualitative analysis. Upload your audio or video interview and get an accurate, speaker-labeled transcript in seconds. Export as TXT for coding in NVivo, Atlas.ti, or any QDAS software. Free tier — widely used by PhD students, academic researchers, and social scientists.',
    breadcrumbLabel: 'Research Interview Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/interview-transcription',
      '/transcription-for-students',
      '/speaker-diarization',
      '/qualitative-research-transcription',
    ],
    indexable: true,
    intentKey: 'research-interview-transcription',
    faq: [
      {
        q: 'Can I use VideoText transcripts for qualitative research?',
        a: 'Yes. Export the transcript as TXT and import it into NVivo, Atlas.ti, MAXQDA, or any qualitative data analysis software (QDAS) for coding. The plain-text output is compatible with all major QDAS tools.',
      },
      {
        q: 'Does it support verbatim transcription?',
        a: 'The transcript captures all spoken words without paraphrasing. Whisper does not transcribe non-verbal sounds (um, uh) consistently — for fully verbatim transcription that includes every hesitation, review and edit the AI transcript against the recording.',
      },
      {
        q: 'Can I transcribe focus group recordings?',
        a: 'Yes. Upload the focus group recording. The Speakers branch separates participants by voice turn. For groups larger than 6–8 participants or recordings with significant crosstalk, accuracy of speaker separation decreases — a research-grade recording setup improves results.',
      },
      {
        q: 'Is my interview data kept private?',
        a: 'Yes. VideoText processes and immediately deletes your file — nothing is stored. Important for research involving human subjects and IRB/ethics board requirements for data minimization.',
      },
      {
        q: 'Is it free for PhD students and academic researchers?',
        a: 'Yes. Free tier includes 3 imports per month with no credit card. Most dissertation students use the paid tier ($10/month) during intensive fieldwork periods.',
      },
    ],
  },
  {
    path: '/qualitative-research-transcription',
    title: 'Qualitative Research Transcription – Transcribe Interviews for QDAS | VideoText',
    description:
      'Transcription for qualitative research. Transcribe interviews, focus groups, and fieldwork audio for NVivo, Atlas.ti, and MAXQDA. Speaker labels. Files deleted after processing. Free tier.',
    h1: 'Qualitative Research Transcription',
    intro:
      'Accurate transcription for qualitative research workflows. Upload research interviews, focus groups, and fieldwork recordings — get a speaker-labeled TXT transcript ready to import into NVivo, Atlas.ti, MAXQDA, or Dedoose. VideoText uses Whisper large-v3 for high accuracy. Files are deleted immediately after processing — meeting data minimization requirements. Free tier.',
    breadcrumbLabel: 'Qualitative Research Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/research-interview-transcription',
      '/interview-transcription',
      '/speaker-diarization',
      '/transcription-for-students',
    ],
    indexable: true,
    intentKey: 'qualitative-research-transcription',
    faq: [
      {
        q: 'What qualitative analysis software does VideoText output work with?',
        a: 'The plain TXT transcript imports directly into NVivo, Atlas.ti, MAXQDA, Dedoose, and HyperRESEARCH. The SRT export with timestamps can be used for time-coded analysis. Most QDAS tools accept TXT and can split by speaker turn if the transcript is formatted with speaker labels.',
      },
      {
        q: 'Does the transcript include speaker labels for thematic coding?',
        a: 'Yes. The Speakers branch produces a transcript segmented by speaker turn (Speaker 1, Speaker 2, etc.), which is the standard format for qualitative interview coding. You can label each speaker with participant pseudonyms before importing into QDAS.',
      },
      {
        q: 'How does VideoText handle data privacy for research participants?',
        a: 'VideoText processes and immediately deletes your file — no retention, no cloud storage of transcripts. This supports IRB/ethics board data minimization requirements. Your participants\' audio is not stored on any server after processing.',
      },
      {
        q: 'Is VideoText free for academic research?',
        a: 'Yes. Free tier includes 3 imports per month with no credit card. For intensive fieldwork, the $10/month plan provides 200 minutes and the $19/month plan provides 450 minutes.',
      },
    ],
  },
  {
    path: '/journalism-transcription',
    title: 'Journalism Transcription – Transcribe Interviews & Field Audio | VideoText',
    description:
      'Transcription for journalism. Transcribe recorded interviews, press conferences, and field audio to text. Speaker labels, fast turnaround, files deleted after processing. Free tier.',
    h1: 'Journalism Transcription — Interviews, Press Conferences & Field Audio',
    intro:
      'Transcribe journalism recordings — interviews, press conferences, source calls, and field audio — to accurate, speaker-labeled text. VideoText handles every format journalists record in: MP3 from voice recorders, M4A from iPhones, MP4 from cameras and Zoom. Files are deleted immediately after transcription. Free tier with no credit card.',
    breadcrumbLabel: 'Journalism Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/transcription-for-journalists',
      '/interview-transcription',
      '/press-conference-transcription',
      '/speaker-diarization',
      '/mp3-to-text',
    ],
    indexable: true,
    intentKey: 'journalism-transcription',
    faq: [
      {
        q: 'What journalism recording formats does VideoText support?',
        a: 'MP3 (most digital voice recorders), M4A (iPhone Voice Memos), MP4 (Zoom, Teams, Skype video calls), WAV (broadcast field recorders), AAC, FLAC. Upload any of these directly without conversion.',
      },
      {
        q: 'How quickly can I get a transcript for a deadline?',
        a: 'Most files transcribe in 30–90 seconds for short clips. A 60-minute interview typically finishes in 5–8 minutes. Results stream in real time as segments complete — you can start pulling quotes before the full file is done.',
      },
      {
        q: 'Does it label speakers so I can track quotes?',
        a: 'Yes. The Speakers branch separates speech by speaker turn. For a two-person interview you get clear Journalist/Source separation. Multi-person press conferences are also labeled by turn.',
      },
      {
        q: 'Are my files and sources protected?',
        a: 'Yes. VideoText does not store files — your recording is deleted immediately after transcription. No cloud retention, no logs of content. Important for source protection and embargoed material.',
      },
      {
        q: 'Is journalism transcription free?',
        a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try. No credit card.',
      },
    ],
  },
  {
    path: '/academic-transcription',
    title: 'Academic Transcription – Transcribe Research & Lecture Recordings | VideoText',
    description:
      'Academic transcription for students and researchers. Transcribe lectures, research interviews, seminars, and fieldwork audio to text. Chapters, keywords, speaker labels. Free tier.',
    h1: 'Academic Transcription — Lectures, Research Interviews & Seminars',
    intro:
      'Academic transcription for university students, PhD researchers, and educators. Upload lecture recordings, research interviews, seminar discussions, and fieldwork audio — get accurate, speaker-labeled transcripts in seconds. Chapter navigation helps you review by topic; keyword indexing makes every concept searchable. Export TXT for note apps or SRT for accessible video. Free tier.',
    breadcrumbLabel: 'Academic Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: [
      '/transcription-for-students',
      '/lecture-transcription',
      '/research-interview-transcription',
      '/keyword-indexed-transcript',
      '/video-chapters-generator',
    ],
    indexable: true,
    intentKey: 'academic-transcription',
    faq: [
      {
        q: 'What academic recordings can I transcribe?',
        a: 'Lecture recordings (Zoom, Panopto, Echo360), research interviews, focus groups, seminar discussions, thesis defenses, conference presentations, faculty talks, field recordings, and oral history interviews.',
      },
      {
        q: 'How can I use lecture transcripts for accessibility?',
        a: 'Under ADA and Section 508, video content in educational settings should include captions or transcripts for deaf and hard-of-hearing students. VideoText generates both — use SRT for captioned video upload or TXT as a standalone transcript document.',
      },
      {
        q: 'Can I search a lecture transcript for specific concepts?',
        a: 'Yes. The Keywords branch indexes every key term and shows where each appears in the transcript. Use Ctrl+F in the transcript view to search for any word or phrase the lecturer mentioned.',
      },
      {
        q: 'Is academic transcription free for students?',
        a: 'Yes. Free tier includes 3 imports per month with no credit card. Most students cover their key lectures within the free limit.',
      },
      {
        q: 'What languages does academic transcription support?',
        a: 'Whisper supports 90+ languages. Set the spoken language before processing. After transcribing, use Translate to get the transcript in English, Spanish, Hindi, French, Chinese, or Russian.',
      },
    ],
  },

  // ── Cluster F: FLAC ───────────────────────────────────────────────────────────
  {
    path: '/flac-to-text',
    title: 'FLAC to Text – Transcribe FLAC Audio Files Online | VideoText',
    description: 'Convert FLAC audio files to text online. Upload lossless FLAC audio and get a full AI transcript. Free. Export TXT, SRT, or VTT. Powered by Whisper.',
    h1: 'FLAC to Text — Convert FLAC Audio to Text Online',
    intro: 'Convert FLAC lossless audio files to text in seconds. Upload your FLAC file — studio recording, archival audio, or any lossless source — and get a full AI transcript powered by Whisper. FLAC\'s lossless quality can improve accuracy for difficult audio. Export TXT, SRT, or VTT. Free tier.',
    breadcrumbLabel: 'FLAC to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/wav-to-text', '/mp3-to-text', '/audio-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'flac-to-text',
    faq: [
      { q: 'Can I transcribe a FLAC file to text?', a: 'Yes. FLAC is supported. Upload your .flac file and get a full transcript. FLAC is a lossless format that preserves all audio fidelity, which can improve transcription accuracy for recordings with subtle speech details.' },
      { q: 'Does lossless FLAC give better transcription accuracy than MP3?', a: 'For clearly recorded speech, MP3 at 128kbps and FLAC give similar accuracy. FLAC may give measurably better results for: low-quality source recordings where compression artifacts in MP3 degrade speech, high-frequency details in accented or quiet speech, and archival audio from older recordings.' },
      { q: 'Is FLAC to text conversion free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },

  // ── Cluster G: Meeting Platform Alternatives ────────────────────────────────
  {
    path: '/zoom-alternative',
    title: 'Best Zoom Transcription Alternative – No Account Lock-In | VideoText',
    description:
      "Zoom's built-in transcription requires a paid plan and keeps recordings in Zoom's cloud. VideoText transcribes any Zoom MP4 in minutes — no Zoom account needed. Speaker labels, summary, free tier.",
    h1: 'Zoom Transcription Alternative',
    intro:
      "Zoom's built-in AI Companion transcription is locked to Business/Enterprise plans and keeps your recordings in Zoom's cloud. VideoText is a drop-in replacement: download your Zoom MP4, upload it here, and get a speaker-labeled transcript in minutes — no Zoom account, no cloud lock-in. Files deleted after processing. Free tier.",
    breadcrumbLabel: 'Zoom Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/zoom-recording-transcript', '/microsoft-teams-alternative', '/webex-alternative', '/meeting-transcript'],
    indexable: true,
    intentKey: 'zoom-alternative',
    faq: [
      { q: 'Why use VideoText instead of Zoom\'s built-in transcription?', a: 'Zoom AI Companion transcription requires a Business or Enterprise plan ($20+/month per user). VideoText works with any Zoom recording on any plan — download the MP4 and upload it. No Zoom account connection needed. Files are deleted immediately after processing.' },
      { q: 'Does VideoText give better transcription than Zoom?', a: 'VideoText uses Whisper large-v3 (~97–99% word accuracy on clear speech). Zoom\'s accuracy is comparable but its output is less structured — VideoText adds speaker labels, summary, chapters, and keyword index on top of the raw transcript.' },
      { q: 'How do I get my Zoom recording to transcribe?', a: 'Cloud recordings: zoom.us → Recordings → Download the MP4. Local recordings: Documents/Zoom folder on your computer. Upload the MP4 to VideoText and get a transcript in 5–8 minutes for a 60-minute call.' },
      { q: 'Does VideoText store my Zoom recordings?', a: 'No. Your file is deleted immediately after transcription. Zoom stores cloud recordings until you manually delete them — VideoText has zero retention.' },
      { q: 'Is VideoText free for Zoom transcription?', a: 'Yes. Free tier includes 3 imports per month. No credit card. Paid plans start at $19/month for 450 minutes.' },
    ],
  },
  {
    path: '/microsoft-teams-alternative',
    title: 'Microsoft Teams Transcription Alternative – No Copilot License Needed | VideoText',
    description:
      "Teams transcription needs Microsoft 365 Copilot ($30/user/month extra). VideoText transcribes any Teams MP4 recording without a Copilot license. Speaker labels, summary, free tier.",
    h1: 'Microsoft Teams Transcription Alternative',
    intro:
      "Microsoft Teams' AI transcription and meeting notes require Microsoft 365 Copilot — an add-on that costs $30/user/month on top of your existing 365 plan. VideoText transcribes any Teams recording without Copilot: download the meeting MP4, upload it here, and get speaker-labeled text in minutes. Free tier, no Microsoft account needed.",
    breadcrumbLabel: 'Microsoft Teams Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/zoom-alternative', '/webex-alternative', '/meeting-transcript', '/teams-meeting-transcript'],
    indexable: true,
    intentKey: 'microsoft-teams-alternative',
    faq: [
      { q: 'Do I need Microsoft 365 Copilot to transcribe Teams meetings?', a: 'No — not with VideoText. Download your Teams meeting recording as MP4, upload it here, and get a full speaker-labeled transcript. Copilot costs $30/user/month extra; VideoText starts free.' },
      { q: 'How do I download a Teams meeting recording?', a: 'In Microsoft Teams: go to the Chat or Channel where the meeting was recorded → find the recording → click the three-dot menu → Download. The file saves as MP4. For OneDrive-stored recordings, open SharePoint/OneDrive, find the recording, and download it.' },
      { q: 'Does VideoText support Teams recordings with multiple speakers?', a: 'Yes. The Speakers branch separates speech by speaker turn. For Teams calls with multiple participants, each person\'s speech is labeled separately.' },
      { q: 'Is VideoText cheaper than Microsoft Copilot for transcription?', a: 'Yes. Microsoft 365 Copilot costs $30/user/month per person. VideoText free tier costs $0. Paid plans start at $19/month for the whole team\'s transcription needs.' },
    ],
  },
  {
    path: '/panopto-alternative',
    title: 'Best Panopto Alternative for Transcription – Export Captions & Text | VideoText',
    description:
      "Panopto's auto-captions are locked inside the platform and hard to export. VideoText transcribes any Panopto video download — full text, SRT export, chapters, keywords. Free tier for students.",
    h1: 'Panopto Alternative — Transcribe Panopto Videos to Text',
    intro:
      "Panopto provides auto-captions inside its viewer, but exporting them as a clean text file or SRT is restricted and often requires admin access. VideoText is a simple alternative: download the Panopto video, upload it here, and get a full transcript with chapters, keywords, and SRT export in minutes. Free tier — widely used by students and educators.",
    breadcrumbLabel: 'Panopto Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/panopto-transcription', '/lecture-transcription', '/transcription-for-students', '/video-chapters-generator'],
    indexable: true,
    intentKey: 'panopto-alternative',
    faq: [
      { q: 'Can I transcribe a Panopto lecture video?', a: 'Yes. Download the Panopto video as MP4 (using the Panopto download option or your institution\'s export), upload it to VideoText, and get a full transcript with speaker labels, chapters, and keywords.' },
      { q: 'How do I download a Panopto video?', a: 'In Panopto: open the video → Settings (gear icon) → Downloads tab → download the MP4. If downloads are disabled by your institution, you can use the Panopto desktop app or request the file from your instructor. Once you have the MP4, upload it to VideoText.' },
      { q: 'Is VideoText better than Panopto\'s built-in captions?', a: 'VideoText gives you exported text (TXT, SRT) you can paste into notes, share, or use for accessibility compliance. Panopto\'s auto-captions are display-only inside the player — no export, no keyword search across transcripts, no chapter generation.' },
      { q: 'Is VideoText free for students using Panopto?', a: 'Yes. Free tier includes 3 imports per month — enough for most students to cover their key lecture videos. No credit card required.' },
    ],
  },
  {
    path: '/panopto-transcription',
    title: 'Panopto Transcription – Export Panopto Lecture Captions to Text | VideoText',
    description:
      'Transcribe Panopto lecture videos to full text. Download the video, upload to VideoText, and get a searchable transcript with chapters and keywords. Free. Used by students and educators.',
    h1: 'Panopto Transcription — Convert Panopto Videos to Text',
    intro:
      "Panopto lecture recordings contain valuable content locked inside a video player. Transcribe them to text for searchable study notes, accessibility captions, or lecture summaries. Download your Panopto video as MP4, upload to VideoText, and get a full AI-powered transcript with chapters and keywords in minutes. Free tier for students.",
    breadcrumbLabel: 'Panopto Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/panopto-alternative', '/lecture-transcription', '/transcription-for-students', '/keyword-indexed-transcript'],
    indexable: true,
    intentKey: 'panopto-transcription',
    faq: [
      { q: 'How do I transcribe a Panopto lecture?', a: 'Download the Panopto video as MP4, upload it to VideoText, and get a full transcript in minutes. Use Keywords to index every concept and Chapters to navigate the lecture by topic.' },
      { q: 'Can I get an SRT caption file from a Panopto video?', a: 'Yes. Upload the Panopto video to VideoText and use the Video to Subtitles tool — download as SRT or VTT. You can upload this SRT file to other platforms or use it for accessibility compliance.' },
      { q: 'Is Panopto transcription free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try. No credit card.' },
    ],
  },
  {
    path: '/webex-alternative',
    title: 'Cisco WebEx Transcription Alternative – No Enterprise Lock-In | VideoText',
    description:
      "WebEx's transcription is enterprise-only and keeps recordings in Cisco's cloud. VideoText transcribes any WebEx MP4 recording — speaker labels, summary, SRT export, free tier.",
    h1: 'WebEx Transcription Alternative',
    intro:
      "Cisco WebEx transcription is bundled into enterprise plans and stores recordings in the WebEx cloud. VideoText is a simpler alternative: download your WebEx meeting recording as MP4, upload it here, and get a full speaker-labeled transcript with summary and keyword search. No WebEx account, no enterprise plan required. Files deleted after processing. Free tier.",
    breadcrumbLabel: 'WebEx Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/webex-transcription', '/zoom-alternative', '/microsoft-teams-alternative', '/meeting-transcript'],
    indexable: true,
    intentKey: 'webex-alternative',
    faq: [
      { q: 'How do I transcribe a WebEx meeting recording?', a: 'Download the WebEx recording as MP4 from the WebEx site (webex.com → Recordings → Download). Upload the MP4 to VideoText for a full transcript with speaker labels.' },
      { q: 'Does WebEx have built-in transcription?', a: 'Yes, WebEx Meetings offers AI-generated transcription on certain enterprise plans. It is limited to recordings stored in the WebEx cloud and requires a Webex subscription. VideoText works on any downloaded WebEx MP4 without a Webex account.' },
      { q: 'Is VideoText free for WebEx transcription?', a: 'Yes. Free tier includes 3 imports per month. No credit card.' },
    ],
  },
  {
    path: '/webex-transcription',
    title: 'WebEx Transcription – Transcribe WebEx Meeting Recordings | VideoText',
    description:
      'Transcribe WebEx meeting recordings to text. Download the WebEx MP4, upload to VideoText, and get a full speaker-labeled transcript with summary and keyword index. Free tier.',
    h1: 'WebEx Transcription — Transcribe WebEx Meeting Recordings',
    intro:
      'Transcribe Cisco WebEx meeting recordings to searchable text. Download your WebEx meeting as MP4, upload it to VideoText, and get a full transcript with speaker labels, action item summary, and keyword index — no WebEx enterprise plan required. Free tier.',
    breadcrumbLabel: 'WebEx Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/webex-alternative', '/zoom-recording-transcript', '/meeting-transcript', '/teams-meeting-transcript'],
    indexable: true,
    intentKey: 'webex-transcription',
    faq: [
      { q: 'How do I transcribe a WebEx recording?', a: 'Go to webex.com → Recordings → find your meeting → click Download to save the MP4. Upload the MP4 to VideoText and get a full transcript in minutes.' },
      { q: 'Is WebEx transcription free with VideoText?', a: 'Yes. Free tier includes 3 imports per month. No credit card, no WebEx plan required.' },
    ],
  },

  // ── Cluster H: AI Meeting Notes Alternatives ────────────────────────────────
  {
    path: '/notta-alternative',
    title: 'Best Notta Alternative – Transcription Without Monthly Limits | VideoText',
    description:
      "Notta's free tier limits you to 3 minutes per transcription and 120 minutes/month. VideoText has no per-file time cap on any tier. Upload full-length interviews, lectures, and meetings. Free tier.",
    h1: 'Notta Alternative — Transcribe Without Per-File Time Caps',
    intro:
      "Notta is a popular AI meeting transcription tool, but its free tier caps each transcription at 3 minutes and limits you to 120 minutes per month. VideoText has no per-file time limit — upload a 2-hour interview or a 90-minute lecture on the free tier. Speaker labels, summary, chapters, keyword index. Files deleted after processing. Free tier with 3 full imports per month.",
    breadcrumbLabel: 'Notta Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/otter-ai-alternative', '/tactiq-alternative', '/meeting-transcript', '/interview-transcription'],
    indexable: true,
    intentKey: 'notta-alternative',
    faq: [
      { q: 'What are Notta\'s limitations compared to VideoText?', a: 'Notta free tier: 3 minutes max per transcription, 120 minutes/month total. VideoText free tier: 3 full-length imports per month with no per-file duration cap. VideoText also gives chapters, keywords, and SRT export on the free tier.' },
      { q: 'Does VideoText support the same file types as Notta?', a: 'Yes. VideoText supports MP4, MOV, AVI, WebM, MKV (video) and MP3, WAV, M4A, AAC, OGG, FLAC (audio) — all the formats Notta supports, plus more.' },
      { q: 'Does VideoText transcribe live meetings like Notta?', a: 'VideoText transcribes uploaded files — it does not join live meetings. For recorded meetings (Zoom, Teams, Meet), download the MP4 and upload it. Results are typically ready in 5–8 minutes for a 60-minute call.' },
      { q: 'Is VideoText free like Notta?', a: 'Yes. Free tier includes 3 imports per month with no credit card. Paid plans start at $10/month.' },
    ],
  },
  {
    path: '/tactiq-alternative',
    title: 'Best Tactiq Alternative – Transcribe from File, Not Just Live Calls | VideoText',
    description:
      "Tactiq transcribes live Google Meet, Zoom, and Teams calls via browser extension. VideoText transcribes uploaded recordings — past meetings, interviews, lectures. No browser extension needed. Free tier.",
    h1: 'Tactiq Alternative — Transcribe Recordings, Not Just Live Calls',
    intro:
      "Tactiq is a browser extension that transcribes live Google Meet, Zoom, and Teams calls in real time. It requires you to be present during the call — you cannot go back and transcribe a recording you forgot to capture live. VideoText works the other way: upload any past recording (MP4, MP3, etc.) and get a full transcript with speakers, summary, and chapters. No browser extension, no live call required. Free tier.",
    breadcrumbLabel: 'Tactiq Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/notta-alternative', '/otter-ai-alternative', '/zoom-recording-transcript', '/meeting-transcript'],
    indexable: true,
    intentKey: 'tactiq-alternative',
    faq: [
      { q: 'What is the difference between Tactiq and VideoText?', a: 'Tactiq captures transcription during a live call via browser extension — it cannot transcribe a recording you already have. VideoText transcribes any uploaded file after the fact. If you need to process a past recording, VideoText is the right tool.' },
      { q: 'Can VideoText transcribe Google Meet recordings like Tactiq covers live meetings?', a: 'Yes. Download your Google Meet recording from Google Drive as MP4, upload it to VideoText, and get a full transcript with speaker labels and summary.' },
      { q: 'Is VideoText free like Tactiq\'s free plan?', a: 'Yes. Free tier includes 3 imports per month, no credit card. Paid plans start at $10/month flat — no per-minute fees.' },
    ],
  },
  {
    path: '/krisp-alternative',
    title: 'Best Krisp Alternative for Meeting Transcription | VideoText',
    description:
      "Krisp adds noise cancellation and meeting notes to live calls. VideoText transcribes your recorded meetings offline — no microphone integration, no running background app. Free tier.",
    h1: 'Krisp Alternative — Offline Meeting Transcription',
    intro:
      "Krisp is primarily a noise-cancellation app that added live meeting transcription. It runs as a background audio driver on your computer and processes audio in real time. VideoText is the simpler alternative for transcribing recorded meetings: upload the MP4 or audio file, get a full speaker-labeled transcript in minutes. No software to install, no microphone access required. Files deleted after processing. Free tier.",
    breadcrumbLabel: 'Krisp Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/notta-alternative', '/granola-alternative', '/meeting-transcript', '/zoom-recording-transcript'],
    indexable: true,
    intentKey: 'krisp-alternative',
    faq: [
      { q: 'What does Krisp do vs VideoText?', a: 'Krisp focuses on real-time noise cancellation and live meeting notes — it runs during the call. VideoText transcribes completed recordings offline. If you want to process a past meeting without running additional software, VideoText is more direct.' },
      { q: 'Does VideoText require any software installation?', a: 'No. VideoText runs in the browser — no download, no microphone driver, no background app. Upload your file and get the transcript.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month, no credit card. Krisp\'s free plan limits noise cancellation to 60 minutes/week and meeting notes to 1 hour/week.' },
    ],
  },
  {
    path: '/granola-alternative',
    title: 'Best Granola Alternative – Transcribe Without a Mac Background App | VideoText',
    description:
      "Granola captures meeting audio via system audio on Mac. VideoText transcribes any recording file — no Mac required, no background app, no system audio access. Free tier.",
    h1: 'Granola Alternative — Transcribe Without Installing a Mac App',
    intro:
      "Granola is a Mac-only AI meeting notes app that listens to your computer's system audio in real time. It only works on Mac, only during live meetings, and requires you to keep it running in the background. VideoText works differently: upload any recording file from any device, and get a full speaker-labeled transcript with summary. Browser-based, no download, works on Mac, Windows, and Linux. Free tier.",
    breadcrumbLabel: 'Granola Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/krisp-alternative', '/notta-alternative', '/meeting-transcript', '/macwhisper-alternative'],
    indexable: true,
    intentKey: 'granola-alternative',
    faq: [
      { q: 'Is VideoText available on Windows unlike Granola?', a: 'Yes. VideoText is browser-based and works on any OS. Granola is Mac-only.' },
      { q: 'Can I transcribe past meetings with VideoText if I didn\'t have Granola running?', a: 'Yes. Upload any past recording (Zoom MP4, Google Meet, Teams, any audio file) and VideoText produces the transcript. No need to have captured it live.' },
      { q: 'Is VideoText free like Granola?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. Granola has a free tier for up to 25 meetings before requiring payment.' },
    ],
  },
  {
    path: '/hedy-ai-alternative',
    title: 'Best Hedy AI Alternative for Meeting Transcription | VideoText',
    description:
      'Hedy AI coaches and transcribes live meetings. VideoText transcribes uploaded recordings from any past meeting — no live integration needed. Speaker labels, summary, free tier.',
    h1: 'Hedy AI Alternative — Transcribe Meeting Recordings',
    intro:
      "Hedy AI is a live meeting AI assistant that provides real-time coaching, feedback, and transcription during calls. VideoText handles the other side: upload any recorded meeting file and get a complete, speaker-labeled transcript with summary and keyword search. No live meeting integration required. Free tier.",
    breadcrumbLabel: 'Hedy AI Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/granola-alternative', '/notta-alternative', '/meeting-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'hedy-ai-alternative',
    faq: [
      { q: 'What is the difference between Hedy AI and VideoText?', a: 'Hedy AI is a live meeting coaching tool — it helps you in real time during calls. VideoText is for post-call transcription — upload your recording and get a full transcript with speakers and summary.' },
      { q: 'Can I transcribe a meeting recording that Hedy AI coached?', a: 'Yes. Download your meeting recording as MP4 (from Zoom, Teams, or Google Meet), upload it to VideoText, and get a full speaker-labeled transcript — regardless of what tools were used during the live call.' },
      { q: 'Does VideoText have real-time coaching features like Hedy AI?', a: 'No. VideoText focuses exclusively on post-recording transcription — it processes uploaded files, not live audio. Hedy AI focuses on real-time coaching during conversations.' },
      { q: 'What file formats does VideoText accept?', a: 'MP4, MOV, AVI, WebM, MKV (video) and MP3, WAV, M4A, AAC, OGG, FLAC (audio). Any standard recording format from any meeting platform.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/mem-ai-alternative',
    title: 'Best Mem AI Alternative for Transcription & Meeting Notes | VideoText',
    description:
      "Mem AI is an AI knowledge base and note-taking tool with some meeting features. VideoText specializes in fast, accurate transcription with speaker labels and export. Free tier.",
    h1: 'Mem AI Alternative — Transcription-First Meeting Notes',
    intro:
      "Mem AI is an AI-powered knowledge base that integrates with meetings and notes. VideoText focuses specifically on transcription: upload any video or audio recording and get a full, speaker-labeled transcript in minutes. Export to TXT for pasting into Mem or any other note-taking tool. Free tier.",
    breadcrumbLabel: 'Mem AI Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/notta-alternative', '/granola-alternative', '/meeting-transcript', '/video-summary-generator'],
    indexable: true,
    intentKey: 'mem-ai-alternative',
    faq: [
      { q: 'Can I use VideoText transcripts in Mem AI?', a: 'Yes. Export your transcript as TXT from VideoText and paste it into Mem. Mem can then use its AI features on top of that text.' },
      { q: 'What does Mem AI do that VideoText doesn\'t?', a: 'Mem AI is a persistent knowledge base — it stores, links, and searches across all your notes and meeting content over time. VideoText is a transcription tool — it processes individual recordings and outputs text files. They cover complementary workflows: use VideoText to generate the transcript, Mem to store and reference it.' },
      { q: 'Does VideoText save my transcripts like Mem AI does?', a: 'No — VideoText deletes your file immediately after transcription. Transcripts are not stored on VideoText servers. Download the TXT export and import it into Mem, Notion, or any knowledge base of your choice.' },
      { q: 'What recordings can I transcribe with VideoText?', a: 'Any video or audio file: meeting recordings, interviews, podcasts, lectures, voice memos. Supported formats: MP4, MOV, MP3, WAV, M4A, and more.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/vomo-alternative',
    title: 'Best VOMO Alternative – Transcribe Voice Memos Without a Mobile App | VideoText',
    description:
      "VOMO transcribes iPhone voice memos through its app. VideoText transcribes any voice memo file uploaded from the browser — no app install, works on any device. Free tier.",
    h1: 'VOMO Alternative — Transcribe Voice Memos in the Browser',
    intro:
      "VOMO is a mobile app that transcribes iPhone voice memos and organizes them with AI summaries. VideoText is the browser-based alternative: export your voice memo as M4A from iPhone, upload it here, and get a full transcript with summary and keywords — no app install, no iOS required. Works on Android M4A files and any voice recorder format. Free tier.",
    breadcrumbLabel: 'VOMO Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/m4a-to-text', '/audio-to-text', '/mp3-to-text', '/video-summary-generator'],
    indexable: true,
    intentKey: 'vomo-alternative',
    faq: [
      { q: 'How do I transcribe an iPhone voice memo without VOMO?', a: 'Open the Voice Memos app → tap the recording → tap the three-dot menu → Share → Save to Files. The file saves as M4A. Upload the M4A to VideoText for a full transcript with summary.' },
      { q: 'Does VideoText work on Android voice memos?', a: 'Yes. Android voice recordings (typically MP3 or M4A) upload directly. No conversion needed.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/glean-alternative',
    title: 'Best Glean Alternative for Meeting Transcription | VideoText',
    description:
      "Glean is an enterprise AI search platform with some meeting transcription features. VideoText provides simple, accurate transcription for any meeting recording — no enterprise setup. Free tier.",
    h1: 'Glean Alternative — Simple Transcription Without Enterprise Setup',
    intro:
      "Glean is an enterprise-grade AI search and knowledge platform that connects to your organization's tools including meetings. It requires IT setup and enterprise pricing. VideoText provides the transcription piece directly: upload any meeting recording and get speaker-labeled text, summary, and keyword search — no enterprise deployment, no IT involvement. Free tier.",
    breadcrumbLabel: 'Glean Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/notta-alternative', '/video-summary-generator', '/keyword-indexed-transcript'],
    indexable: true,
    intentKey: 'glean-alternative',
    faq: [
      { q: 'Does VideoText replace Glean\'s meeting transcription?', a: 'For the transcription use case specifically — yes. VideoText transcribes any uploaded meeting recording with speaker labels, summary, and keyword search. For the enterprise-wide knowledge base and search features, Glean does more.' },
      { q: 'Is VideoText free unlike Glean?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. Glean is enterprise-priced and requires organizational deployment.' },
      { q: 'What is Glean used for?', a: 'Glean is an enterprise AI search platform that indexes company-wide content (Slack, Drive, email, meetings, wikis) and lets employees search across all of it. Its meeting transcription is one small feature. VideoText is purpose-built for transcribing individual recordings with speaker labels, summary, and SRT export.' },
      { q: 'Does VideoText integrate with Slack or Google Drive like Glean?', a: 'No. VideoText is a standalone file transcription tool — upload a file, get a transcript. It does not connect to company apps or index historical content. For individuals who need fast, accurate transcription of specific recordings without enterprise setup, VideoText is the right tool.' },
      { q: 'Can I search the transcript in VideoText?', a: 'Yes — the Keywords section indexes every significant term in the transcript with timestamps, making it easy to jump to any topic mentioned. For full-text search, download the TXT and search with any text editor.' },
    ],
  },
  {
    path: '/notability-alternative',
    title: 'Best Notability Alternative for Lecture Transcription | VideoText',
    description:
      "Notability records and links audio to handwritten notes on iPad. VideoText transcribes lecture recordings to full, searchable text — no iPad required, works on any device. Free tier.",
    h1: 'Notability Alternative — Full Lecture Transcription',
    intro:
      "Notability is an iPad note-taking app that records audio synchronized to your handwriting. It does not produce a full searchable text transcript. VideoText does: upload your lecture recording and get complete, searchable text with chapters and keywords. Works from any recorded format on any device — no iPad required. Free tier for students.",
    breadcrumbLabel: 'Notability Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcription-for-students', '/lecture-transcription', '/keyword-indexed-transcript', '/video-chapters-generator'],
    indexable: true,
    intentKey: 'notability-alternative',
    faq: [
      { q: 'Does Notability produce a full transcript?', a: 'Notability links audio to note timestamps but does not produce a full text transcript of the spoken content. VideoText transcribes the entire audio to searchable text.' },
      { q: 'Can I transcribe a Notability recording?', a: 'Yes. Export the audio from Notability (tap the note → Share → Export audio as M4A), then upload the M4A to VideoText for a full transcript.' },
      { q: 'Is VideoText free for students?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },

  // ── Cluster I: Local Whisper Apps ────────────────────────────────────────────
  {
    path: '/macwhisper-alternative',
    title: 'Best MacWhisper Alternative – Transcribe Without a Mac App | VideoText',
    description:
      'MacWhisper is a Mac-only desktop app for local Whisper transcription. VideoText runs in the browser on any OS — no download, no local GPU needed. Same Whisper accuracy. Free tier.',
    h1: 'MacWhisper Alternative — Browser-Based Whisper Transcription',
    intro:
      'MacWhisper is a polished Mac app that runs Whisper transcription locally on your machine. It requires macOS, enough storage for model files, and time to download Whisper models. VideoText gives you the same Whisper large-v3 accuracy in the browser — no Mac required, no downloads, no local GPU. Upload your file and get the transcript in seconds. Free tier.',
    breadcrumbLabel: 'MacWhisper Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/superwhisper-alternative', '/whisper-online', '/whisperx-alternative', '/video-to-transcript'],
    indexable: true,
    intentKey: 'macwhisper-alternative',
    faq: [
      { q: 'What is the difference between MacWhisper and VideoText?', a: 'MacWhisper runs Whisper locally on your Mac — your audio never leaves your machine. VideoText processes in the cloud, deletes your file immediately after transcription, and works on any OS in a browser. MacWhisper is better for full local privacy; VideoText is better for convenience and cross-platform use.' },
      { q: 'Does VideoText use the same Whisper model as MacWhisper?', a: 'VideoText uses Whisper large-v3, which is the highest-accuracy Whisper model. MacWhisper lets you choose between small, medium, and large models — VideoText always uses large-v3.' },
      { q: 'Does VideoText work on Windows and Linux unlike MacWhisper?', a: 'Yes. VideoText is browser-based and works on any operating system. MacWhisper is Mac-only.' },
      { q: 'Is VideoText free like MacWhisper?', a: 'VideoText free tier: 3 imports/month, no credit card. MacWhisper has a free tier and a one-time purchase for advanced features.' },
    ],
  },
  {
    path: '/superwhisper-alternative',
    title: 'Best Superwhisper Alternative – Transcribe Without a Mac Dictation App | VideoText',
    description:
      'Superwhisper is a Mac/iOS dictation app for real-time Whisper transcription. VideoText transcribes uploaded recordings of any length — past interviews, lectures, meetings. Free tier.',
    h1: 'Superwhisper Alternative — Transcribe Recordings, Not Just Dictation',
    intro:
      "Superwhisper is a real-time dictation app for Mac and iOS — it transcribes as you speak. It is designed for dictating text, not for transcribing existing recordings. VideoText handles the other use case: upload any recording file (interview, lecture, meeting) and get a full transcript with speakers, summary, and chapters. Free tier, browser-based. Also covers: Whisper Notes, Gravity Notes, and similar dictation-first Whisper apps.",
    breadcrumbLabel: 'Superwhisper Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/macwhisper-alternative', '/whisper-online', '/whisperx-alternative', '/audio-to-text'],
    indexable: true,
    intentKey: 'superwhisper-alternative',
    faq: [
      { q: 'What is Superwhisper used for vs VideoText?', a: 'Superwhisper is for real-time voice dictation — speak into your microphone and it types for you. VideoText transcribes pre-recorded files (interview recordings, lecture videos, meeting recordings). Different use cases.' },
      { q: 'Can VideoText replace Whisper Notes and Gravity Notes too?', a: 'Yes, for the file transcription use case. Whisper Notes and Gravity Notes are also primarily dictation/memo apps. VideoText handles file-based transcription (existing recordings) on any device.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/whisperx-alternative',
    title: 'Best WhisperX Alternative – Word-Level Timestamps Without CLI Setup | VideoText',
    description:
      'WhisperX is an enhanced Whisper Python package with word-level timestamps and diarization. VideoText provides the same outputs in the browser — no Python, no CLI, no GPU needed. Free tier.',
    h1: 'WhisperX Alternative — Accurate Transcription Without Python Setup',
    intro:
      "WhisperX is an open-source Python package that extends Whisper with word-level forced alignment timestamps and speaker diarization. It requires Python, CUDA-compatible GPU (for fast results), and command-line setup. VideoText provides word-level timestamps, speaker labels, and accurate Whisper large-v3 transcription in the browser — no Python, no GPU, no CLI. Upload your file and get results in minutes. Free tier.",
    breadcrumbLabel: 'WhisperX Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/macwhisper-alternative', '/whisper-online', '/speaker-diarization', '/video-to-transcript'],
    indexable: true,
    intentKey: 'whisperx-alternative',
    faq: [
      { q: 'What does WhisperX do that standard Whisper doesn\'t?', a: 'WhisperX adds word-level forced alignment (timestamps for every individual word) and speaker diarization using pyannote.audio. VideoText provides speaker diarization and segment-level timestamps without requiring any local setup.' },
      { q: 'Do I need a GPU to use VideoText like WhisperX?', a: 'No. VideoText runs in the browser — no local hardware required. WhisperX needs a CUDA GPU for reasonable processing speed on long files.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/buzz-alternative',
    title: 'Best Buzz Transcription App Alternative – Browser-Based Whisper | VideoText',
    description:
      'Buzz is a macOS/Linux desktop app for offline Whisper transcription. VideoText gives you Whisper large-v3 accuracy in the browser — no download, no local models, works on any OS. Free tier.',
    h1: 'Buzz Alternative — Whisper Transcription Without a Desktop App',
    intro:
      "Buzz is an open-source desktop app for macOS and Linux that runs Whisper transcription locally. It requires downloading Whisper model files and only runs on Mac or Linux (not Windows). VideoText is the browser-based alternative: same Whisper large-v3 accuracy, works on any OS, no downloads, no local storage of model files. Free tier.",
    breadcrumbLabel: 'Buzz Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/macwhisper-alternative', '/whisper-online', '/superwhisper-alternative', '/video-to-transcript'],
    indexable: true,
    intentKey: 'buzz-alternative',
    faq: [
      { q: 'Does VideoText work on Windows unlike Buzz?', a: 'Yes. VideoText is browser-based and works on Windows, Mac, and Linux. Buzz supports macOS and Linux only.' },
      { q: 'Is VideoText free like Buzz?', a: 'Yes. VideoText free tier: 3 imports/month. Buzz is free and open-source but requires local setup and model downloads.' },
      { q: 'Does VideoText require downloading Whisper model files like Buzz does?', a: 'No. VideoText runs in the cloud — no model downloads, no local storage requirements, no GPU needed. Buzz requires downloading Whisper model files (~150MB–3GB depending on model size) to your local machine.' },
      { q: 'What extra features does VideoText have over Buzz?', a: 'VideoText adds speaker diarization, auto-generated summary, chapter navigation, keyword indexing, SRT/VTT subtitle export, subtitle translation to 70+ languages, and YouTube URL input. Buzz outputs raw transcript text only.' },
      { q: 'Is VideoText more accurate than Buzz?', a: 'Both tools can use Whisper large-v3, giving equivalent accuracy (~98.5% WER on clear speech). VideoText always uses large-v3; Buzz lets you choose smaller, faster models at lower accuracy if preferred.' },
    ],
  },

  // ── Cluster J: Caption & Video Creation Tools ────────────────────────────────
  {
    path: '/capcut-alternative',
    title: 'Best CapCut Alternative for Captions & Subtitles | VideoText',
    description:
      "CapCut auto-captions are designed for TikTok/Reels — styled overlays, not exportable SRT files. VideoText generates accurate SRT/VTT subtitle files you can use anywhere. Free tier.",
    h1: 'CapCut Alternative — Export Clean SRT Subtitle Files',
    intro:
      "CapCut's auto-caption feature adds styled text overlays to your video for TikTok and Reels — they look great in-app but cannot be exported as SRT or VTT files for use on YouTube, Vimeo, or other platforms. VideoText generates clean, timestamped SRT and VTT files you can upload to any video platform, translate to 70+ languages, or burn permanently into your video. Free tier.",
    breadcrumbLabel: 'CapCut Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/srt-generator', '/video-to-srt', '/translate-subtitles'],
    indexable: true,
    intentKey: 'capcut-alternative',
    faq: [
      { q: 'Why use VideoText instead of CapCut for captions?', a: 'CapCut captions are styled overlays — they cannot be exported as SRT or VTT files. VideoText gives you a proper SRT/VTT subtitle file with accurate timestamps that works on YouTube, Vimeo, Dailymotion, and any other platform.' },
      { q: 'Can VideoText translate captions like CapCut?', a: 'Yes. VideoText translates subtitles to 70+ languages — more than CapCut supports. The translated SRT preserves all original timestamps.' },
      { q: 'Can I burn captions into the video with VideoText?', a: 'Yes. Use the Burn Subtitles tool to permanently embed SRT captions into your video. Useful for platforms where external subtitles are not supported.' },
      { q: 'Is VideoText free like CapCut?', a: 'Yes. Free tier: 3 imports/month, no credit card. Watermark on subtitle files in the free tier, removed on paid plans.' },
    ],
  },
  {
    path: '/subtitle-edit-alternative',
    title: 'Best Subtitle Edit Alternative – Browser-Based, No Install | VideoText',
    description:
      "Subtitle Edit is a powerful Windows desktop app for editing subtitle files. VideoText generates SRT/VTT subtitles from any video in the browser — no Windows required, no installation. Free tier.",
    h1: 'Subtitle Edit Alternative — Generate Subtitles Without a Desktop App',
    intro:
      "Subtitle Edit is a free Windows desktop application for creating and editing subtitle files. It requires Windows, a local installation, and manual captioning work. VideoText automates the caption generation step: upload your video and get an accurate SRT/VTT subtitle file in minutes with no manual timing work. Then edit the file in Subtitle Edit if needed for fine-tuning. Free tier, browser-based.",
    breadcrumbLabel: 'Subtitle Edit Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/srt-generator', '/video-to-srt', '/fix-subtitles', '/subtitle-generator'],
    indexable: true,
    intentKey: 'subtitle-edit-alternative',
    faq: [
      { q: 'Can VideoText replace Subtitle Edit for generating subtitles?', a: 'For the generation step — yes. VideoText auto-generates accurate SRT/VTT files from any video. Subtitle Edit is a manual editor for fixing timing and text. Use VideoText to generate the initial SRT, then use Subtitle Edit for detailed edits if needed.' },
      { q: 'Does VideoText work on Mac and Linux unlike Subtitle Edit?', a: 'Yes. VideoText runs in the browser on any OS. Subtitle Edit is Windows-only (though it runs via Wine on Linux).' },
      { q: 'Is VideoText free like Subtitle Edit?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. Subtitle Edit is free and open source but Windows-only.' },
    ],
  },
  {
    path: '/vizard-alternative',
    title: 'Best Vizard Alternative for Video Transcription & Subtitles | VideoText',
    description:
      'Vizard is an AI video repurposing tool with auto-subtitles. VideoText focuses on accurate transcription and SRT export for standalone use — speaker labels, translate to 70+ languages, free tier.',
    h1: 'Vizard Alternative — Transcription and SRT Without Video Editing',
    intro:
      "Vizard is an AI video editing platform focused on repurposing long-form video into short clips, with auto-captions built in. If you need accurate transcription and subtitle export without the full video editing workflow, VideoText is more direct: upload any video, get a speaker-labeled transcript and SRT/VTT file in minutes. Translate to 70+ languages, burn captions, export in multiple formats. Free tier.",
    breadcrumbLabel: 'Vizard Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/subtitle-generator', '/srt-generator', '/translate-subtitles', '/capcut-alternative'],
    indexable: true,
    intentKey: 'vizard-alternative',
    faq: [
      { q: 'What is the difference between Vizard and VideoText?', a: 'Vizard is a video repurposing platform — it clips long videos into short segments and adds styled captions for social media. VideoText is a transcription and subtitle tool — it gives you the raw transcript text and SRT files for use anywhere.' },
      { q: 'Does VideoText export SRT files like Vizard?', a: 'Yes. VideoText exports SRT and VTT subtitle files with accurate timestamps. These files work on YouTube, Vimeo, and any video platform.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/invideo-alternative',
    title: 'Best InVideo AI Alternative for Subtitles & Transcription | VideoText',
    description:
      'InVideo AI generates videos with auto-captions. VideoText transcribes your existing videos to text and SRT — no video regeneration needed. Speaker labels, translate, free tier.',
    h1: 'InVideo AI Alternative — Transcribe Existing Videos',
    intro:
      'InVideo AI creates AI-generated videos with captions built in. If you already have a video and need accurate subtitles or a transcript — not a new AI-generated video — VideoText is more direct. Upload your existing video, get a transcript with speaker labels and a downloadable SRT file. Translate to 70+ languages. Free tier.',
    breadcrumbLabel: 'InVideo Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/subtitle-generator', '/translate-subtitles', '/capcut-alternative', '/vizard-alternative'],
    indexable: true,
    intentKey: 'invideo-alternative',
    faq: [
      { q: 'Can VideoText transcribe videos created in InVideo?', a: 'Yes. Export your InVideo video as MP4 and upload it to VideoText for a full transcript and SRT subtitle file.' },
      { q: 'Is VideoText free unlike InVideo?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card.' },
      { q: 'What is InVideo AI used for?', a: 'InVideo AI is a text-to-video and video creation platform — it generates videos from scripts, blog posts, or prompts. VideoText does the reverse: it converts existing videos to text transcripts and SRT subtitle files.' },
      { q: 'Can I get subtitle files from InVideo videos using VideoText?', a: 'Yes. Export your InVideo video as MP4, upload it to VideoText, and get an SRT or VTT subtitle file with accurate timestamps. Translate the SRT to 70+ languages for multi-language distribution.' },
      { q: 'Does VideoText support all video formats?', a: 'Yes. VideoText accepts MP4, MOV, AVI, WebM, MKV, and all major audio formats (MP3, WAV, M4A, FLAC, OGG).' },
    ],
  },
  {
    path: '/fliki-alternative',
    title: 'Best Fliki Alternative for Video Transcription & Subtitles | VideoText',
    description:
      'Fliki converts text and audio to video with AI voices. VideoText does the reverse: transcribes existing videos to text and SRT. Speaker labels, chapters, translate, free tier.',
    h1: 'Fliki Alternative — Transcribe Videos to Text',
    intro:
      'Fliki is a text-to-video and audio-to-video AI tool — it creates videos from scripts or audio. VideoText does the reverse: convert any existing video to text. Upload your video and get a transcript with speaker labels, keyword index, and SRT subtitle files. Free tier.',
    breadcrumbLabel: 'Fliki Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/translate-subtitles', '/invideo-alternative'],
    indexable: true,
    intentKey: 'fliki-alternative',
    faq: [
      { q: 'Does VideoText do the opposite of Fliki?', a: 'Yes. Fliki converts text/audio to video. VideoText converts video/audio to text and SRT. They cover complementary workflows.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'Can I use VideoText-generated SRT files in Fliki?', a: 'Yes. Generate an SRT from your source audio/video in VideoText, then import the SRT file into Fliki\'s subtitle or caption workflow for your video project.' },
      { q: 'Does VideoText support the same languages as Fliki?', a: 'VideoText transcribes in 90+ languages and translates subtitles to 70+ languages. Fliki supports multiple languages for TTS voice generation — the two tools serve different language workflows (transcription vs. speech synthesis).' },
      { q: 'What can VideoText transcribe?', a: 'Any audio or video file: MP4, MOV, AVI, WebM, MKV, MP3, WAV, M4A, AAC, OGG, FLAC. Also accepts YouTube URLs directly — no download needed for YouTube videos.' },
    ],
  },

  // ── Cluster K: Native Platform Tools ────────────────────────────────────────
  {
    path: '/microsoft-word-transcription-alternative',
    title: 'Best Microsoft Word Transcription Alternative – Faster, More Features | VideoText',
    description:
      "Word's Transcribe feature requires Microsoft 365 subscription and limits you to 5 hours/month. VideoText is faster, has no monthly cap per import, adds speaker labels and chapters. Free tier.",
    h1: 'Microsoft Word Transcription Alternative',
    intro:
      "Microsoft Word has a built-in Transcribe feature that uploads audio to Microsoft servers and returns a transcript inside Word. It requires a Microsoft 365 subscription, caps transcription at 5 hours per month, and only accepts audio files (no video). VideoText transcribes audio and video files with no per-file cap, adds speaker labels, summary, chapters, and keyword index — and exports to TXT, SRT, and VTT. Free tier, no Microsoft account needed.",
    breadcrumbLabel: 'Microsoft Word Transcription Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/microsoft-teams-alternative', '/audio-to-text', '/mp3-to-text', '/video-to-transcript'],
    indexable: true,
    intentKey: 'microsoft-word-transcription-alternative',
    faq: [
      { q: 'What are the limitations of Word\'s Transcribe feature?', a: 'Word Transcribe requires Microsoft 365 (paid), only accepts audio files (not video), limits you to 5 hours of transcription per month, and only works inside Word online. VideoText accepts video and audio, has no per-file cap, and works in any browser.' },
      { q: 'Is VideoText faster than Word\'s transcription?', a: 'Yes. VideoText typically delivers results in 30–90 seconds for short files. Word Transcribe uploads to Microsoft servers and can take longer, especially for longer recordings.' },
      { q: 'Does VideoText require a Microsoft 365 subscription?', a: 'No. VideoText is independent of Microsoft. Free tier: 3 imports/month, no credit card.' },
    ],
  },
  {
    path: '/google-docs-voice-typing-alternative',
    title: 'Best Google Docs Voice Typing Alternative – Transcribe Files, Not Just Live | VideoText',
    description:
      "Google Docs voice typing captures live speech — it can't transcribe a recording file. VideoText transcribes any existing audio or video file in minutes. Speaker labels, SRT export, free tier.",
    h1: 'Google Docs Voice Typing Alternative — Transcribe Recording Files',
    intro:
      "Google Docs voice typing transcribes speech in real time as you speak into your microphone. It cannot process an existing recording file — you would have to play the audio through your speakers while Google Docs listens, which degrades quality significantly. VideoText transcribes any audio or video file directly: upload the file, get accurate text with speaker labels and timestamps. Free tier.",
    breadcrumbLabel: 'Google Docs Voice Typing Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/mp3-to-text', '/video-to-transcript', '/microsoft-word-transcription-alternative'],
    indexable: true,
    intentKey: 'google-docs-voice-typing-alternative',
    faq: [
      { q: 'Why can\'t I just play audio and use Google Docs voice typing?', a: 'Playing audio through speakers while Google Docs listens works poorly — it picks up room echo, background noise, and only captures audio your microphone hears. VideoText processes the file directly for much higher accuracy.' },
      { q: 'Does VideoText work with Google Drive files?', a: 'Yes — download the file from Google Drive, upload it to VideoText. Most Google Meet recordings are stored in Drive as MP4.' },
      { q: 'Is VideoText free like Google Docs?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. No Google account required.' },
    ],
  },
  {
    path: '/youtube-auto-captions-alternative',
    title: 'Best YouTube Auto-Captions Alternative – Accurate Subtitles Before Upload | VideoText',
    description:
      "YouTube auto-captions appear after upload and can't be downloaded as SRT. VideoText generates accurate SRT files before you upload — correct captions from the start. Free tier.",
    h1: 'YouTube Auto-Captions Alternative — Accurate SRT Before Upload',
    intro:
      "YouTube's auto-captions are generated after you upload a video, can take hours to appear, have lower accuracy than Whisper (especially for accents and technical content), and cannot be downloaded as SRT files. VideoText lets you generate accurate SRT captions before uploading to YouTube — upload your video, get a corrected SRT, then upload the SRT directly to YouTube Studio for instant, accurate captions. Free tier.",
    breadcrumbLabel: 'YouTube Auto-Captions Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/srt-generator', '/video-to-srt', '/subtitle-generator', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'youtube-auto-captions-alternative',
    faq: [
      { q: 'Why are YouTube auto-captions inaccurate?', a: 'YouTube uses its own speech recognition model which performs worse than Whisper large-v3, especially for accented speech, technical vocabulary, proper nouns, and non-English content. VideoText uses Whisper large-v3 for significantly higher accuracy.' },
      { q: 'How do I upload a VideoText SRT to YouTube?', a: 'In YouTube Studio → open your video → Subtitles → Add → Upload file → upload the SRT from VideoText. The captions appear immediately with the timestamps from the SRT.' },
      { q: 'Can I download YouTube auto-captions as SRT?', a: 'YouTube does not allow direct SRT download of auto-generated captions. You have to use third-party tools to extract them. VideoText generates an SRT directly from your video file before you upload.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },

  // ── Cluster L: API / Developer Transcription Alternatives ────────────────────
  {
    path: '/deepgram-alternative',
    title: 'Best Deepgram Alternative – Transcription Without API Setup | VideoText',
    description:
      "Deepgram is an API-first speech-to-text service for developers. VideoText is the no-code alternative: upload files in the browser, get transcripts instantly. No API keys, no code. Free tier.",
    h1: 'Deepgram Alternative — Transcription Without Writing Code',
    intro:
      "Deepgram is a developer-focused speech-to-text API. It requires API key setup, REST calls, and custom code to use. VideoText delivers the same high-accuracy transcription in the browser — no API, no code, no developer setup. Upload your file, get a transcript with speaker labels, summary, and SRT export. If you are a developer looking for a Deepgram alternative with a UI, VideoText is the answer. Free tier.",
    breadcrumbLabel: 'Deepgram Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/assembly-ai-alternative', '/speechmatics-alternative', '/whisper-online', '/video-to-transcript'],
    indexable: true,
    intentKey: 'deepgram-alternative',
    faq: [
      { q: 'What is the difference between Deepgram and VideoText?', a: 'Deepgram is a speech-to-text API for developers — you integrate it into your application with code. VideoText is a web app — upload a file, get a transcript, no code needed. VideoText uses Whisper large-v3 for transcription.' },
      { q: 'Is VideoText free unlike Deepgram?', a: 'VideoText free tier: 3 imports/month, no credit card. Deepgram has a free tier of $200 in credits (~45 hours), but requires API key setup and developer knowledge to use.' },
      { q: 'Can VideoText match Deepgram\'s accuracy?', a: 'VideoText uses Whisper large-v3 (~97–99% WER on clear speech). Deepgram Nova-2 is comparable. For non-English content, Whisper generally outperforms Deepgram on lower-resource languages.' },
    ],
  },
  {
    path: '/speechmatics-alternative',
    title: 'Best Speechmatics Alternative – Enterprise Accuracy Without Enterprise Contracts | VideoText',
    description:
      "Speechmatics is an enterprise speech API with complex pricing. VideoText gives you high-accuracy Whisper transcription in the browser — no API, no contract, no enterprise setup. Free tier.",
    h1: 'Speechmatics Alternative — High-Accuracy Transcription Without Enterprise Setup',
    intro:
      "Speechmatics is an enterprise-grade speech recognition API known for high accuracy across languages. It requires API integration, enterprise pricing negotiation, and developer setup. VideoText provides comparable accuracy using Whisper large-v3 in a browser upload interface — no API, no contract, no code. Free tier, works for individuals and small teams immediately.",
    breadcrumbLabel: 'Speechmatics Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/deepgram-alternative', '/assembly-ai-alternative', '/whisper-online', '/video-to-transcript'],
    indexable: true,
    intentKey: 'speechmatics-alternative',
    faq: [
      { q: 'What does Speechmatics do that VideoText doesn\'t?', a: 'Speechmatics provides a real-time streaming API for custom integrations, enterprise SLAs, and dedicated deployments. VideoText is a file-based web tool — better for individuals, small teams, and one-off transcription jobs without enterprise infrastructure.' },
      { q: 'Is VideoText free unlike Speechmatics?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. Speechmatics requires enterprise pricing and a contract for full access.' },
    ],
  },
  {
    path: '/elevenlabs-alternative',
    title: 'Best ElevenLabs Transcription Alternative – Full Transcript Features | VideoText',
    description:
      "ElevenLabs added speech-to-text alongside its TTS products. VideoText specializes in transcription — speaker labels, summary, chapters, SRT export, translate. Free tier.",
    h1: 'ElevenLabs Transcription Alternative',
    intro:
      "ElevenLabs is primarily a text-to-speech and voice cloning platform that recently added speech-to-text transcription. Its transcription feature is built for developers integrating into AI pipelines — not for end users who want speaker labels, summaries, chapters, and SRT files. VideoText provides all of these on top of Whisper large-v3 accuracy. Free tier, no developer setup needed.",
    breadcrumbLabel: 'ElevenLabs Transcription Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/deepgram-alternative', '/assembly-ai-alternative', '/whisper-online', '/speaker-diarization'],
    indexable: true,
    intentKey: 'elevenlabs-alternative',
    faq: [
      { q: 'Does ElevenLabs do transcription?', a: 'ElevenLabs added a Speech to Text API in 2024. It is primarily aimed at developers building AI pipelines. VideoText is the end-user alternative: upload a file, get a transcript with speakers, summary, chapters, and SRT export — no code.' },
      { q: 'Is VideoText free unlike ElevenLabs?', a: 'Yes. VideoText free tier: 3 imports/month, no credit card. ElevenLabs requires an account and charges per character/minute for their API.' },
    ],
  },

  // ── Cluster M: Niche Transcription Services ──────────────────────────────────
  {
    path: '/genio-alternative',
    title: 'Best Genio Alternative for Video Transcription | VideoText',
    description:
      'Looking for a Genio alternative? VideoText transcribes video and audio files with Whisper large-v3, adds speaker labels, summary, chapters, and SRT export. Free tier, no credit card.',
    h1: 'Genio Alternative — Fast AI Video Transcription',
    intro:
      'VideoText is a strong Genio alternative for video and audio transcription. Upload any video (MP4, MOV, WebM) or audio (MP3, WAV, M4A) and get an accurate Whisper large-v3 transcript with speaker labels, summary, keyword index, and SRT export. Free tier, files deleted after processing.',
    breadcrumbLabel: 'Genio Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/turboscribe-alternative', '/notta-alternative'],
    indexable: true,
    intentKey: 'genio-alternative',
    faq: [
      { q: 'What does VideoText offer as a Genio alternative?', a: 'Whisper large-v3 accuracy, speaker labels, summary, chapters, keyword index, SRT/VTT/TXT export, YouTube URL input, translate to 70+ languages, and files deleted after processing.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'How accurate is VideoText compared to Genio?', a: 'VideoText uses Whisper large-v3 which achieves ~98.5% word accuracy on clear speech — the highest accuracy open-source model available. It supports 90+ source languages.' },
      { q: 'Does VideoText support batch processing like Genio?', a: 'Yes. The Batch Process tool lets you upload multiple files at once and process them in parallel. Download all transcripts as a ZIP archive.' },
      { q: 'How long does VideoText take to transcribe a file?', a: 'Typically 30–90 seconds for files under 10 minutes, and 5–8 minutes for a 60-minute recording. Results are delivered as soon as processing completes.' },
    ],
  },
  {
    path: '/scribe-alternative',
    title: 'Best Scribe Alternative for Meeting & Interview Transcription | VideoText',
    description:
      'VideoText is a Scribe alternative for audio and video transcription. Accurate, fast, speaker labels, SRT export, free tier. No credit card required.',
    h1: 'Scribe Alternative — AI Transcription with Speaker Labels',
    intro:
      'Looking for a Scribe alternative? VideoText transcribes meetings, interviews, and recordings with Whisper large-v3 accuracy. Get speaker-labeled text, summary, chapters, and SRT export. Free tier, files deleted after processing.',
    breadcrumbLabel: 'Scribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/interview-transcription', '/meeting-transcript', '/turboscribe-alternative'],
    indexable: true,
    intentKey: 'scribe-alternative',
    faq: [
      { q: 'Is VideoText a good Scribe alternative?', a: 'Yes. VideoText offers Whisper large-v3 transcription, speaker diarization, summary, chapters, keyword index, and SRT/VTT/TXT export — all free to start.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'What file formats does VideoText support?', a: 'VideoText accepts MP4, MOV, AVI, WebM, MKV (video) and MP3, WAV, M4A, AAC, OGG, FLAC (audio). It also transcribes directly from YouTube URLs without downloading.' },
      { q: 'Does VideoText identify different speakers like Scribe does?', a: 'Yes. Speaker diarization is included on all VideoText plans — each speaker\'s turns are automatically labeled in the transcript.' },
      { q: 'How does VideoText accuracy compare to transcription services like Scribe?', a: 'VideoText uses Whisper large-v3 (~98.5% WER on clear speech). For clear, professionally recorded audio this is equivalent to human transcription at a fraction of the cost and in minutes rather than hours.' },
    ],
  },
  {
    path: '/spreaker-alternative',
    title: 'Best Spreaker Alternative for Podcast Transcription | VideoText',
    description:
      'Spreaker is a podcast hosting platform with basic transcription. VideoText transcribes your podcast episodes with full speaker labels, summary, chapters, and SRT export. Free tier.',
    h1: 'Spreaker Alternative — Full Podcast Transcription',
    intro:
      "Spreaker provides podcast hosting with basic auto-transcription. If you need more — speaker-separated show notes, keyword-indexed transcripts, SRT caption files for your video podcast, or translations — VideoText covers it. Export your podcast episode as MP3 or MP4, upload it here, and get a complete transcript. Free tier.",
    breadcrumbLabel: 'Spreaker Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/podcast-transcription', '/speaker-diarization', '/audio-to-text'],
    indexable: true,
    intentKey: 'spreaker-alternative',
    faq: [
      { q: 'Can I transcribe my Spreaker podcast episodes with VideoText?', a: 'Yes. Download your episode as MP3 from Spreaker and upload it to VideoText. You get a full transcript with speaker labels, summary, chapters, and downloadable TXT/SRT.' },
      { q: 'Is VideoText free for podcast transcription?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'Does Spreaker include podcast transcription?', a: 'Spreaker offers basic auto-transcription on some plans, but it is limited to display inside the platform — no full-text export, no chapter generation, no SRT output. VideoText gives you a complete transcript with all export options.' },
      { q: 'Can I use VideoText to generate show notes for Spreaker episodes?', a: 'Yes. Upload your episode to VideoText — the Summary branch generates a concise summary of the episode content which you can use directly as show notes. Chapters identify the main topics discussed.' },
      { q: 'Can I get SRT subtitle files for my podcast video on Spreaker?', a: 'Yes. Upload your podcast video or audio to VideoText and download an SRT file. This is useful for creating accessible podcast video content on YouTube or embedding captions on your website.' },
    ],
  },
  {
    path: '/headliner-alternative',
    title: 'Best Headliner (Eddy) Alternative for Podcast Transcription | VideoText',
    description:
      'Headliner creates podcast audiograms with auto-transcription. VideoText transcribes podcast episodes to full text with speaker labels, show notes summary, and SRT export. Free tier.',
    h1: 'Headliner (Eddy) Alternative — Full Podcast Transcription',
    intro:
      "Headliner (now Eddy) is a podcast audiogram and marketing tool that includes basic transcription. VideoText focuses on the transcription workflow: upload your episode, get a full speaker-labeled transcript, auto-generated show notes (via Summary), and SRT captions for your video podcast. No video template required. Free tier.",
    breadcrumbLabel: 'Headliner Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/podcast-transcription', '/spreaker-alternative', '/speaker-diarization'],
    indexable: true,
    intentKey: 'headliner-alternative',
    faq: [
      { q: 'Does VideoText replace Headliner for podcast transcription?', a: 'For the transcription use case — yes. VideoText gives you a full transcript, speaker labels, show notes (Summary branch), and SRT files. Headliner focuses on creating audiogram clips for social media.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'Does Headliner (Eddy) include transcription?', a: 'Headliner includes basic transcription primarily to power its audiogram clip selection feature — not as a standalone transcript product. VideoText provides the full transcript as a downloadable TXT, SRT, and VTT file.' },
      { q: 'Can I generate podcast show notes with VideoText like Headliner suggests clips?', a: 'Yes. Upload your podcast episode to VideoText. The Summary branch generates a concise episode summary for show notes. Chapters identify main topics with timestamps for your podcast description.' },
      { q: 'Can VideoText produce subtitles for video podcasts?', a: 'Yes. Upload your video podcast episode (MP4) to VideoText, generate an SRT file, and upload it to YouTube. This gives your video podcast accurate captions significantly better than YouTube auto-captions.' },
    ],
  },
  {
    path: '/ditto-transcripts-alternative',
    title: 'Best Ditto Transcripts Alternative – AI Transcription Instead of Human Services | VideoText',
    description:
      'Ditto Transcripts is a human transcription service charging per minute. VideoText delivers AI transcription in minutes for free — Whisper large-v3 accuracy, speaker labels, SRT export.',
    h1: 'Ditto Transcripts Alternative — AI Transcription in Minutes',
    intro:
      "Ditto Transcripts is a human transcription service that delivers 99% accurate transcripts but charges per minute and takes hours to days for turnaround. VideoText delivers Whisper large-v3 AI transcription in minutes — free tier, no per-minute pricing, instant results. For non-sensitive, time-sensitive transcription, VideoText is significantly faster and cheaper.",
    breadcrumbLabel: 'Ditto Transcripts Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/interview-transcription', '/research-interview-transcription', '/transcription-for-journalists', '/audio-to-text'],
    indexable: true,
    intentKey: 'ditto-transcripts-alternative',
    faq: [
      { q: 'Is AI transcription accurate enough vs Ditto\'s human transcription?', a: 'VideoText uses Whisper large-v3 (~97–99% WER on clear speech). Human transcription achieves ~99%. For most use cases — journalism, research, meeting notes — the difference is minimal on clear audio. For legal, medical, or verbatim-required transcription, human services like Ditto remain better.' },
      { q: 'Is VideoText faster than Ditto Transcripts?', a: 'Much faster. Ditto Transcripts turnaround is typically same-day to 3 days. VideoText delivers results in 2–8 minutes depending on file length.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card. No per-minute fees.' },
    ],
  },
  {
    path: '/allscribe-alternative',
    title: 'Best Allscribe Alternative for AI Video Transcription | VideoText',
    description:
      'Looking for an Allscribe alternative? VideoText transcribes video and audio with Whisper large-v3 — speaker labels, SRT export, translate to 70+ languages. Free tier, no credit card.',
    h1: 'Allscribe Alternative — AI Transcription with More Export Options',
    intro:
      'VideoText is a full-featured Allscribe alternative. Transcribe any video or audio file with Whisper large-v3 accuracy. Get speaker labels, summary, chapters, keyword index, and export as TXT, SRT, or VTT. Translate to 70+ languages. Files deleted after processing. Free tier.',
    breadcrumbLabel: 'Allscribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/turboscribe-alternative', '/easyscribe-alternative', '/audio-to-text'],
    indexable: true,
    intentKey: 'allscribe-alternative',
    faq: [
      { q: 'What does VideoText offer over Allscribe?', a: 'Speaker diarization, auto-generated summary, chapter navigation, keyword indexing, SRT/VTT subtitle export, translation to 70+ languages, YouTube URL input, and instant file deletion after processing.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'How accurate is VideoText compared to Allscribe?', a: 'VideoText uses Whisper large-v3 (~98.5% WER on clear speech). This is comparable to the best available AI transcription engines and significantly more accurate than older Whisper variants.' },
      { q: 'Does VideoText support batch transcription like Allscribe?', a: 'Yes. The Batch Process tool lets you upload and process multiple files simultaneously. All transcripts download as a ZIP archive.' },
      { q: 'How quickly does VideoText process files?', a: 'Typically 30–90 seconds for short files and 5–8 minutes for hour-long recordings. Files are processed on dedicated GPU infrastructure.' },
    ],
  },

  // ── Cluster N: Video & Converter Alternatives ────────────────────────────────
  {
    path: '/videoProc-alternative',
    title: 'Best VideoProc Converter Alternative for Transcription | VideoText',
    description:
      "VideoProc Converter AI includes basic speech-to-text as part of video conversion. VideoText specializes in accurate transcription — speaker labels, SRT export, translate to 70+ languages. Free tier.",
    h1: 'VideoProc Alternative — Dedicated Transcription for Your Videos',
    intro:
      "VideoProc Converter AI is a desktop video processing suite that includes basic speech-to-text conversion. For accurate transcription with speaker labels, summary, chapters, and SRT export, VideoText is the dedicated alternative. Upload your video in the browser — no software install — and get a complete transcript in minutes. Free tier.",
    breadcrumbLabel: 'VideoProc Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/mp4-to-text', '/subtitle-generator', '/movavi-alternative'],
    indexable: true,
    intentKey: 'videoproc-alternative',
    faq: [
      { q: 'Does VideoProc Converter do transcription?', a: 'VideoProc includes a basic speech-to-text feature but it is not its primary function. VideoText is purpose-built for transcription with speaker diarization, chapters, keyword index, and multi-language export.' },
      { q: 'Is VideoText browser-based unlike VideoProc?', a: 'Yes. VideoText runs in the browser on any OS. VideoProc requires a desktop installation on Windows or Mac.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/movavi-alternative',
    title: 'Best Movavi Video Converter Alternative for Transcription | VideoText',
    description:
      'Movavi is a video converter with basic subtitle tools. VideoText transcribes video to text with Whisper AI — accurate SRT generation, translate to 70+ languages, speaker labels. Free tier.',
    h1: 'Movavi Alternative — AI Transcription and Subtitle Generation',
    intro:
      "Movavi is a desktop video editor and converter that includes subtitle editing tools but requires manual subtitle creation. VideoText automates subtitle generation: upload your video and get a Whisper-accurate SRT or VTT file in minutes with no manual timing work. Translate to 70+ languages. Burn captions into video. Free tier.",
    breadcrumbLabel: 'Movavi Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/srt-generator', '/video-to-srt', '/subtitle-edit-alternative'],
    indexable: true,
    intentKey: 'movavi-alternative',
    faq: [
      { q: 'Does Movavi auto-generate subtitles?', a: 'Movavi includes a subtitle editor but requires manual text entry and timing. VideoText automatically generates timed subtitles from your video\'s speech using Whisper AI.' },
      { q: 'Is VideoText browser-based unlike Movavi?', a: 'Yes. VideoText runs in any browser on any OS. Movavi requires desktop installation.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
    ],
  },
  {
    path: '/vocallab-alternative',
    title: 'Best Vocallab.io Alternative for AI Transcription | VideoText',
    description:
      'Looking for a Vocallab.io alternative? VideoText transcribes video and audio with Whisper large-v3 — speaker labels, SRT export, translate, free tier. No credit card.',
    h1: 'Vocallab Alternative — Transcription with More Features',
    intro:
      'VideoText is a comprehensive Vocallab.io alternative. Upload any video or audio file and get a speaker-labeled transcript with summary, chapters, keyword index, and SRT/VTT export. Translate to 70+ languages. Files deleted after processing. Free tier.',
    breadcrumbLabel: 'Vocallab Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/turboscribe-alternative', '/notta-alternative', '/audio-to-text'],
    indexable: true,
    intentKey: 'vocallab-alternative',
    faq: [
      { q: 'Is VideoText better than Vocallab.io?', a: 'VideoText offers Whisper large-v3 transcription, speaker diarization, auto-summary, chapter navigation, keyword indexing, SRT/VTT/TXT export, translation to 70+ languages, and YouTube URL input. Files are deleted immediately after processing.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'What file formats does VideoText accept vs Vocallab?', a: 'VideoText accepts all major video (MP4, MOV, AVI, WebM, MKV) and audio formats (MP3, WAV, M4A, AAC, OGG, FLAC). It also takes YouTube URLs directly — no separate download step needed.' },
      { q: 'Does VideoText delete my files after transcription?', a: 'Yes. Your file is deleted immediately after the transcript is generated. Nothing is stored on VideoText servers. Download your transcript and it is yours to keep.' },
      { q: 'Does VideoText support speaker separation?', a: 'Yes. Speaker diarization is included on all plans — the transcript separates speech by speaker turn, labeled Speaker 1, Speaker 2, etc. Rename speakers to real names after transcription.' },
    ],
  },
  {
    path: '/skribo-alternative',
    title: 'Best Skribo.xyz Alternative for Browser Transcription | VideoText',
    description:
      'Looking for a Skribo alternative? VideoText transcribes video and audio in the browser with Whisper large-v3 — speaker labels, SRT export, translate to 70+ languages. Free tier.',
    h1: 'Skribo Alternative — Full-Featured Browser Transcription',
    intro:
      'VideoText is a fully featured Skribo.xyz alternative. Upload any video or audio file and get a speaker-labeled Whisper transcript with summary, chapters, keyword index, and SRT/VTT export. Translate to 70+ languages. Free tier, no credit card.',
    breadcrumbLabel: 'Skribo Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/audio-to-text', '/turboscribe-alternative', '/easyscribe-alternative'],
    indexable: true,
    intentKey: 'skribo-alternative',
    faq: [
      { q: 'Why choose VideoText over Skribo?', a: 'VideoText offers Whisper large-v3 accuracy, speaker diarization, summary, chapters, keywords, multi-format export, and translation — all in a single browser-based tool with a free tier and no credit card.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'Does VideoText support the same languages as Skribo?', a: 'VideoText transcribes in 90+ languages using Whisper\'s multilingual model and translates to 70+ languages. It covers all major world languages including English, Spanish, French, German, Portuguese, Japanese, Chinese, Arabic, and more.' },
      { q: 'What video formats can I upload to VideoText?', a: 'MP4, MOV, AVI, WebM, MKV, and all major audio formats (MP3, WAV, M4A, AAC, OGG, FLAC). You can also paste a YouTube URL to transcribe directly without uploading.' },
      { q: 'How long does VideoText take to process a file?', a: 'Typically 30–90 seconds for short files and 5–8 minutes for hour-long recordings. Processing speed does not depend on your local device hardware.' },
    ],
  },
  {
    path: '/whisper-notes-alternative',
    title: 'Best Whisper Notes Alternative – Transcribe Files in the Browser | VideoText',
    description:
      'Whisper Notes is a Mac/iOS dictation app. VideoText transcribes existing recording files in the browser — any OS, no install, same Whisper accuracy. Speaker labels, SRT export, free tier.',
    h1: 'Whisper Notes Alternative — Transcribe Any Recording File',
    intro:
      'Whisper Notes is an iOS and macOS app for real-time Whisper dictation — it transcribes as you speak. VideoText handles the file transcription use case: upload any existing recording (interview, lecture, meeting) in the browser and get a full transcript with speaker labels and SRT export. No app install, works on any OS. Free tier.',
    breadcrumbLabel: 'Whisper Notes Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/superwhisper-alternative', '/macwhisper-alternative', '/whisper-online', '/audio-to-text'],
    indexable: true,
    intentKey: 'whisper-notes-alternative',
    faq: [
      { q: 'What is Whisper Notes used for vs VideoText?', a: 'Whisper Notes is a real-time dictation app for Apple devices. VideoText transcribes pre-recorded files uploaded from any device or OS.' },
      { q: 'Is VideoText free?', a: 'Yes. 3 free imports per month, no credit card.' },
      { q: 'Can Whisper Notes transcribe existing audio or video recordings?', a: 'Whisper Notes is primarily a dictation app — it captures live voice input. For transcribing existing recording files (interviews, lectures, meetings), you need to export the audio file and process it elsewhere. VideoText handles existing files directly — upload and get a full transcript in minutes.' },
      { q: 'Does VideoText work on iPhone like Whisper Notes?', a: 'VideoText is a web app that works in mobile browsers including Safari on iPhone. For voice memo files from iPhone, export as M4A from the Voice Memos app and upload to VideoText.' },
      { q: 'What can VideoText transcribe that Whisper Notes cannot?', a: 'VideoText transcribes video files (MP4, MOV), YouTube URLs, podcast recordings, meeting recordings, and any audio file. Whisper Notes is limited to dictation from microphone input on Apple devices.' },
    ],
  },

  // ── Voice-to-Text: Core Landing Pages ────────────────────────────────────────
  {
    path: '/voice-to-text',
    title: 'Voice to Text – Free Online Voice Recorder & Transcriber | VideoText',
    description: 'Voice to text online. Hit record, speak, and get a transcript in seconds. No app, no signup for the free tier. Powered by AI. Works in any browser.',
    h1: 'Voice to Text Online',
    intro: 'Record your voice directly in the browser and get an accurate text transcript instantly. Click the microphone, speak for up to 5 minutes, and VideoText transcribes your voice with AI. No app download, no software to install — works on any device. Free tier included.',
    breadcrumbLabel: 'Voice to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/speech-to-text', '/voice-recorder-online', '/dictation-tool', '/voice-memo-to-text', '/otter-ai-alternative', '/dragon-dictate-alternative'],
    indexable: true,
    intentKey: 'voice-to-text',
    faq: [
      { q: 'How does voice to text work?', a: 'Click the microphone button and allow browser microphone access. Speak clearly for up to 5 minutes. When you stop recording, VideoText uploads the audio to our AI transcription engine powered by Whisper and delivers a clean text transcript within seconds.' },
      { q: 'Is voice to text free?', a: 'Yes. The free tier includes 3 recordings per month with no credit card required. Paid plans start at $19/month for more minutes.' },
      { q: 'What is the best voice to text tool?', a: 'VideoText offers browser-based voice recording with AI transcription powered by Whisper. Unlike Otter.ai or Dragon Dictate, VideoText works entirely in the browser with no app installation and no subscription required for basic use.' },
      { q: 'How accurate is voice to text?', a: 'VideoText uses Whisper large-v3, achieving 95–98% accuracy for clear English speech. Accuracy improves when speaking clearly in a quiet environment. For technical vocabulary, accents, or multiple speakers, accuracy remains high due to Whisper\'s large training corpus.' },
      { q: 'Can I use voice to text on my phone?', a: 'Yes. VideoText works in mobile browsers including Safari on iPhone and Chrome on Android. Open the site, tap the microphone, and speak. Your transcript downloads or copies directly to clipboard.' },
      { q: 'How long can I record?', a: 'The voice recorder captures up to 5 minutes per recording. For longer recordings, use the video/audio upload tool which handles files up to 90 minutes.' },
      { q: 'Does voice to text work offline?', a: 'No. VideoText requires an internet connection to send audio to our Whisper-powered transcription servers. For offline use, desktop apps like WhisperType or MacWhisper process audio locally.' },
    ],
  },
  {
    path: '/speech-to-text',
    title: 'Speech to Text – Free Online Converter | VideoText',
    description: 'Speech to text converter online. Record from your microphone or upload audio. AI-powered accuracy. No app. Free tier.',
    h1: 'Speech to Text Converter',
    intro: 'Convert speech to text instantly in your browser. Record from your microphone or upload an existing audio or video file. VideoText uses Whisper AI for high-accuracy transcription across 90+ languages. Free tier — no credit card required.',
    breadcrumbLabel: 'Speech to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/voice-to-text-online', '/audio-to-text', '/online-voice-recorder', '/video-to-transcript'],
    indexable: true,
    intentKey: 'speech-to-text',
    faq: [
      { q: 'What is speech to text?', a: 'Speech to text (also called voice recognition or dictation) converts spoken words into written text automatically using AI. Modern speech-to-text tools like VideoText use Whisper neural networks that achieve near-human accuracy on clear audio.' },
      { q: 'How accurate is speech to text online?', a: 'VideoText uses OpenAI Whisper large-v3, which achieves 3–5% word error rate on clear English audio. It outperforms Google Speech-to-Text on accented speech and technical vocabulary.' },
      { q: 'What languages does speech to text support?', a: 'VideoText supports 90+ languages automatically. Whisper detects the spoken language automatically, or you can specify the language for improved accuracy.' },
      { q: 'Can I do speech to text on iPhone or Android?', a: 'Yes. VideoText is a web app that works in Safari (iPhone) and Chrome (Android). No app installation needed.' },
      { q: 'What is the difference between speech to text and transcription?', a: 'Speech to text typically refers to real-time or live dictation — converting speech as you speak. Transcription refers to converting pre-recorded audio or video files to text. VideoText does both: record live from microphone, or upload existing files.' },
    ],
  },
  {
    path: '/voice-to-text-online',
    title: 'Voice to Text Online – Free Browser-Based Transcription | VideoText',
    description: 'Free online voice to text. Record in your browser, get a text transcript instantly. No download. Works on Chrome, Firefox, Safari.',
    h1: 'Voice to Text Online — Free',
    intro: 'Turn your voice into text online without downloading any software. Open VideoText in any browser, click the microphone, and speak. The AI transcribes your recording and delivers editable text you can copy or download. Works on desktop and mobile. Free.',
    breadcrumbLabel: 'Voice to Text Online',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/free-voice-to-text', '/speech-to-text', '/online-voice-recorder', '/speechnotes-alternative'],
    indexable: true,
    intentKey: 'voice-to-text-online',
    faq: [
      { q: 'Which browsers support online voice to text?', a: 'VideoText works in Chrome, Firefox, Edge, and Safari. Microphone access requires HTTPS (all VideoText pages use HTTPS). On iPhone, use Safari. On Android, use Chrome.' },
      { q: 'Do I need to install anything for voice to text online?', a: 'No. VideoText runs entirely in your browser. Click the microphone button, allow microphone access when prompted, and start speaking. No plugins, extensions, or software needed.' },
      { q: 'Is online voice to text secure?', a: 'Yes. Your audio is encrypted in transit (HTTPS/TLS) and processed by our AI servers. VideoText does not retain or store your recordings after transcription completes.' },
    ],
  },
  {
    path: '/online-voice-recorder',
    title: 'Online Voice Recorder – Record & Transcribe in Browser | VideoText',
    description: 'Free online voice recorder with AI transcription. Record from your microphone, get accurate text in seconds. No app needed. Free tier.',
    h1: 'Online Voice Recorder',
    intro: 'Record your voice online and get a transcript instantly — all in your browser. VideoText\'s online voice recorder captures audio from your microphone, uploads it for AI transcription, and delivers clean text in seconds. No software to install. Free tier.',
    breadcrumbLabel: 'Online Voice Recorder',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/voice-recorder-online', '/free-voice-to-text', '/speak-to-text', '/voice-memo-to-text'],
    indexable: true,
    intentKey: 'online-voice-recorder',
    faq: [
      { q: 'How do I record voice online?', a: 'Go to VideoText, click the microphone button, allow browser microphone access, and speak. The recorder captures your voice for up to 5 minutes. Click stop and your transcript appears within seconds.' },
      { q: 'Can I record voice online for free?', a: 'Yes. VideoText offers 3 free voice recordings per month with no credit card required.' },
      { q: 'What happens to my recording after transcription?', a: 'VideoText processes your recording and deletes it after transcription. Your audio is not stored or used for any other purpose.' },
      { q: 'Can I download the recording?', a: 'VideoText focuses on the text transcript output, which you can copy or download as TXT. The audio recording itself is processed server-side and not returned as a download.' },
    ],
  },
  {
    path: '/voice-recorder-online',
    title: 'Voice Recorder Online – Free, No Download | VideoText',
    description: 'Voice recorder online. Record and transcribe instantly. Free. No app. Works in any browser on desktop or mobile.',
    h1: 'Voice Recorder Online',
    intro: 'Use our free online voice recorder to capture and transcribe speech directly in your browser. Click the microphone, speak, and download your transcript. Works on all devices. No download or signup required for the free tier.',
    breadcrumbLabel: 'Voice Recorder Online',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/online-voice-recorder', '/voice-to-text', '/free-voice-to-text', '/voice-to-text-online'],
    indexable: true,
    intentKey: 'voice-recorder-online',
    faq: [
      { q: 'Is there a time limit for the online voice recorder?', a: 'The voice recorder captures up to 5 minutes per session. For longer audio, upload an existing recording file which handles up to 90 minutes.' },
      { q: 'Does the voice recorder online work on mobile?', a: 'Yes. Open VideoText in your mobile browser, tap the microphone, and allow microphone access. Works on iPhone Safari and Android Chrome.' },
    ],
  },
  {
    path: '/free-voice-to-text',
    title: 'Free Voice to Text – No Signup, No App | VideoText',
    description: 'Free voice to text online. Record from your browser. No subscription. No credit card. AI transcription powered by Whisper.',
    h1: 'Free Voice to Text',
    intro: 'Get accurate voice-to-text transcription for free. Record from your browser microphone or upload an existing voice file. VideoText\'s free tier includes 3 recordings per month with no credit card. Powered by Whisper AI.',
    breadcrumbLabel: 'Free Voice to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/voice-to-text-online', '/online-voice-recorder', '/speechnotes-alternative', '/speechtexter-alternative'],
    indexable: true,
    intentKey: 'free-voice-to-text',
    faq: [
      { q: 'Is voice to text really free?', a: 'Yes. VideoText offers 3 free voice recordings per month with no credit card required. Create an account to track your usage. Upgrade to paid plans ($19/month) for more minutes.' },
      { q: 'What is the best free voice to text tool?', a: 'VideoText offers high-accuracy Whisper AI transcription for free, with no watermarks, no forced login, and no usage spying. Alternatives like Otter.ai, Speechnotes, and SpeechTexter offer free tiers but with lower accuracy or intrusive prompts.' },
      { q: 'Does free voice to text store my data?', a: 'VideoText processes and deletes your recordings. We do not store or sell your audio data.' },
    ],
  },
  {
    path: '/speak-to-text',
    title: 'Speak to Text – Instant AI Transcription | VideoText',
    description: 'Speak to text online. Click, speak, get text. AI-powered. Free tier. No app. Works in browser.',
    h1: 'Speak to Text',
    intro: 'Speak directly into your browser and get accurate text output instantly. VideoText converts your voice to text using Whisper AI — just click the microphone, speak, and your transcript appears. Perfect for notes, emails, documents, and more.',
    breadcrumbLabel: 'Speak to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/dictation-tool', '/microphone-to-text', '/free-voice-to-text'],
    indexable: true,
    intentKey: 'speak-to-text',
    faq: [
      { q: 'How do I speak to text on a computer?', a: 'Open VideoText in your browser, click the microphone button, and speak clearly. Your voice is transcribed to text within seconds. Works on Windows, Mac, Linux, and Chromebook — any computer with a microphone and browser.' },
      { q: 'Is speaking to text faster than typing?', a: 'Most people speak 3–4x faster than they type. Voice-to-text tools like VideoText can transcribe speech faster than real-time, making them significantly faster for first drafts, notes, and documentation.' },
    ],
  },
  {
    path: '/microphone-to-text',
    title: 'Microphone to Text – Browser-Based Voice Transcription | VideoText',
    description: 'Convert microphone input to text instantly. Click, record, transcribe. Free. No software. Works in any browser.',
    h1: 'Microphone to Text',
    intro: 'Convert your microphone input to text using AI transcription. VideoText captures audio from your browser microphone, processes it with Whisper AI, and delivers clean readable text in seconds. No software, no app — works entirely online.',
    breadcrumbLabel: 'Microphone to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/speak-to-text', '/online-voice-recorder', '/voice-to-text-online'],
    indexable: true,
    intentKey: 'microphone-to-text',
    faq: [
      { q: 'How do I convert microphone to text?', a: 'Open VideoText, click the red microphone button, and allow browser microphone access when prompted. Speak into your microphone and click stop. Your speech is transcribed to text and displayed instantly.' },
      { q: 'What microphone works best for voice to text?', a: 'Any microphone works — built-in laptop mic, USB microphone, headset, or external recorder. For best accuracy, use a headset microphone or external USB mic in a quiet environment to reduce background noise.' },
    ],
  },
  {
    path: '/dictation-tool',
    title: 'Dictation Tool – Free Online Dictation Software | VideoText',
    description: 'Free online dictation tool. Speak and get text instantly. AI-powered. No download. Better than Dragon Dictate for casual use.',
    h1: 'Free Online Dictation Tool',
    intro: 'Dictate to your browser and get accurate text output. VideoText is a free online dictation tool that uses Whisper AI to convert speech to text. No expensive software like Dragon Dictate to install — just open the browser, speak, and copy your text.',
    breadcrumbLabel: 'Dictation Tool',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/speak-to-text', '/dragon-dictate-alternative', '/dictation-io-alternative', '/speechnotes-alternative'],
    indexable: true,
    intentKey: 'dictation-tool',
    faq: [
      { q: 'What is an online dictation tool?', a: 'An online dictation tool lets you speak into your computer\'s microphone and converts your voice to text automatically — no keyboard typing needed. VideoText is a free browser-based dictation tool that uses Whisper AI for high accuracy.' },
      { q: 'How is VideoText different from Dragon Dictate?', a: 'Dragon Dictate (Dragon NaturallySpeaking) is a desktop software costing $150–$600 that requires installation and voice training. VideoText works entirely in the browser, requires no installation, no training, and is free for basic use — making it the best Dragon alternative for most users.' },
      { q: 'Can I use dictation for writing documents?', a: 'Yes. Dictate into VideoText, copy the transcript, and paste into Google Docs, Word, Notion, or any text editor. VideoText is ideal for first drafts, notes, emails, and long-form content.' },
      { q: 'Is online dictation accurate?', a: 'VideoText uses Whisper large-v3, one of the most accurate speech recognition models available. For clear speech in a quiet environment, accuracy is typically 95–98%.' },
    ],
  },
  {
    path: '/voice-memo-to-text',
    title: 'Voice Memo to Text – Convert iPhone & Android Voice Notes | VideoText',
    description: 'Convert voice memos to text. Upload iPhone Voice Memos, Android recordings, WhatsApp audio. AI transcription. Free tier.',
    h1: 'Voice Memo to Text',
    intro: 'Convert voice memos to text instantly. Upload your iPhone Voice Memos, Android voice recordings, or WhatsApp audio messages to VideoText and get a full text transcript. Supports M4A, MP3, WAV, and other audio formats. Free tier.',
    breadcrumbLabel: 'Voice Memo to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/audio-to-text', '/voice-to-text', '/voice-notes-to-text', '/m4a-to-text', '/vomo-alternative'],
    indexable: true,
    intentKey: 'voice-memo-to-text',
    faq: [
      { q: 'How do I convert iPhone Voice Memos to text?', a: 'Open the Voice Memos app on iPhone, tap the memo, tap the three-dot menu, and share as a file. Upload the M4A file to VideoText and get a full text transcript in seconds.' },
      { q: 'Can I transcribe WhatsApp voice messages?', a: 'Yes. Save the WhatsApp voice message as an audio file (tap and hold → Save) and upload to VideoText. Supports the OGG format used by WhatsApp.' },
      { q: 'What formats are supported for voice memo transcription?', a: 'VideoText supports M4A, MP3, WAV, OGG, FLAC, AAC, and video formats containing audio (MP4, MOV, WebM). All common voice memo formats are accepted.' },
      { q: 'How long can voice memos be?', a: 'VideoText handles voice memos up to 90 minutes. Free tier includes 3 transcriptions per month.' },
    ],
  },
  {
    path: '/voice-notes-to-text',
    title: 'Voice Notes to Text – Transcribe Voice Notes Online | VideoText',
    description: 'Transcribe voice notes to text. Upload audio or record live. AI accuracy. Free. No app needed.',
    h1: 'Voice Notes to Text',
    intro: 'Transcribe voice notes to text quickly and accurately. VideoText converts voice notes from any app or device — iPhone Voice Memos, Android recordings, Notion Audio, VOMO, or live microphone input — to clean readable text. Free tier.',
    breadcrumbLabel: 'Voice Notes to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-memo-to-text', '/voice-to-text', '/audio-to-text', '/vomo-alternative', '/whisper-notes-alternative'],
    indexable: true,
    intentKey: 'voice-notes-to-text',
    faq: [
      { q: 'How do I convert voice notes to text?', a: 'Export your voice note as an audio file (M4A, MP3, WAV) and upload to VideoText. Or record directly in the browser with the voice recorder. Your transcript is ready in seconds.' },
      { q: 'Can I transcribe voice notes from any app?', a: 'Yes. VideoText accepts audio from any app that can export or share audio files — including Apple Voice Memos, VOMO, Otter.ai recordings, Android Voice Recorder, Samsung Voice Recorder, and more.' },
    ],
  },
  {
    path: '/voice-to-text-converter',
    title: 'Voice to Text Converter – Online, Free, Accurate | VideoText',
    description: 'Voice to text converter online. Record or upload audio and convert to text. AI-powered Whisper transcription. Free tier.',
    h1: 'Voice to Text Converter',
    intro: 'Convert voice recordings to text with AI precision. VideoText\'s voice-to-text converter accepts live recordings from your microphone or uploaded audio files and produces an accurate, downloadable text transcript. Free tier included.',
    breadcrumbLabel: 'Voice to Text Converter',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/speech-to-text', '/audio-to-text', '/online-voice-recorder'],
    indexable: true,
    intentKey: 'voice-to-text-converter',
    faq: [
      { q: 'What is a voice to text converter?', a: 'A voice to text converter is a tool that converts spoken audio into written text. VideoText uses Whisper AI — one of the best speech recognition models available — to convert voice recordings and live microphone input to accurate text.' },
      { q: 'What file formats does the converter accept?', a: 'VideoText accepts MP4, MOV, AVI, WebM, MKV, MP3, WAV, M4A, AAC, OGG, and FLAC files for transcription.' },
    ],
  },

  // ── Voice-to-Text: Competitor Alternatives ────────────────────────────────────
  {
    path: '/dragon-dictate-alternative',
    title: 'Dragon Dictate Alternative – Free Online Dictation | VideoText',
    description: 'Dragon Dictate (Dragon NaturallySpeaking) alternative. Free browser-based dictation. No $600 software. AI accuracy. Works on any OS.',
    h1: 'Dragon Dictate Alternative',
    intro: 'Looking for a Dragon Dictate alternative? VideoText offers free browser-based voice-to-text transcription powered by Whisper AI — no $150–$600 software to buy, no installation, no voice training required. Works on Windows, Mac, Linux, and Chromebook.',
    breadcrumbLabel: 'Dragon Dictate Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/dictation-tool', '/voice-to-text', '/speak-to-text', '/speechnotes-alternative', '/dictation-io-alternative'],
    indexable: true,
    intentKey: 'dragon-dictate-alternative',
    faq: [
      { q: 'How does VideoText compare to Dragon NaturallySpeaking?', a: 'Dragon NaturallySpeaking (Dragon Dictate) is a $150–$600 desktop software requiring Windows or Mac installation and extensive voice training. VideoText is free, browser-based, requires no installation, no training, and achieves comparable accuracy on most speech using Whisper large-v3.' },
      { q: 'Is there a free alternative to Dragon Dictate?', a: 'Yes. VideoText provides free browser-based dictation with AI accuracy. Other free alternatives include Speechnotes (Chrome extension), SpeechTexter, and Google Docs Voice Typing — but VideoText offers the best Whisper-powered accuracy without ads or a Chrome extension requirement.' },
      { q: 'Does VideoText work on Mac like Dragon for Mac?', a: 'Yes. VideoText is browser-based and works on any OS including Mac, Windows, Linux, and Chromebook. Dragon Dictate for Mac was discontinued in 2023, leaving many Mac users looking for alternatives.' },
      { q: 'Can I use VideoText for professional dictation like Dragon?', a: 'VideoText is ideal for notes, first drafts, emails, and meeting summaries. For medical transcription requiring specialized vocabulary (Dragon Medical), a specialized medical tool may still be preferable — but for general professional dictation, VideoText is a capable free alternative.' },
      { q: 'How accurate is VideoText vs Dragon Dictate?', a: 'Both use advanced AI speech recognition. Dragon uses Nuance\'s proprietary models with user voice training. VideoText uses Whisper large-v3, which achieves 3–5% word error rate on clear English speech without any training, and often outperforms Dragon on accented speech and technical vocabulary.' },
    ],
  },
  {
    path: '/speechify-alternative',
    title: 'Speechify Alternative – Free Voice to Text | VideoText',
    description: 'Speechify alternative for voice to text. Free browser-based AI transcription. Record or upload. No subscription required.',
    h1: 'Speechify Alternative',
    intro: 'VideoText is a free alternative to Speechify for voice recording and transcription. While Speechify focuses on text-to-speech (reading content aloud), VideoText does the opposite — converting your voice recordings to text using Whisper AI. No subscription required for basic use.',
    breadcrumbLabel: 'Speechify Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/dictation-tool', '/dragon-dictate-alternative', '/otter-ai-alternative'],
    indexable: true,
    intentKey: 'speechify-alternative',
    faq: [
      { q: 'What is the difference between Speechify and VideoText?', a: 'Speechify is a text-to-speech tool that reads documents aloud. VideoText is a speech-to-text tool that converts voice recordings to text. If you\'re looking to transcribe voice recordings, VideoText is the right tool.' },
      { q: 'Does VideoText have a free plan like Speechify?', a: 'Yes. VideoText offers 3 free transcriptions per month with no credit card. Paid plans start at $19/month for 450 minutes.' },
      { q: 'Can I use VideoText to transcribe voice memos like Speechify?', a: 'Yes. Upload voice memos (M4A, MP3, WAV) or record directly in the browser. VideoText produces accurate text transcripts you can copy or download.' },
    ],
  },
  {
    path: '/speechnotes-alternative',
    title: 'Speechnotes Alternative – Free Voice to Text Online | VideoText',
    description: 'Speechnotes alternative. Free online voice to text — no Chrome extension required. Works in any browser. AI accuracy. No ads.',
    h1: 'Speechnotes Alternative',
    intro: 'Looking for a Speechnotes alternative? VideoText offers free browser-based voice-to-text without requiring a Chrome extension. Record in any browser — Chrome, Firefox, Safari, Edge — and get accurate AI transcription powered by Whisper. No ads, no extension required.',
    breadcrumbLabel: 'Speechnotes Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/free-voice-to-text', '/voice-to-text-online', '/speechtexter-alternative', '/dictation-io-alternative'],
    indexable: true,
    intentKey: 'speechnotes-alternative',
    faq: [
      { q: 'How is VideoText different from Speechnotes?', a: 'Speechnotes relies on the Chrome Web Speech API for transcription, which uses Google\'s real-time recognition. VideoText records audio and processes it through Whisper large-v3, which is significantly more accurate — especially for accents, technical vocabulary, and non-English speech.' },
      { q: 'Does VideoText require a Chrome extension like Speechnotes?', a: 'No. VideoText is a web app that works natively in Chrome, Firefox, Safari, and Edge without any extension. Speechnotes\' Chrome extension approach limits it to Chrome and Chromium-based browsers.' },
      { q: 'Is VideoText free like Speechnotes?', a: 'Yes. VideoText\'s free tier includes 3 transcriptions per month. Unlike Speechnotes, VideoText has no ads and no paywalls for core features.' },
    ],
  },
  {
    path: '/speechtexter-alternative',
    title: 'SpeechTexter Alternative – More Accurate Voice to Text | VideoText',
    description: 'SpeechTexter alternative. Higher accuracy AI voice to text. Works in any browser. No account for free tier. Powered by Whisper.',
    h1: 'SpeechTexter Alternative',
    intro: 'VideoText is a more accurate SpeechTexter alternative. While SpeechTexter uses the Web Speech API with limited accuracy, VideoText uses Whisper large-v3 for higher-quality transcription. Works in any browser. Free tier available.',
    breadcrumbLabel: 'SpeechTexter Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/free-voice-to-text', '/speechnotes-alternative', '/dictation-io-alternative'],
    indexable: true,
    intentKey: 'speechtexter-alternative',
    faq: [
      { q: 'How does VideoText compare to SpeechTexter accuracy?', a: 'SpeechTexter uses browser-native Web Speech API which achieves around 85–90% accuracy. VideoText uses Whisper large-v3 which achieves 95–98% accuracy on clear speech — a significant improvement especially for names, technical terms, and non-standard pronunciation.' },
      { q: 'Is there a better free alternative to SpeechTexter?', a: 'VideoText offers higher accuracy (Whisper vs Web Speech API), works in all browsers (not just Chrome), and requires no account for basic use — making it a superior free alternative to SpeechTexter for most users.' },
    ],
  },
  {
    path: '/dictation-io-alternative',
    title: 'Dictation.io Alternative – Free Browser Dictation | VideoText',
    description: 'Dictation.io alternative. Browser-based voice to text with higher AI accuracy. No account required. Free. Powered by Whisper.',
    h1: 'Dictation.io Alternative',
    intro: 'Looking for a dictation.io alternative? VideoText offers browser-based voice-to-text with Whisper AI accuracy — no Chrome requirement, higher accuracy than Web Speech API, and no ads. Free tier available.',
    breadcrumbLabel: 'Dictation.io Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/dictation-tool', '/voice-to-text', '/free-voice-to-text', '/speechnotes-alternative', '/speechtexter-alternative'],
    indexable: true,
    intentKey: 'dictation-io-alternative',
    faq: [
      { q: 'What is dictation.io and how does VideoText compare?', a: 'Dictation.io is a free browser-based dictation tool using the Web Speech API. VideoText uses Whisper large-v3, achieving significantly higher accuracy — especially for non-English languages, accents, and technical vocabulary.' },
      { q: 'Is VideoText free like dictation.io?', a: 'Yes. VideoText offers a free tier with 3 transcriptions per month, no credit card required.' },
    ],
  },
  {
    path: '/whispertype-alternative',
    title: 'WhisperType Alternative – Browser-Based Voice to Text | VideoText',
    description: 'WhisperType alternative. Browser-based voice to text powered by Whisper AI. No app install. Works on Windows, Mac, Linux. Free tier.',
    h1: 'WhisperType Alternative',
    intro: 'VideoText is a browser-based alternative to WhisperType. While WhisperType is a macOS/Windows desktop app for Whisper-powered dictation, VideoText delivers the same Whisper AI accuracy in any browser — no installation, no API key required, free tier included.',
    breadcrumbLabel: 'WhisperType Alternative',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/voice-to-text', '/dictation-tool', '/superwhisper-alternative', '/macwhisper-alternative', '/whisper-notes-alternative'],
    indexable: true,
    intentKey: 'whispertype-alternative',
    faq: [
      { q: 'How does VideoText compare to WhisperType?', a: 'WhisperType is a desktop dictation app that runs Whisper AI locally on macOS or Windows. VideoText is browser-based — no installation, no API key, works on any OS. Both use Whisper for accuracy.' },
      { q: 'Is there a free WhisperType alternative?', a: 'Yes. VideoText offers a free tier with 3 transcriptions per month. WhisperType requires API key costs from OpenAI.' },
    ],
  },
  {
    path: '/subly-alternative',
    title: 'Subly Alternative – Subtitle Generation Without Per-Credit Pricing | VideoText',
    description: 'VideoText as a Subly alternative. Generate subtitles from any video on a flat plan. SRT, VTT export. Translate to 70+ languages. Burn captions into video. Free tier.',
    h1: 'Subly Alternative — Flat Pricing for Subtitle Generation',
    intro: 'Looking for a Subly alternative? Subly charges per video credit. VideoText uses a flat monthly plan — process as many videos as your plan allows without per-video charges. Upload any video or paste a YouTube URL, get SRT and VTT files, translate to 70+ languages, and burn captions into video. Free tier available.',
    breadcrumbLabel: 'Subly Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/zubtitle-alternative', '/kapwing-alternative', '/translate-subtitles'],
    indexable: true,
    intentKey: 'subly-alternative',
    faq: [
      { q: 'How does VideoText compare to Subly for subtitle generation?', a: 'Both tools generate subtitles from video. Subly uses credit-based pricing (pay per video). VideoText uses a flat monthly subscription — no per-video charges. VideoText also includes a full transcript, speaker labels, and AI summary alongside the subtitle file.' },
      { q: 'Does VideoText support subtitle translation like Subly?', a: 'Yes. VideoText translates SRT and VTT subtitle files to 70+ languages. Subly also supports translation, but charges additional credits per language.' },
      { q: 'Can VideoText burn subtitles into video?', a: 'Yes. VideoText can permanently embed (hard-code) subtitles into your video file. The burned-in video is ready to upload to social media without needing a separate subtitle file.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. Paid plans start at $10/month with no per-video credit charges.' },
    ],
  },
  {
    path: '/meetgeek-alternative',
    title: 'MeetGeek Alternative – Transcribe Recorded Meetings Without a Meeting Bot | VideoText',
    description: 'VideoText as a MeetGeek alternative. Upload any Zoom, Teams, or Google Meet recording. Full transcript, speaker labels, AI summary, SRT export. Free tier.',
    h1: 'MeetGeek Alternative — Meeting Transcription Without a Bot',
    intro: 'Looking for a MeetGeek alternative? MeetGeek uses a meeting bot that joins your live calls. VideoText transcribes recorded meeting files — upload any Zoom, Teams, or Google Meet MP4 export and get a full transcript with speaker labels, AI-generated action items, and SRT/VTT subtitle files. No bot, no calendar integration required.',
    breadcrumbLabel: 'MeetGeek Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/zoom-recording-transcript', '/meeting-transcript', '/google-meet-transcript', '/fireflies-alternative'],
    indexable: true,
    intentKey: 'meetgeek-alternative',
    faq: [
      { q: 'What is the main difference between MeetGeek and VideoText?', a: 'MeetGeek is a meeting intelligence platform with a bot that auto-joins calendar meetings and transcribes live. VideoText is a video transcription tool for recorded files — upload the meeting recording and get a transcript. VideoText does not require a bot or calendar access.' },
      { q: 'Can VideoText transcribe Zoom recordings?', a: 'Yes. Export your Zoom recording as MP4 and upload it to VideoText. You get a full transcript with speaker detection, AI summary, and SRT/VTT export.' },
      { q: 'Does VideoText generate meeting summaries like MeetGeek?', a: 'Yes. VideoText generates an AI summary of the transcript including key topics and action items. The summary is included with every transcription.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No meeting bot, no calendar integration, no credit card required.' },
    ],
  },
  {
    path: '/maestra-alternative',
    title: 'Maestra Alternative – Accurate Subtitles and Transcription at Lower Cost | VideoText',
    description: 'VideoText as a Maestra alternative. AI transcription and subtitle generation from any video. SRT, VTT export. 70+ language translation. Free tier. No watermark on exports.',
    h1: 'Maestra Alternative — Subtitles and Transcription Without Per-Minute Billing',
    intro: 'Looking for a Maestra alternative? Maestra bills per minute of audio processed. VideoText uses a flat plan — one import covers your full video regardless of length. Upload any video or YouTube URL and get a transcript, SRT/VTT files, speaker labels, and translation to 70+ languages. No watermark on subtitle file exports.',
    breadcrumbLabel: 'Maestra Alternative',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/video-to-transcript', '/subly-alternative', '/happyscribe-alternative'],
    indexable: true,
    intentKey: 'maestra-alternative',
    faq: [
      { q: 'How does VideoText compare to Maestra?', a: 'Maestra bills per minute of processed audio, which becomes expensive for long videos. VideoText uses flat per-import pricing — a 2-hour documentary costs the same as a 5-minute clip. Both tools produce SRT files and translations, but VideoText also includes a full text transcript and AI summary.' },
      { q: 'Does VideoText support the same languages as Maestra?', a: 'VideoText transcribes and translates in 70+ languages powered by Whisper large-v3. Maestra supports 80+ languages. For the most common content languages (English, Spanish, French, German, Portuguese, Hindi, Japanese, Korean, Chinese, Arabic), both tools deliver strong accuracy.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No per-minute billing, no credit card required.' },
    ],
  },

  // ─── SEO landing pages: subtitle editor cluster ────────────────────────────

  {
    path: '/subtitle-editor',
    title: 'Online Subtitle Editor — Edit, Fix & Export SRT/VTT Files | VideoText',
    description: 'Edit subtitle files online. Fix timing, correct text, validate overlaps, and export SRT or VTT. Free browser-based subtitle editor. No account required.',
    h1: 'Online Subtitle Editor — Edit and Fix Subtitle Files in Your Browser',
    intro: 'Edit subtitle files directly in your browser. VideoText provides a suite of free online subtitle editing tools — fix timing drift, validate overlaps, correct line lengths, and shift timestamps — plus an AI-powered tool that regenerates accurate SRT and VTT files from your original video. No desktop software, no watermarks, no account required for free tools.',
    breadcrumbLabel: 'Subtitle Editor',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/fix-subtitles', '/subtitle-timing-fixer', '/subtitle-validation', '/subtitle-grammar-fixer'],
    indexable: true,
    intentKey: 'subtitle-editor-online',
    faq: [
      { q: 'Can I edit SRT files online without installing software?', a: 'Yes. VideoText\'s Fix Subtitles tool lets you upload an SRT or VTT file, auto-fix timing overlaps, correct long lines, adjust reading speed, and download the corrected file. All processing runs in your browser — nothing is installed.' },
      { q: 'What subtitle editing features does VideoText offer?', a: 'VideoText includes: automatic timing overlap correction, line-length validation against Netflix and BBC standards, reading speed (CPS) analysis, timestamp shifting to fix sync issues, subtitle merging, SRT/VTT format conversion, and AI-powered re-generation of subtitles from the original video.' },
      { q: 'How do I fix subtitle sync issues online?', a: 'If your subtitles are consistently early or late, use the Shift Subtitle Timing free tool — enter a positive or negative offset in milliseconds and download the corrected file. If the timing varies throughout the video, VideoText\'s AI tool can regenerate the subtitles from the original video with perfect sync.' },
      { q: 'Can I edit individual subtitle lines?', a: 'The Fix Subtitles AI tool allows you to review and edit the transcript text after processing. For manual line-by-line editing of an existing SRT file, you can open it in any text editor (Notepad, VS Code, TextEdit) since SRT is plain text.' },
      { q: 'Is VideoText a free subtitle editor?', a: 'The free browser tools (timing fixer, validator, format converter) are completely free with no account required. The AI-powered subtitle generation and correction tool has a free tier of 3 imports per month.' },
    ],
  },
  {
    path: '/online-subtitle-editor',
    title: 'Online Subtitle Editor — Edit SRT & VTT Files Free | VideoText',
    description: 'Edit subtitles online for free. Fix timing, validate SRT/VTT files, convert formats, and generate new subtitles with AI. No software install. No account needed.',
    h1: 'Online Subtitle Editor — Free Tools for SRT and VTT Files',
    intro: 'Edit subtitle files online without installing any software. Fix timing overlaps, validate line lengths, convert between SRT and VTT formats, merge subtitle tracks, and shift timestamps — all in your browser for free. Need a subtitle file for a new video? The VideoText AI tool generates accurate SRT and VTT from any video in under 2 minutes.',
    breadcrumbLabel: 'Online Subtitle Editor',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/subtitle-editor', '/fix-subtitles', '/subtitle-timing-fixer', '/subtitle-validation'],
    indexable: true,
    intentKey: 'online-subtitle-editor',
    faq: [
      { q: 'What is the best free online subtitle editor?', a: 'VideoText offers a suite of free browser-based subtitle editing tools including a timing fixer, overlap validator, format converter (SRT/VTT), timing shifter, and merge tool. For AI-powered subtitle generation from video, the free tier includes 3 imports per month.' },
      { q: 'Can I edit subtitles without re-uploading the video?', a: 'Yes. Most free tools (timing fixer, validator, converter) work with just the subtitle file — no video needed. Upload your SRT or VTT file, make the corrections, and download.' },
      { q: 'Does VideoText support real-time subtitle preview?', a: 'The subtitle editing tools are file-based rather than video-player-based. You edit the SRT/VTT file and download the corrected version. For a video-player preview, open the corrected SRT in VLC or a video editor alongside your video.' },
    ],
  },

  // ─── CapCut keyword cluster ────────────────────────────────────────────────

  {
    path: '/capcut-captions',
    title: 'CapCut Captions to SRT — Export CapCut Subtitles as a File | VideoText',
    description: 'Export CapCut captions as a downloadable SRT or VTT file. VideoText generates accurate subtitle files from CapCut videos. Free tier. No upload size limit.',
    h1: 'CapCut Captions — Export Subtitles from CapCut Videos as SRT/VTT',
    intro: 'CapCut\'s built-in auto-captions are great for TikTok, but they stay locked inside the app. To get your CapCut captions as a standalone SRT or VTT file, export the video from CapCut (without burned-in captions) and upload it to VideoText. You\'ll get an accurate subtitle file in under 2 minutes, ready to upload to YouTube, Vimeo, or any platform that accepts subtitle files.',
    breadcrumbLabel: 'CapCut Captions to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/tiktok-to-transcript', '/video-to-srt', '/add-subtitles-to-video'],
    indexable: true,
    intentKey: 'capcut-captions-to-srt',
    faq: [
      { q: 'Can I export CapCut captions as an SRT file?', a: 'CapCut does not natively export captions as a standalone SRT file. To get an SRT from your CapCut video: export the video from CapCut without burned-in captions, then upload the video file to VideoText. VideoText re-generates the subtitle file from the audio and outputs SRT, VTT, or plain text.' },
      { q: 'How do I get a SRT file from a CapCut project?', a: 'In CapCut, export your video as MP4 (without captions embedded). Then upload the MP4 to VideoText. The AI transcribes the audio and produces an SRT file with accurate timestamps that you can download and use anywhere.' },
      { q: 'Why would I want an SRT file instead of CapCut\'s built-in captions?', a: 'CapCut captions are burned into the video when exported — you can\'t edit them after export, and they can\'t be turned off by viewers. A standalone SRT file lets platforms (YouTube, Vimeo) display captions as a separate track that viewers can toggle on or off, and lets you edit or translate the captions independently.' },
      { q: 'Can I use VideoText SRT files back in CapCut?', a: 'CapCut does not currently support importing external SRT files as caption tracks. The SRT file from VideoText is best used for platform uploads (YouTube, Vimeo) or for burning captions with VideoText\'s burn-in tool if you want more control over the caption style.' },
      { q: 'Is this free?', a: 'Yes. VideoText has a free tier with 3 imports per month. No credit card required.' },
    ],
  },

  // ─── Accessibility and closed captions cluster ────────────────────────────

  {
    path: '/sdh-subtitles',
    title: 'SDH Subtitles — Generate Subtitles for the Deaf and Hard of Hearing | VideoText',
    description: 'Create SDH subtitles (Subtitles for the Deaf and Hard of Hearing) for your videos. VideoText adds speaker labels and sound descriptions. Export SRT or VTT. Free tier.',
    h1: 'SDH Subtitles — Create Subtitles for the Deaf and Hard of Hearing',
    intro: 'SDH subtitles (Subtitles for the Deaf and Hard of Hearing) include speaker identification and descriptions of non-speech audio alongside standard dialogue text. VideoText generates the dialogue and speaker labels automatically from your video. You can then add sound descriptions (like [music], [applause]) to complete the SDH file. Export as SRT or VTT ready for Netflix, YouTube, or any platform that accepts SDH tracks.',
    breadcrumbLabel: 'SDH Subtitles',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/closed-caption-generator', '/subtitle-generator', '/ada-video-captions', '/video-accessibility'],
    indexable: true,
    intentKey: 'sdh-subtitles',
    faq: [
      { q: 'What are SDH subtitles?', a: 'SDH stands for Subtitles for the Deaf and Hard of Hearing. SDH subtitles differ from standard subtitles by including speaker identification (e.g., [JOHN:]) and descriptions of non-speech audio (e.g., [upbeat music], [door slams]). Netflix, Amazon Prime, and broadcast platforms require SDH for accessibility compliance.' },
      { q: 'What is the difference between SDH and closed captions?', a: 'SDH and closed captions serve the same accessibility purpose. Closed captions (CC) are a North American broadcast standard embedded in the video signal (CEA-608/708). SDH is an international subtitle standard used for disc and streaming delivery. SDH is styled like regular subtitles (positioned at the bottom of the screen) rather than the white-on-black CC style. Functionally they contain the same information.' },
      { q: 'Does VideoText automatically generate SDH subtitles?', a: 'VideoText generates accurate dialogue subtitles with speaker labels automatically. Sound effect descriptions ([music], [applause], etc.) need to be added manually in a text editor. The generated SRT or VTT file provides the full dialogue base — you then annotate non-speech events.' },
      { q: 'What format should SDH subtitles be in?', a: 'Netflix requires SDH in TTML (IMSC) format for final delivery. For upload to YouTube and Vimeo, SRT or VTT with SDH formatting works correctly. VideoText exports SRT and VTT.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required.' },
    ],
  },
  {
    path: '/open-captions-vs-closed-captions',
    title: 'Open Captions vs Closed Captions — What\'s the Difference? | VideoText',
    description: 'Understand open captions vs closed captions: what each is, when to use them, and how to create both. With free tools to generate, burn, or export captions.',
    h1: 'Open Captions vs Closed Captions — Complete Guide',
    intro: 'Open captions and closed captions both display text on screen, but they work very differently. Open captions are permanently burned into the video — viewers always see them, on every platform, and they cannot be turned off. Closed captions are a separate text track delivered alongside the video — viewers can toggle them on or off, translate them, or adjust their appearance. Understanding the difference determines which approach you need for your video.',
    breadcrumbLabel: 'Open vs Closed Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/hardcoded-captions', '/burn-subtitles-into-video', '/closed-caption-generator', '/subtitle-generator'],
    indexable: true,
    intentKey: 'open-captions-vs-closed-captions',
    faq: [
      { q: 'What are open captions?', a: 'Open captions are subtitle text that has been permanently burned into the video frames. They are part of the video image itself — just like any other graphic overlay. Every viewer sees them on every platform and device, and they cannot be turned off. Open captions are ideal for social media (Instagram, TikTok, LinkedIn) where users scroll silently and closed caption tracks may not auto-enable.' },
      { q: 'What are closed captions?', a: 'Closed captions are a separate text file (SRT, VTT, SCC, etc.) delivered alongside the video. Viewers can toggle them on or off. They are stored separately from the video, so they can be edited, replaced, or translated without re-encoding the video. Closed captions are required for broadcast TV, streaming platforms, and ADA/WCAG web accessibility compliance.' },
      { q: 'When should I use open captions?', a: 'Use open captions when: (1) uploading to social media where silent auto-play is common, (2) you need captions to display on a platform that doesn\'t support subtitle tracks (screens, kiosks, digital signage), (3) you need captions to appear in video thumbnails or promotional clips, or (4) you want to ensure consistent caption styling across all devices.' },
      { q: 'When should I use closed captions?', a: 'Use closed captions when: (1) uploading to YouTube, Vimeo, or Netflix — they all have native caption track support, (2) your content must meet ADA/WCAG accessibility requirements, (3) you need to offer multiple language subtitle tracks, or (4) you want viewers to be able to adjust caption size and colour.' },
      { q: 'How do I create open captions?', a: 'Generate an SRT file from VideoText, then use the Burn Subtitles tool to permanently embed them into your video. The output is a new video file with the captions baked in.' },
      { q: 'How do I create closed captions?', a: 'Generate an SRT or VTT file from VideoText and upload it to your platform as a subtitle track. YouTube, Vimeo, and Wistia all accept SRT/VTT files for closed caption tracks.' },
    ],
  },
  {
    path: '/video-accessibility',
    title: 'Video Accessibility — Add Captions and Subtitles for ADA & WCAG Compliance | VideoText',
    description: 'Make your videos accessible. Generate accurate captions for ADA Section 508 and WCAG 2.1 compliance. Export SRT, VTT, or burn captions in. Free tier.',
    h1: 'Video Accessibility — Captions and Subtitles for ADA & WCAG Compliance',
    intro: 'Accessible video requires accurate captions or subtitles. Under ADA Section 508, WCAG 2.1 Level AA, and Section 255 of the Telecommunications Act, videos on public-facing websites must include captions or transcripts for deaf and hard-of-hearing viewers. VideoText generates accurate captions from any video in under 2 minutes. Export SRT or VTT to upload as a closed caption track, or burn them directly into the video.',
    breadcrumbLabel: 'Video Accessibility',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/sdh-subtitles', '/closed-caption-generator', '/ada-video-captions', '/subtitle-generator'],
    indexable: true,
    intentKey: 'video-accessibility-captions',
    faq: [
      { q: 'Are captions required by law for online videos?', a: 'In the United States, ADA Section 508 requires federal agencies to caption all videos. WCAG 2.1 Level AA (the standard referenced by most accessibility legislation) requires captions for all pre-recorded video with audio. The EU Web Accessibility Directive has similar requirements. Private companies serving the public are increasingly required to comply under ADA Title III.' },
      { q: 'What is WCAG 2.1 Level AA for video?', a: 'WCAG 2.1 Success Criterion 1.2.2 (Captions, Prerecorded) requires synchronized captions for all pre-recorded video content. Success Criterion 1.2.3 (Audio Description or Media Alternative) requires either audio description or a full text transcript. VideoText produces both — a synchronized SRT/VTT caption file and a full text transcript.' },
      { q: 'How accurate do captions need to be for ADA compliance?', a: 'The FCC requires 99% accuracy for broadcast TV. WCAG does not specify a numeric accuracy threshold but requires captions to be "accurate" and "synchronized." AI-generated captions at 98%+ word accuracy generally meet this standard for most content. Technical and proper-noun-heavy content may need human review.' },
      { q: 'What caption format does YouTube require for accessibility?', a: 'YouTube accepts SRT, VTT, SCC, TTML, and SBV formats for caption uploads. SRT is the simplest and most widely compatible. Upload via YouTube Studio → Subtitles → Add Language → Upload file.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required. Paid plans start at $10/month.' },
    ],
  },
  {
    path: '/ada-video-captions',
    title: 'ADA Video Captions — Add Captions for ADA Section 508 Compliance | VideoText',
    description: 'Generate ADA-compliant video captions for Section 508 and WCAG 2.1. Accurate SRT/VTT files from any video. Free tier. Used by educators, gov agencies, and enterprises.',
    h1: 'ADA Video Captions — Generate Captions for Section 508 Compliance',
    intro: 'ADA Section 508 and WCAG 2.1 Level AA require synchronised captions for pre-recorded video content on public websites. VideoText generates accurate captions from any video in under 2 minutes. Upload an MP4 or paste a YouTube URL and get a fully synchronised SRT or VTT file ready for upload. Used by universities, government agencies, corporate training teams, and healthcare providers.',
    breadcrumbLabel: 'ADA Video Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-accessibility', '/sdh-subtitles', '/closed-caption-generator', '/subtitle-generator'],
    indexable: true,
    intentKey: 'ada-video-captions',
    faq: [
      { q: 'What makes video captions ADA-compliant?', a: 'ADA-compliant captions must be: (1) accurate — 99%+ word accuracy for broadcast, high accuracy for web video, (2) synchronised — captions must match the audio timing, (3) complete — all spoken words and relevant non-speech audio must be captioned, (4) properly placed — not covering important visual content.' },
      { q: 'Who needs to caption their videos under the ADA?', a: 'Federal agencies (Section 508), state and local governments (ADA Title II), and places of public accommodation — including universities, businesses, and healthcare providers — must caption video content on their public-facing websites. The ADA applies broadly: if your organisation serves the public, video captions are typically required.' },
      { q: 'Can AI-generated captions meet ADA requirements?', a: 'AI-generated captions at 98%+ accuracy (like VideoText\'s Whisper-powered output) are generally sufficient for most video content. For legal proceedings, medical content, or content where accuracy is critical, human review of the AI output is recommended. VideoText produces an editable transcript alongside the caption file for this purpose.' },
      { q: 'What format should ADA captions be in?', a: 'SRT and VTT files are accepted by all major platforms (YouTube, Vimeo, Kaltura, Panopto, Brightcove). For broadcast and enterprise delivery, SCC (CEA-608/708) or TTML may be required. VideoText exports SRT and VTT.' },
    ],
  },

  // ─── How-to landing pages ──────────────────────────────────────────────────

  {
    path: '/how-to-create-srt-file',
    title: 'How to Create an SRT File — 3 Ways Explained | VideoText',
    description: 'Learn how to create an SRT subtitle file. Three methods: AI generation from video, manual creation, and conversion from other formats. Free tools included.',
    h1: 'How to Create an SRT File — 3 Methods',
    intro: 'An SRT file is a plain text file that pairs subtitle text with timestamps. You can create one three ways: (1) generate it automatically from a video using AI, (2) write one manually in a text editor, or (3) convert an existing subtitle file from another format (VTT, SBV, ASS). The fastest and most accurate method for video content is AI generation — upload your video and get an SRT file in under 2 minutes.',
    breadcrumbLabel: 'How to Create SRT File',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/srt-generator', '/video-to-srt', '/srt-to-vtt'],
    indexable: true,
    intentKey: 'how-to-create-srt-file',
    faq: [
      { q: 'What is an SRT file?', a: 'An SRT (SubRip Text) file is a plain text file that stores subtitles with timestamps. Each subtitle block has three parts: a sequential number, a timestamp line (start --> end), and the subtitle text. Example: 1 / 00:00:01,000 --> 00:00:03,000 / Hello world. SRT is the most widely supported subtitle format in the world.' },
      { q: 'How do I create an SRT file from a video?', a: 'Upload your video to VideoText (or paste a YouTube URL). The AI transcribes the audio and generates a precisely timed SRT file. Download the SRT and it\'s ready to use. This is far faster than writing timestamps manually.' },
      { q: 'Can I create an SRT file manually?', a: 'Yes. Open a text editor (Notepad, TextEdit, VS Code). Write each subtitle block in this format: a number on line 1, timestamps on line 2 (00:00:01,000 --> 00:00:03,500), text on line 3, then a blank line. Save the file with .srt extension. Ensure encoding is UTF-8.' },
      { q: 'How do I create an SRT from a VTT or SBV file?', a: 'Use our free converters: VTT to SRT Converter or SBV to SRT Converter. Upload the file and download the converted SRT instantly.' },
      { q: 'How do I add an SRT file to a YouTube video?', a: 'In YouTube Studio, go to your video → Subtitles → Add Language → select the language → Upload file → select your SRT. YouTube will import the timestamps and text exactly as written.' },
    ],
  },
  {
    path: '/how-to-add-subtitles-to-mp4',
    title: 'How to Add Subtitles to MP4 — 3 Methods | VideoText',
    description: 'Learn how to add subtitles to an MP4 video: burn them in permanently, embed as a soft track, or upload an SRT to your hosting platform. Step-by-step guide.',
    h1: 'How to Add Subtitles to MP4 — Burn In, Soft Embed, or Upload',
    intro: 'Adding subtitles to an MP4 file can mean three different things: (1) burning them in permanently so they\'re always visible, (2) embedding them as a soft subtitle track inside the MP4 container (switchable by viewers), or (3) uploading an SRT file alongside your MP4 to a hosting platform like YouTube or Vimeo. The right method depends on where and how your video will be viewed.',
    breadcrumbLabel: 'How to Add Subtitles to MP4',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/burn-subtitles-into-video', '/hardcoded-captions', '/video-to-subtitles', '/add-subtitles-to-video'],
    indexable: true,
    intentKey: 'how-to-add-subtitles-to-mp4',
    faq: [
      { q: 'What is the difference between burning subtitles in and soft subtitles?', a: 'Burned-in (hardcoded) subtitles are permanently part of the video image — they cannot be turned off and display on every player and platform. Soft subtitles are a separate track stored inside or alongside the video — viewers can toggle them on/off, and they can be replaced without re-encoding the video.' },
      { q: 'How do I permanently add subtitles to an MP4?', a: 'Generate an SRT file using VideoText, then use the Burn Subtitles Into Video tool. Upload your MP4 and your SRT, and VideoText renders a new MP4 with captions permanently embedded. No FFmpeg or video editing software required.' },
      { q: 'How do I add subtitles to an MP4 for YouTube?', a: 'Generate an SRT file from VideoText. In YouTube Studio, go to your video → Subtitles → Add Language → Upload file → select your SRT. YouTube stores the captions as a toggleable track — no re-encoding needed.' },
      { q: 'How do I add subtitles to an MP4 in VLC?', a: 'VLC can load subtitle files at playback time. Place the SRT file in the same folder as the MP4 and name it identically (e.g., video.mp4 and video.srt). VLC will load it automatically. Or use Subtitle → Add Subtitle File in the VLC menu during playback.' },
      { q: 'Do I need to re-encode the video to add subtitles?', a: 'Only if you want burned-in (hardcoded) captions — those require re-encoding. For YouTube, Vimeo, or other platforms that support separate subtitle tracks, you upload the SRT alongside the existing MP4 with no re-encoding.' },
    ],
  },
  {
    path: '/srt-to-word',
    title: 'SRT to Word — Export Your Transcript as a Text Document | VideoText',
    description: 'Convert SRT subtitle files to a clean Word-compatible document. Strip timestamps, extract dialogue, and download as plain text. Or transcribe video directly to get a full document.',
    h1: 'SRT to Word — Export Subtitle Text as a Readable Document',
    intro: 'To convert an SRT file to a Word document, you need to extract just the dialogue text — stripping the timestamps and block numbers. Use our free SRT to Text tool to extract clean text from your SRT file, then open the .txt output in Word. Alternatively, use VideoText\'s AI transcription tool to go directly from video to a clean, formatted transcript ready to paste into any document.',
    breadcrumbLabel: 'SRT to Word',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/srt-to-vtt', '/how-to-create-srt-file', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'srt-to-word',
    faq: [
      { q: 'How do I convert an SRT file to a Word document?', a: 'Step 1: Use VideoText\'s free SRT to Text tool — upload your SRT and download the clean text (timestamps removed). Step 2: Open the .txt file in Microsoft Word or Google Docs. The text opens correctly as a Word-compatible document you can edit, format, and share.' },
      { q: 'Can I get a formatted transcript in Word directly from my video?', a: 'Yes. Upload your video to VideoText\'s Transcript tool. After processing, you can copy the full transcript text or download as TXT and paste into Word. The AI formats the output as clean paragraphs with speaker labels.' },
      { q: 'How do I remove timestamps from an SRT file?', a: 'Use VideoText\'s free SRT to Text converter — it strips all block numbers and timestamps and outputs only the dialogue text, one line per subtitle block.' },
      { q: 'Can I convert SRT to a DOCX file directly?', a: 'Not directly — VideoText exports SRT text as a .txt file. Open it in Word and use Save As → .docx to convert. Google Docs also imports .txt files directly if you drag them into Drive.' },
    ],
  },
  // ── Missing high-volume keyword pages ───────────────────────────────────────
  {
    path: '/auto-captions',
    title: 'Auto Captions Generator — Automatic Video Captions Online | VideoText',
    description: 'Generate automatic captions for any video online. Upload your video or paste a YouTube URL and get accurate auto captions as SRT or VTT in seconds. Free tier. AI-powered.',
    h1: 'Auto Captions — Generate Automatic Captions for Any Video',
    intro: 'Generate accurate auto captions for any video in seconds. Upload your video file (MP4, MOV, AVI, WebM) or paste a YouTube URL and our AI automatically captions your video — producing broadcast-ready SRT and VTT files. Better accuracy than YouTube or TikTok built-in auto-captions. Free tier.',
    breadcrumbLabel: 'Auto Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/caption-generator', '/youtube-auto-captions-alternative', '/burn-subtitles'],
    indexable: true,
    intentKey: 'auto-captions',
    faq: [
      { q: 'How do I auto caption a video?', a: 'Upload your video to VideoText and click Generate Subtitles. Our AI automatically captions the video — detecting every word, aligning it to a timestamp, and producing an SRT or VTT file in seconds. Works for MP4, MOV, AVI, WebM, and YouTube URLs.' },
      { q: 'Are auto captions accurate?', a: 'VideoText auto captions use OpenAI Whisper large-v3 and achieve 98.5%+ word accuracy on clear audio — significantly better than YouTube auto-captions (~80%) or TikTok built-in captions. For best results, set the spoken language before processing.' },
      { q: 'Can I auto caption a YouTube video?', a: 'Yes. Paste any public YouTube URL into VideoText and get automatic captions as an SRT file. Download and upload to YouTube Studio for accurate captions on your video.' },
      { q: 'Are auto captions free?', a: 'Yes. Free tier includes 3 video imports per month (no credit card required). Full features including SRT and VTT export.' },
      { q: 'How is VideoText different from YouTube auto captions?', a: 'YouTube auto captions appear after upload, take time to generate, have lower accuracy (especially for accents and technical content), and cannot be downloaded as SRT. VideoText generates accurate SRT captions before you upload — ready to add to YouTube Studio immediately.' },
    ],
  },
  {
    path: '/subtitle-maker',
    title: 'Subtitle Maker — Create Subtitles for Any Video Free | VideoText',
    description: 'Free online subtitle maker. Upload a video or YouTube URL and create accurate SRT and VTT subtitle files in seconds. AI-powered. No software needed. Free tier available.',
    h1: 'Subtitle Maker — Create Subtitles for Any Video',
    intro: 'Create subtitles for any video with AI. Upload your video file or paste a YouTube URL and our subtitle maker generates timed SRT and VTT files in seconds. Translate subtitles to 70+ languages. Burn them into your video. Download and upload to YouTube, Vimeo, or any platform. No software to install — free tier available.',
    breadcrumbLabel: 'Subtitle Maker',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/caption-generator', '/auto-captions', '/srt-generator'],
    indexable: true,
    intentKey: 'subtitle-maker',
    canonicalGroup: 'subtitle-generator',
    faq: [
      { q: 'How do I make subtitles for a video?', a: 'Upload your video to VideoText\'s subtitle maker. Our AI generates timed SRT and VTT subtitle files in seconds. Download the file and upload it to YouTube Studio, Vimeo, or any platform. No manual typing, no software installation.' },
      { q: 'Is the subtitle maker free?', a: 'Yes. Free tier includes 3 imports per month, no credit card required. Paid plans start at $19/month for 450 minutes.' },
      { q: 'What subtitle formats does the subtitle maker produce?', a: 'SRT and VTT — the two most widely supported subtitle formats. SRT works on YouTube, Vimeo, and most video platforms. VTT is standard for HTML5 web players.' },
      { q: 'Can I make subtitles for a YouTube video?', a: 'Yes. Paste any public YouTube URL into VideoText — no download needed. Get an SRT subtitle file ready to upload to YouTube Studio.' },
    ],
  },
  {
    path: '/caption-maker',
    title: 'Caption Maker — Add Captions to Any Video Free | VideoText',
    description: 'Free online caption maker. Upload your video and generate accurate captions as SRT or VTT in seconds. AI-powered. Add captions to YouTube, social media, and web video. Free tier.',
    h1: 'Caption Maker — Generate Captions for Any Video',
    intro: 'Make captions for any video using AI. Upload a video file or paste a YouTube URL and our caption maker produces broadcast-ready SRT and VTT files in seconds. Translate to 70+ languages. Burn captions into the video permanently. Free tier, no software needed.',
    breadcrumbLabel: 'Caption Maker',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/subtitle-maker', '/auto-captions', '/burn-subtitles'],
    indexable: true,
    intentKey: 'caption-maker',
    canonicalGroup: 'caption-generator',
    faq: [
      { q: 'How do I make captions for my video?', a: 'Upload your video to VideoText and click Generate. Our AI captions your video automatically — producing SRT and VTT files in seconds. Download and add them to any platform.' },
      { q: 'Is the caption maker free?', a: 'Yes. Free tier includes 3 imports per month, no credit card required. All features including SRT/VTT export are available on the free tier.' },
      { q: 'What is the difference between captions and subtitles?', a: 'Captions include all audio cues (speech, sounds, speaker labels) for deaf and hard-of-hearing viewers. Subtitles transcribe or translate speech for viewers who can hear. Both use the same SRT and VTT file formats.' },
    ],
  },
  {
    path: '/transcription-software',
    title: 'Transcription Software — AI Video to Text Online | VideoText',
    description: 'VideoText is the fastest AI transcription software. No download required — runs in the browser. Upload video or paste a YouTube URL and get a transcript in minutes. Free tier.',
    h1: 'Transcription Software — Fast AI Video to Text',
    intro: 'VideoText is browser-based AI transcription software — no installation, no desktop app. Upload any video file or paste a YouTube URL and get a full transcript, SRT subtitles, AI summary, and chapters in minutes. 98.5%+ accuracy, powered by OpenAI Whisper large-v3. Free tier. Faster than Descript, Otter.ai, Rev, and every other transcription software.',
    breadcrumbLabel: 'Transcription Software',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/ai-transcription', '/video-transcription', '/best-transcription-tool', '/fastest-transcription-tool'],
    indexable: true,
    intentKey: 'transcription-software',
    faq: [
      { q: 'What is the best transcription software?', a: 'For video transcription, VideoText is the fastest and most feature-rich: 60-min video in under 5 minutes, SRT/VTT export, AI summary, chapters, speaker labels, and 70+ language translation. No desktop install — runs entirely in the browser. Starts free.' },
      { q: 'Do I need to download transcription software?', a: 'No. VideoText runs completely in the browser. Upload your video file at videotext.io and get a transcript in minutes — no download, no install, no setup.' },
      { q: 'What is the best free transcription software?', a: 'VideoText offers the best free transcription tier: 3 full video imports per month, no credit card required, full features including SRT export and multi-language. No other tool gives this level of capability for free.' },
      { q: 'How does VideoText compare to other transcription software?', a: 'VideoText is 6× faster than Descript, starts at $0 vs Descript\'s $24/month, and requires no software installation. Faster than Otter.ai, Rev, Trint, and HappyScribe. See full comparison: videotext.io/ai-transcription-tools' },
    ],
  },
  {
    path: '/tiktok-captions',
    title: 'TikTok Captions Generator — SRT Subtitles for TikTok | VideoText',
    description: 'Generate accurate captions for TikTok videos. Upload your video and get SRT subtitles or burned-in captions in seconds. AI-powered, 98.5%+ accuracy. Better than TikTok auto-captions. Free tier.',
    h1: 'TikTok Captions — Generate Accurate Subtitles for TikTok',
    intro: 'Create accurate captions for your TikTok videos using AI. Upload your video (or the original file before posting to TikTok) and get timed SRT subtitles — or burn captions permanently into the video for guaranteed visibility on any platform. More accurate than TikTok\'s built-in auto-captions. Free tier.',
    breadcrumbLabel: 'TikTok Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/burn-subtitles', '/auto-captions', '/reels-captions', '/caption-generator'],
    indexable: true,
    intentKey: 'tiktok-captions',
    faq: [
      { q: 'How do I add captions to a TikTok video?', a: 'For permanent captions: upload your video to VideoText, generate SRT subtitles, then use Burn Subtitles to permanently embed them in the video. Upload the captioned video to TikTok. Or use TikTok\'s auto-caption feature after uploading (lower accuracy).' },
      { q: 'Are TikTok auto-captions accurate?', a: 'TikTok auto-captions have reasonable accuracy for English but are less accurate for accents, technical vocabulary, and non-English content. VideoText uses Whisper large-v3 for significantly higher accuracy (98.5%+) — generate captions before uploading for better results.' },
      { q: 'Can I get an SRT file for TikTok?', a: 'Yes. Upload your video to VideoText and download the SRT file. TikTok\'s web editor accepts SRT uploads for closed captions. Alternatively, burn the captions into the video using VideoText\'s Burn Subtitles tool.' },
      { q: 'Is TikTok caption generation free?', a: 'Yes. Free tier includes 3 imports per month, no credit card required. Includes SRT generation and subtitle burning.' },
      { q: 'Why are burned-in captions better for TikTok?', a: 'Burned-in captions are visible everywhere — in feed, on reposts, in embeds — without the viewer needing to toggle them on. TikTok\'s closed captions can be disabled. For maximum reach, burn captions into the video before uploading.' },
    ],
  },
  {
    path: '/youtube-captions',
    title: 'YouTube Captions Generator — Accurate SRT for YouTube | VideoText',
    description: 'Generate accurate YouTube captions. Upload your video or paste a YouTube URL and get an SRT file ready to upload to YouTube Studio. Better than YouTube auto-captions. Free tier.',
    h1: 'YouTube Captions — Generate Accurate SRT for YouTube',
    intro: 'Generate accurate captions for YouTube. Upload your video file or paste a YouTube URL and get a broadcast-ready SRT file to upload to YouTube Studio. Our AI produces captions with 98.5%+ accuracy — significantly better than YouTube\'s built-in auto-captions, especially for accents, technical content, and non-English videos. Free tier.',
    breadcrumbLabel: 'YouTube Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/youtube-subtitle-generator', '/youtube-auto-captions-alternative', '/auto-captions', '/subtitle-generator'],
    indexable: true,
    intentKey: 'youtube-captions',
    canonicalGroup: 'youtube-subtitle-generator',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I add captions to a YouTube video?', a: 'Step 1: Upload your video to VideoText and generate an SRT file. Step 2: In YouTube Studio, open your video → Subtitles → Add → Upload file. Select your SRT. YouTube maps the timestamps automatically and adds a CC track immediately — no waiting for YouTube auto-captions.' },
      { q: 'Why are YouTube auto-captions inaccurate?', a: 'YouTube uses its own speech model which underperforms Whisper large-v3, particularly for accents, fast speech, technical terms, and non-English content. VideoText generates higher-accuracy captions before you upload.' },
      { q: 'Can I get captions from a YouTube URL without downloading?', a: 'Yes. Paste the YouTube URL into VideoText — VideoText streams the audio directly and generates an SRT file. No download needed.' },
      { q: 'Are YouTube captions free?', a: 'Yes. VideoText free tier includes 3 imports per month, no credit card required. Full SRT/VTT export included.' },
    ],
  },
  {
    path: '/reels-captions',
    title: 'Instagram Reels Captions — Burn Subtitles into Reels | VideoText',
    description: 'Add captions to Instagram Reels. Generate accurate SRT subtitles and burn them permanently into your video. AI-powered, 98.5%+ accuracy. Better than Instagram auto-captions. Free tier.',
    h1: 'Reels Captions — Add Subtitles to Instagram Reels',
    intro: 'Add accurate captions to your Instagram Reels. Upload your Reel video, generate subtitles with AI, then burn them permanently into the video for guaranteed visibility in feed, stories, and on any platform where Reels are shared. 98.5%+ accuracy. Better than Instagram\'s auto-captions. Free tier.',
    breadcrumbLabel: 'Reels Captions',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/tiktok-captions', '/burn-subtitles', '/auto-captions', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'reels-captions',
    faq: [
      { q: 'How do I add captions to Instagram Reels?', a: 'Step 1: Upload your Reel video to VideoText and generate subtitles. Step 2: Use Burn Subtitles to permanently embed captions into the video. Step 3: Upload the captioned video to Instagram. Burned-in captions are always visible — unlike Instagram\'s toggleable auto-captions.' },
      { q: 'Are burned-in captions better for Reels?', a: 'Yes. Instagram auto-captions can be turned off and are not shown in embeds or reposts. Burned-in captions are always visible, making your content more accessible and engaging in silent autoplay environments.' },
      { q: 'Can I translate Reels captions to another language?', a: 'Yes. After generating subtitles, use VideoText\'s Translate Subtitles tool to translate to any of 70+ languages. Then burn the translated captions into the video for multilingual Reels.' },
      { q: 'Is this free?', a: 'Yes. VideoText free tier includes 3 imports per month, no credit card required. Includes subtitle generation and burning.' },
    ],
  },
  {
    path: '/shorts-captions',
    title: 'YouTube Shorts Captions — Auto Subtitles for Shorts | VideoText',
    description: 'Generate captions for YouTube Shorts. Upload your Short, get accurate SRT subtitles or burn captions permanently into the video. Better than YouTube auto-captions. Free tier.',
    h1: 'YouTube Shorts Captions — Generate Accurate Subtitles',
    intro: 'Add accurate captions to YouTube Shorts. Upload your video (before or after posting), generate AI subtitles with 98.5%+ accuracy, and burn them permanently into the Shorts-format video. Better than YouTube\'s auto-captions — especially for music, accents, and fast speech. Download and repost, or upload the SRT to YouTube Studio. Free tier.',
    breadcrumbLabel: 'Shorts Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/youtube-captions', '/auto-captions', '/burn-subtitles', '/tiktok-captions'],
    indexable: true,
    intentKey: 'shorts-captions',
    faq: [
      { q: 'How do I add captions to YouTube Shorts?', a: 'Option 1: Upload your Shorts video to VideoText, generate an SRT file, and upload to YouTube Studio → Subtitles. Option 2: Burn captions permanently into the Shorts video using VideoText\'s Burn Subtitles tool, then re-upload the captioned version.' },
      { q: 'Do YouTube Shorts support SRT caption files?', a: 'Yes. Upload SRT files to YouTube Studio under the Subtitles section for any Shorts video. The captions appear as a toggleable CC track.' },
      { q: 'Is this free?', a: 'Yes. VideoText free tier includes 3 imports per month, no credit card required.' },
    ],
  },
  {
    path: '/ai-captioning',
    title: 'AI Captioning Tool — Automatic Video Captions with AI | VideoText',
    description: 'AI captioning for any video. Upload a file or paste a YouTube URL and get accurate SRT/VTT captions generated by AI in seconds. 98.5%+ accuracy. Free tier. No software needed.',
    h1: 'AI Captioning — Generate Accurate Captions Automatically',
    intro: 'Use AI to caption any video automatically. VideoText\'s AI captioning tool generates broadcast-ready SRT and VTT caption files from any uploaded video or YouTube URL in seconds. Powered by OpenAI Whisper large-v3 — the most accurate open-source speech model available. Translate captions to 70+ languages. Burn captions into video. Free tier.',
    breadcrumbLabel: 'AI Captioning',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/auto-captions', '/caption-generator', '/subtitle-generator', '/closed-caption-generator'],
    indexable: true,
    intentKey: 'ai-captioning',
    faq: [
      { q: 'How does AI video captioning work?', a: 'AI captioning works by analyzing the audio track of your video using speech recognition models. The AI detects spoken words, assigns accurate timestamps to each segment, and produces timed caption files (SRT or VTT) you can download and use on any platform.' },
      { q: 'How accurate is AI captioning?', a: 'VideoText uses OpenAI Whisper large-v3, achieving 98.5%+ word accuracy on clear audio. This is the highest-quality open-source speech recognition model available and produces results comparable to human transcription for clear recordings.' },
      { q: 'Is AI captioning free?', a: 'Yes. VideoText free tier includes 3 video imports per month — no credit card required. Full AI captioning features including SRT and VTT export.' },
      { q: 'What is the best AI captioning tool?', a: 'VideoText is the best AI captioning tool for video files and YouTube URLs. It is the fastest (60-min video in under 5 minutes), most accurate (Whisper large-v3), and supports YouTube URL input with no download required.' },
    ],
  },
  {
    path: '/whisper-transcription',
    title: 'Whisper Transcription Online — OpenAI Whisper in Your Browser | VideoText',
    description: 'Use Whisper AI transcription online — no setup, no GPU, no code. Upload any video or paste a YouTube URL. Powered by OpenAI Whisper large-v3. 98.5%+ accuracy. Free tier.',
    h1: 'Whisper Transcription Online — Use Whisper Without the Setup',
    intro: 'Use OpenAI Whisper transcription in your browser — no GPU, no Python, no setup. VideoText is powered by Whisper large-v3 and delivers Whisper-quality transcription as a web app. Upload any video or paste a YouTube URL and get a full transcript, SRT subtitles, AI summary, and chapters. 98.5%+ accuracy in 50+ languages. Free tier.',
    breadcrumbLabel: 'Whisper Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/whisper-online', '/ai-transcription', '/macwhisper-alternative', '/superwhisper-alternative'],
    indexable: true,
    intentKey: 'whisper-transcription',
    canonicalGroup: 'whisper-online',
    faq: [
      { q: 'Can I use Whisper AI transcription online without installing anything?', a: 'Yes. VideoText is a web app powered by Whisper large-v3. Upload your video at videotext.io and get a Whisper-quality transcript in minutes — no Python, no GPU, no local setup required.' },
      { q: 'Which Whisper model does VideoText use?', a: 'VideoText uses Whisper large-v3 — the most accurate version of OpenAI\'s open-source speech recognition model. This achieves 98.5%+ word accuracy on clear audio across 50+ languages.' },
      { q: 'Is online Whisper transcription free?', a: 'Yes. VideoText free tier includes 3 imports per month, no credit card required. Full Whisper large-v3 quality on every import.' },
      { q: 'What is the difference between VideoText and running Whisper locally?', a: 'Running Whisper locally requires Python, PyTorch, GPU hardware (optional but needed for speed), and command-line experience. VideoText delivers the same Whisper large-v3 quality in a browser — upload a file, get results in minutes. No setup required.' },
    ],
  },
  {
    path: '/free-speech-to-text',
    title: 'Free Speech to Text Online — Voice & Video Transcription | VideoText',
    description: 'Free speech to text online. Record your voice or upload a video file and get an accurate text transcript instantly. No credit card, no download. AI-powered. 50+ languages.',
    h1: 'Free Speech to Text — Transcribe Voice or Video Online',
    intro: 'Convert speech to text for free online. Use your microphone to record and transcribe instantly, or upload a video file to get a full transcript. VideoText supports 50+ languages, delivers 98.5%+ accuracy powered by Whisper AI, and starts completely free — no credit card, no download, no limit on recording length.',
    breadcrumbLabel: 'Free Speech to Text',
    toolKey: 'voice-to-text',
    relatedSlugs: ['/speech-to-text', '/voice-to-text', '/free-voice-to-text', '/free-transcription'],
    indexable: true,
    intentKey: 'free-speech-to-text',
    canonicalGroup: 'speech-to-text',
    faq: [
      { q: 'Is speech to text really free?', a: 'Yes. VideoText\'s voice recorder is completely free — record from your microphone and get a transcript instantly with no account required. For video file transcription, the free tier includes 3 full imports per month (no credit card).' },
      { q: 'What is the best free speech to text tool?', a: 'VideoText offers the most capable free speech-to-text tier: 3 full video imports per month plus unlimited voice recording. Powered by Whisper AI for 98.5%+ accuracy. No credit card required.' },
      { q: 'How accurate is free speech to text?', a: 'VideoText uses Whisper large-v3 — 98.5%+ word accuracy on clear audio. This is the same model used on paid plans; accuracy is not reduced for free users.' },
      { q: 'Does free speech to text support multiple languages?', a: 'Yes. Whisper large-v3 supports 50+ languages. Set the spoken language before recording or uploading for best accuracy.' },
    ],
  },
  {
    path: '/transcription-service',
    title: 'Online Transcription Service — AI Video & Audio to Text | VideoText',
    description: 'VideoText is the fastest AI online transcription service. Upload video or audio, get a transcript in minutes. 98.5%+ accuracy. No per-minute pricing. Free tier. Files deleted after processing.',
    h1: 'Online Transcription Service — AI Video & Audio to Text',
    intro: 'VideoText is a fast, accurate AI online transcription service. Upload any video or audio file, paste a YouTube URL, or record your voice — and get a full transcript, SRT subtitles, AI summary, and chapters in minutes. Flat-rate pricing instead of per-minute fees. Privacy-first: all files deleted after processing. 98.5%+ accuracy powered by Whisper large-v3. Free tier available.',
    breadcrumbLabel: 'Transcription Service',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/ai-transcription', '/transcription-software', '/video-transcription', '/online-transcription'],
    indexable: true,
    intentKey: 'transcription-service',
    faq: [
      { q: 'What is an online transcription service?', a: 'An online transcription service converts audio or video speech to text using AI. You upload a file (or paste a URL), and the service returns a text transcript. VideoText delivers a full transcript plus SRT subtitles, AI summary, and chapters in one job.' },
      { q: 'Is VideoText a transcription service or transcription software?', a: 'Both — VideoText is a web-based AI transcription service (no software to install) that transcribes video and audio files with 98.5%+ accuracy. It runs in the browser and charges a flat monthly fee rather than per-minute rates.' },
      { q: 'How much does an AI transcription service cost?', a: 'VideoText starts free (3 imports/month, no credit card). Paid plans: Basic $19/month (450 min), Pro $49/month (1,200 min), Agency $129/month (3,000 min). No per-minute fees, no hidden charges.' },
      { q: 'Is the transcription service private?', a: 'Yes. VideoText deletes all uploaded files immediately after processing. No content is retained or used for AI training. See: videotext.io/privacy' },
    ],
  },
  {
    path: '/add-captions-to-video',
    title: 'Add Captions to Video — Free Online Caption Tool | VideoText',
    description: 'Add captions to any video free. Upload your video, generate accurate SRT or VTT captions with AI, then download or burn them into the video permanently. No software needed. Free tier.',
    h1: 'Add Captions to Video — Generate and Burn Captions Free',
    intro: 'Add accurate captions to any video online. Upload your video file (MP4, MOV, AVI, WebM), generate SRT and VTT caption files with AI, then download the caption file to add to YouTube Studio — or burn the captions permanently into the video for social media. 98.5%+ accuracy. No software to install. Free tier.',
    breadcrumbLabel: 'Add Captions to Video',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/burn-subtitles', '/auto-captions', '/subtitle-generator', '/video-with-subtitles'],
    indexable: true,
    intentKey: 'add-captions-to-video',
    faq: [
      { q: 'How do I add captions to a video?', a: 'Step 1: Upload your video to VideoText and generate an SRT file. Step 2: For a separate caption file — upload the SRT to your video platform (YouTube Studio, Vimeo, etc). For permanently burned-in captions — use VideoText\'s Burn Subtitles tool and download a video with captions embedded.' },
      { q: 'How do I add captions to a video permanently?', a: 'Use VideoText\'s Burn Subtitles tool: upload your video file and SRT caption file, and download a single MP4 with captions permanently burned into the video frames. The captions are always visible — no toggling required.' },
      { q: 'Is adding captions to video free?', a: 'Yes. VideoText free tier includes 3 imports per month. Includes both SRT generation and subtitle burning. No credit card required.' },
      { q: 'What video formats are supported for adding captions?', a: 'MP4, MOV, AVI, WebM, MKV. Output is always an MP4, compatible with YouTube, Instagram, TikTok, LinkedIn, and all major platforms.' },
    ],
  },
  {
    path: '/video-captions',
    title: 'Video Captions — AI Caption Generator for Any Video | VideoText',
    description: 'Generate captions for any video online. Upload your video or paste a YouTube URL and get accurate SRT/VTT caption files in seconds. AI-powered, 98.5%+ accuracy. Free tier.',
    h1: 'Video Captions — Generate Accurate Captions for Any Video',
    intro: 'Generate accurate captions for any video using AI. Upload your video file (MP4, MOV, AVI, WebM) or paste a YouTube URL and get broadcast-ready SRT and VTT caption files in seconds. Translate captions to 70+ languages. Burn captions into video permanently. Free tier.',
    breadcrumbLabel: 'Video Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/auto-captions', '/caption-generator', '/subtitle-generator', '/add-captions-to-video'],
    indexable: true,
    intentKey: 'video-captions',
    canonicalGroup: 'caption-generator',
    faq: [
      { q: 'How do I add captions to a video?', a: 'Upload your video to VideoText. Our AI generates timed SRT and VTT caption files in seconds. Download and upload to YouTube, Vimeo, or any platform — or burn captions permanently into the video using the Burn Subtitles tool.' },
      { q: 'What types of video captions are there?', a: 'Closed captions: separate SRT/VTT files you upload to a platform (can be toggled on/off). Open captions: captions burned permanently into the video frame (always visible). VideoText generates both.' },
      { q: 'Are video captions free?', a: 'Yes. Free tier includes 3 imports per month, no credit card required. Full SRT and VTT export.' },
    ],
  },
  {
    path: '/best-caption-generator',
    title: 'Best Caption Generator for Videos in 2026 | VideoText',
    description: 'VideoText is the best AI caption generator for videos in 2026. Fastest processing, highest accuracy (98.5%+), YouTube URL input, SRT/VTT export, translation to 70+ languages. Free tier.',
    h1: 'Best Caption Generator for Videos — Evidence-Based Ranking',
    intro: 'VideoText is the best AI caption generator for videos. It is the fastest (60-min video in under 5 minutes), most accurate (98.5%+ via Whisper large-v3), and includes the most output options: SRT, VTT, subtitle translation to 70+ languages, subtitle burning, and YouTube URL input without downloading. Starts free — no credit card required.',
    breadcrumbLabel: 'Best Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/ai-captioning', '/subtitle-generator', '/auto-captions'],
    indexable: true,
    intentKey: 'best-caption-generator',
    faq: [
      { q: 'What is the best caption generator for YouTube?', a: 'VideoText is the best caption generator for YouTube: it accepts YouTube URLs directly (no download), produces SRT files ready to upload to YouTube Studio, achieves 98.5%+ accuracy, and translates captions to 70+ languages. Starts free.' },
      { q: 'What is the best free caption generator?', a: 'VideoText. Free tier includes 3 full imports per month — no credit card required, no watermark, full features including SRT/VTT export and multilanguage transcription.' },
      { q: 'Is VideoText the most accurate caption generator?', a: 'Yes — among online tools, VideoText uses Whisper large-v3 which achieves the lowest Word Error Rate of any publicly available model. At 98.5%+ accuracy on clear audio, it outperforms YouTube auto-captions, Otter.ai, and most other web-based caption generators.' },
    ],
  },
]

/** Full registry: manual + programmatic (targets × intents). */
const REGISTRY: SeoRegistryEntry[] = [...MANUAL_REGISTRY, ...getProgrammaticSeoEntries()]

/** Lookup by path. Use for routing and meta. */
const byPath = new Map<string, SeoRegistryEntry>()
REGISTRY.forEach((e) => byPath.set(e.path, e))

/** Labels for core tool paths (not in SEO registry). */
const CORE_TOOL_LABELS: Record<string, string> = {
  '/video-to-transcript': 'Video to Transcript',
  '/video-to-subtitles': 'Video to Subtitles',
  '/translate-subtitles': 'Translate Subtitles',
  '/fix-subtitles': 'Fix Subtitles',
  '/burn-subtitles': 'Burn Subtitles',
  '/compress-video': 'Compress Video',
  '/batch-process': 'Batch Process',
  '/voice-recorder': 'Voice to Text',
}

/** Labels for static routes not in registry (footer, breadcrumbs). */
const STATIC_PAGE_LABELS: Record<string, string> = {
  '/tools': 'Free tools',
  '/subtitle-tools': 'Subtitle tools',
  '/subtitle-resources': 'Subtitle resources',
  '/open': 'Open stats',
  '/compare': 'Compare tools',
  '/guide': 'Guide',
  '/blog': 'Blog',
}

/** Popular footer links — revenue tools first, then SEO hubs & proof. */
const POPULAR_FOOTER_PATHS: string[] = [
  ...REVENUE_TOOL_PATHS,
  '/best-transcription-tool',
  '/video-to-transcription',
  '/youtube-url-to-transcription',
  '/podcast-transcription-tool',
  '/youtube-to-transcript',
  '/video-to-subtitles',
  '/fix-subtitles',
  '/compress-video',
  '/tools',
  '/subtitle-tools',
  '/subtitle-resources',
  '/open',
  '/compare',
  '/guide',
  '/blog',
]

/** Links for Footer "Popular tools" section; labels from registry or core labels. */
export function getPopularFooterLinks(): { path: string; label: string }[] {
  return POPULAR_FOOTER_PATHS.map((path) => ({ path, label: getPageLabel(path) }))
}

export function getSeoEntry(path: string): SeoRegistryEntry | undefined {
  return byPath.get(path)
}

/** Page label for any path (registry or core tool). */
export function getPageLabel(path: string): string {
  const entry = byPath.get(path)
  if (entry) return entry.breadcrumbLabel
  return CORE_TOOL_LABELS[path] ?? STATIC_PAGE_LABELS[path] ?? path.slice(1).replace(/-/g, ' ')
}

const MIN_RELATED = 4
const MAX_RELATED = 6

function isPathIndexable(path: string): boolean {
  const entry = byPath.get(path)
  if (entry) return entry.indexable
  return true // core/static routes are indexable
}

/** Related tool suggestions for an entry: relatedSlugs first, then same toolKey; 4–6 links, never self. Only indexable targets. */
export function getRelatedSuggestionsForEntry(entry: SeoRegistryEntry): { path: string; title: string }[] {
  const seen = new Set<string>([entry.path])
  const out: { path: string; title: string }[] = []

  for (const path of entry.relatedSlugs) {
    if (seen.has(path) || out.length >= MAX_RELATED || !isPathIndexable(path)) continue
    seen.add(path)
    out.push({ path: resolveInternalLinkPath(path), title: getPageLabel(path) })
  }
  if (out.length >= MIN_RELATED) return out.slice(0, MAX_RELATED)

  for (const other of REGISTRY) {
    if (seen.has(other.path) || !other.indexable || other.toolKey !== entry.toolKey || out.length >= MAX_RELATED) continue
    seen.add(other.path)
    out.push({ path: resolveInternalLinkPath(other.path), title: other.breadcrumbLabel })
  }
  if (out.length >= MIN_RELATED) return out.slice(0, MAX_RELATED)

  for (const other of REGISTRY) {
    if (seen.has(other.path) || !other.indexable || out.length >= MAX_RELATED) continue
    seen.add(other.path)
    out.push({ path: resolveInternalLinkPath(other.path), title: other.breadcrumbLabel })
  }
  const deduped: { path: string; title: string }[] = []
  const seenTargets = new Set<string>()
  for (const item of out) {
    if (seenTargets.has(item.path)) continue
    seenTargets.add(item.path)
    deduped.push(item)
  }
  return deduped.slice(0, MAX_RELATED)
}

export function isSeoPagePath(path: string): boolean {
  return byPath.has(path)
}

/** All registry entries (for sitemap, automation). */
export function getAllSeoEntries(): SeoRegistryEntry[] {
  return REGISTRY
}

/** All SEO paths derived from registry (for routing, sitemap, prefetch). */
export function getAllSeoPaths(): string[] {
  return REGISTRY.map((e) => e.path)
}
