/**
 * Load SEO page inventory and optional programmatic page definitions.
 * Used by decision engine and sitemap generator.
 */
import * as path from 'path'
import * as fs from 'fs'
import { getProgrammaticSeoEntries } from '../../client/src/lib/generateSeoPages'

const SCRIPT_DIR = __dirname
const REPO_ROOT = path.join(SCRIPT_DIR, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

/** Static routes (all indexable). Single source of truth; sync script imports from here. */
export const STATIC_ROUTES = [
  '/',
  '/pricing',
  '/privacy',
  '/faq',
  '/terms',
  '/video-to-transcript',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/batch-process',
  '/transcription-benchmark',
  '/accuracy-test',
  '/best-transcription-tool',
  '/fastest-transcription-software',
  '/fastest-transcription-tool',
  '/otter-vs-videotext',
  '/descript-vs-videotext',
  '/ai-transcription-tools',
  '/videotext-vs-turboscribe',
  '/videotext-vs-rev',
  '/best-otter-alternatives',
  '/best-descript-alternatives',
  '/ai-transcription-workflow',
  '/podcast-transcription-tool',
  '/interview-transcription-tool',
  '/youtube-video-to-transcript',
  '/otter-vs-videotext',
  '/descript-vs-videotext',
  '/ai-transcription-tools',
]

export function loadRoutesInventory(): string[] {
  const file = path.join(SCRIPT_DIR, 'routes-inventory.json')
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, 'utf8')
  const arr = JSON.parse(raw) as string[]
  return Array.isArray(arr) ? arr : []
}

/** Parse seoRegistry.ts for paths and indexable flag. Returns only indexable SEO paths. */
function getIndexableSeoPathsFromRegistry(): string[] {
  if (!fs.existsSync(REGISTRY_PATH)) return []
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const pathRe = /path:\s*'(\/[^']+)'/g
  const matches = [...content.matchAll(pathRe)]
  const nonIndexable = new Set<string>()
  for (let i = 0; i < matches.length; i++) {
    const blockStart = matches[i].index!
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index! : content.length
    const block = content.slice(blockStart, blockEnd)
    if (/indexable:\s*false/.test(block)) nonIndexable.add(matches[i][1])
  }
  return matches.map((m) => m[1]).filter((p) => !nonIndexable.has(p))
}

/** Core pages (~35) — submit first. Homepage, legal, key tools, high-intent manual pages. */
export const CORE_PATHS: string[] = [
  '/',
  '/pricing',
  '/privacy',
  '/faq',
  '/terms',
  '/guide',
  '/blog',
  '/video-to-transcript',
  '/video-to-text',
  '/video-to-subtitles',
  '/youtube-to-transcript',
  '/youtube-transcript',
  '/youtube-transcript-generator',
  '/transcribe-youtube-video',
  '/audio-to-text',
  '/audio-to-text-converter',
  '/subtitle-generator',
  '/video-caption-generator',
  '/add-subtitles-to-video',
  '/srt-generator',
  '/video-to-srt',
  '/podcast-transcript',
  '/podcast-transcription',
  '/meeting-transcript',
  '/meeting-transcription',
  '/webinar-transcription',
  '/interview-transcription',
  '/video-summary-generator',
  '/video-chapters-generator',
  '/keyword-indexed-transcript',
  '/video-compressor',
  '/reduce-video-size',
  '/translate-subtitles',
  '/translate-video',
  '/video-translation',
  '/fix-subtitles',
  '/burn-subtitles',
  '/batch-process',
  '/transcription-benchmark',
  '/accuracy-test',
  '/best-transcription-tool',
  '/fastest-transcription-software',
  '/fastest-transcription-tool',
  '/otter-vs-videotext',
  '/descript-vs-videotext',
  '/ai-transcription-tools',
  '/videotext-vs-turboscribe',
  '/videotext-vs-rev',
  '/best-otter-alternatives',
  '/best-descript-alternatives',
  '/ai-transcription-workflow',
  '/podcast-transcription-tool',
  '/interview-transcription-tool',
  '/youtube-video-to-transcript',
  '/otter-vs-videotext',
  '/descript-vs-videotext',
  '/ai-transcription-tools',
  '/mp4-to-text',
  '/mp4-to-srt',
  // Cluster A — Platform-specific (high-intent)
  '/tiktok-to-transcript',
  '/google-meet-transcript',
  '/teams-meeting-transcript',
  '/zoom-recording-transcript',
  '/loom-transcription',
  '/screen-recording-transcript',
  '/instagram-reel-transcript',
  '/vimeo-transcription',
  '/riverside-transcription',
  // Cluster B — Language-specific
  '/spanish-transcription',
  '/hindi-transcription',
  '/french-transcription',
  '/chinese-transcription',
  '/arabic-transcription',
  '/portuguese-transcription',
  '/japanese-transcription',
  '/korean-transcription',
  '/german-transcription',
  '/italian-transcription',
  // Cluster C — Competitor alternatives
  '/whisper-online',
  '/fireflies-alternative',
  '/kapwing-alternative',
  '/submagic-alternative',
  '/castmagic-alternative',
  '/riverside-alternative',
  '/zubtitle-alternative',
  '/adobe-premiere-captions-alternative',
  '/assembly-ai-alternative',
  '/notta-alternative',
  '/tactiq-alternative',
  '/subly-alternative',
  '/meetgeek-alternative',
  '/maestra-alternative',
  // Cluster D — Audio formats
  '/mp3-to-text',
  '/wav-to-text',
  '/m4a-to-text',
  '/mkv-to-text',
  '/avi-to-text',
  '/aac-to-text',
  '/ogg-to-text',
  '/flac-to-text',
  // Cluster E — Subtitle editor & landing pages
  '/subtitle-editor',
  '/online-subtitle-editor',
  '/capcut-captions',
  '/sdh-subtitles',
  '/open-captions-vs-closed-captions',
  '/video-accessibility',
  '/ada-video-captions',
  '/how-to-create-srt-file',
  '/how-to-add-subtitles-to-mp4',
  '/srt-to-word',
  // Core product pages
  '/about',
  '/compare',
  '/open',
  '/changelog',
  '/guide',
  // Cluster F — Journalist & Student pages
  '/transcription-for-journalists',
  '/transcription-for-students',
  '/best-transcription-tool-for-journalists',
  '/best-transcription-tool-for-students',
  '/press-conference-transcription',
  '/research-interview-transcription',
  '/qualitative-research-transcription',
  '/journalism-transcription',
  '/academic-transcription',
  // Blog posts for journalist & student audiences
  '/blog/best-transcription-tools-for-journalists',
  '/blog/best-transcription-tools-for-students',
  '/blog/how-to-transcribe-interview-recording',
  '/blog/how-to-transcribe-lecture-recording',
  // Cluster G — High-volume meeting platform alternatives (custom comparison pages)
  '/zoom-alternative',
  '/microsoft-teams-alternative',
  '/panopto-alternative',
  '/panopto-transcription',
  '/webex-alternative',
  '/notta-alternative',
  '/tactiq-alternative',
  '/capcut-alternative',
  '/macwhisper-alternative',
  '/deepgram-alternative',
  // Cluster H — Voice-to-Text (browser-based voice recorder → Whisper transcription)
  '/voice-recorder',
  '/voice-to-text',
  '/speech-to-text',
  '/voice-to-text-online',
  '/online-voice-recorder',
  '/voice-recorder-online',
  '/free-voice-to-text',
  '/speak-to-text',
  '/microphone-to-text',
  '/dictation-tool',
  '/voice-memo-to-text',
  '/voice-notes-to-text',
  '/voice-to-text-converter',
  // Cluster H — Voice competitors (high-volume alternative pages)
  '/dragon-dictate-alternative',
  '/speechify-alternative',
  '/speechnotes-alternative',
  '/speechtexter-alternative',
  '/dictation-io-alternative',
  '/whispertype-alternative',
  // Remaining alternatives are in sitemap2 via seoRegistry
]

/**
 * Free client-side tools + hub pages (prerender STATIC_META). Must stay in sync with
 * scripts/prerender.ts and STATIC_ROUTE_SEO in client/src/lib/seoMeta.ts.
 * Previously omitted from sitemaps → weaker discovery vs internal links only.
 */
export const FREE_TOOL_AND_HUB_PATHS: string[] = [
  '/tools',
  '/tools/srt-to-vtt',
  '/tools/vtt-to-srt',
  '/tools/shift-subtitle-timing',
  '/tools/merge-srt-files',
  '/tools/srt-to-text',
  '/tools/subtitle-validator',
  '/tools/subtitle-reading-speed',
  '/tools/subtitle-character-checker',
  '/tools/subtitle-word-counter',
  '/tools/video-script-timer',
  '/tools/words-per-minute-calculator',
  '/tools/video-bitrate-calculator',
  '/tools/aspect-ratio-calculator',
  '/tools/timestamp-converter',
  '/tools/video-metadata-viewer',
  '/tools/sbv-to-srt',
  '/tools/srt-to-sbv',
  '/tools/ass-to-srt',
  '/tools/ttml-to-srt',
  '/subtitle-tools',
  '/subtitle-resources',
]

/** Programmatic-only paths (from targets × intents). Submit after core. */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}

/** Paths for sitemap 2: programmatic + remaining manual (not in core). No duplicates with core. */
export function getSitemap2Paths(): string[] {
  const coreSet = new Set(CORE_PATHS)
  const registry = getIndexableSeoPathsFromRegistry()
  const programmatic = getProgrammaticPaths()
  const otherManual = registry.filter((p) => !coreSet.has(p))
  const otherProgrammatic = programmatic.filter((p) => !coreSet.has(p))
  const freeTools = FREE_TOOL_AND_HUB_PATHS.filter((p) => !coreSet.has(p))
  return [...new Set([...otherManual, ...otherProgrammatic, ...freeTools])]
}

/** All routes (for validation). No duplicates. */
export function getIndexablePaths(): string[] {
  return [...new Set([...CORE_PATHS, ...getSitemap2Paths()])]
}

/** Intent keys of indexable SEO pages (for decision engine: block CREATE_NEW_PAGE if intentKey exists). */
export function getExistingIntentKeys(): Set<string> {
  if (!fs.existsSync(REGISTRY_PATH)) return new Set()
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const pathRe = /path:\s*'(\/[^']+)'/g
  const matches = [...content.matchAll(pathRe)]
  const nonIndexable = new Set<string>()
  for (let i = 0; i < matches.length; i++) {
    const blockEnd = matches[i + 1] ? matches[i + 1].index! : content.length
    const block = content.slice(matches[i].index!, blockEnd)
    if (/indexable:\s*false/.test(block)) nonIndexable.add(matches[i][1])
  }
  const keys = new Set<string>()
  for (let i = 0; i < matches.length; i++) {
    if (nonIndexable.has(matches[i][1])) continue
    const blockEnd = matches[i + 1] ? matches[i + 1].index! : content.length
    const block = content.slice(matches[i].index!, blockEnd)
    const m = block.match(/intentKey:\s*'([^']+)'/)
    if (m && m[1]) keys.add(m[1])
  }
  return keys
}

/** Slug to primary path mapping for tool clusters (canonical tool URL). */
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
  'batch-video-processing': '/batch-process',
  'bulk-subtitle-export': '/batch-process',
  'bulk-transcript-export': '/batch-process',
  // Transcription variants
  'transcribe-video': '/video-to-transcript',
  'video-transcription': '/video-to-transcript',
  'free-transcription': '/video-to-transcript',
  'online-transcription': '/video-to-transcript',
  'ai-transcription': '/video-to-transcript',
  'audio-to-text': '/video-to-transcript',
  'podcast-transcript': '/video-to-transcript',
  'zoom-recording-transcript': '/video-to-transcript',
  'interview-transcription': '/video-to-transcript',
  'lecture-transcription': '/video-to-transcript',
  // YouTube transcription (high SEO potential)
  'youtube-to-transcript': '/youtube-to-transcript',
  'youtube-transcript': '/youtube-to-transcript',
  'youtube-video-transcript': '/youtube-to-transcript',
  'transcribe-youtube-video': '/youtube-to-transcript',
  'youtube-to-text': '/youtube-to-transcript',
  // Format-specific transcription
  'mov-to-text': '/video-to-transcript',
  'webm-to-text': '/video-to-transcript',
  // Subtitle/caption variants
  'automatic-subtitles': '/video-to-subtitles',
  'caption-generator': '/video-to-subtitles',
  'closed-caption-generator': '/video-to-subtitles',
  'free-subtitle-generator': '/video-to-subtitles',
  'video-to-srt': '/video-to-subtitles',
  'srt-generator': '/video-to-subtitles',
  // Translation variants
  'translate-video': '/translate-subtitles',
  'video-translation': '/translate-subtitles',
  'bulk-video-transcription': '/batch-process',
}

export function pathToSlug(routePath: string): string {
  return routePath === '/' ? 'home' : routePath.slice(1).replace(/\//g, '-')
}

/** Find best existing path for a keyword (simple keyword overlap). */
export function findBestExistingPath(
  keyword: string,
  inventory: string[]
): string | undefined {
  const k = keyword.toLowerCase().replace(/\s+/g, '-')
  const slug = k.replace(/[^a-z0-9-]/g, '')
  for (const p of inventory) {
    const pSlug = pathToSlug(p)
    if (pSlug === slug || pSlug.includes(slug) || slug.includes(pSlug)) return p
  }
  const words = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  for (const p of inventory) {
    const pSlug = pathToSlug(p)
    const matchCount = words.filter((w) => pSlug.includes(w.replace(/[^a-z0-9]/g, ''))).length
    if (matchCount >= 2) return p
  }
  return undefined
}
