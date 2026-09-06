/**
 * Load SEO page inventory and optional programmatic page definitions.
 * Used by decision engine and sitemap generator.
 */
import * as path from 'path'
import * as fs from 'fs'
import { getProgrammaticSeoEntries } from '../../client/src/lib/generateSeoPages'
import { getCanonicalPathForRoute } from '../../client/src/lib/primaryUrls'
export { SLUG_TO_PRIMARY } from '../../client/src/lib/slugToPrimary'

const SCRIPT_DIR = __dirname
const REPO_ROOT = path.join(SCRIPT_DIR, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

/** Static routes (all indexable). Single source of truth; sync script imports from here. */
export const STATIC_ROUTES = [
  '/',
  '/samples',
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
  '/guideline-format',
  '/best-transcription-tool',
  '/fastest-transcription-tool',
  '/podcast-transcription-tool',
  '/interview-transcription-tool',
  '/transcription-benchmark',
  '/accuracy-test',
  '/fastest-transcription-software',
  '/ai-transcription-tools',
  '/ai-transcription-workflow',
  '/google-meet-transcript',
  '/teams-meeting-transcript',
  '/free-captions-and-subtitles',
  '/translation',
  '/voice-recorder',
  '/subtitle-validator',
  '/subtitle-reading-speed',
  '/subtitle-character-checker',
  '/subtitle-word-counter',
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
  '/samples',
  '/video-to-transcript',
  '/video-to-subtitles',
  '/youtube-transcript-generator',
  '/audio-to-text-converter',
  '/video-caption-generator',
  '/add-subtitles-to-video',
  '/podcast-transcription',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/guideline-format',
  '/best-transcription-tool',
  '/fastest-transcription-tool',
  '/podcast-transcription-tool',
  '/interview-transcription-tool',
  '/transcription-benchmark',
  '/accuracy-test',
  '/fastest-transcription-software',
  '/ai-transcription-tools',
  '/ai-transcription-workflow',
  '/google-meet-transcript',
  '/teams-meeting-transcript',
  '/free-captions-and-subtitles',
  '/translation',
  '/voice-recorder',
  '/subtitle-validator',
  '/subtitle-reading-speed',
  '/subtitle-character-checker',
  '/subtitle-word-counter',
  // Cluster A — Platform-specific (high-intent) - moved to Sitemap 2 via seoRegistry.ts
  // Cluster B — Language-specific - moved to Sitemap 2 via seoRegistry.ts
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
  '/integrations/zapier',
  '/docs/api',
  // Cluster I — Comparison / vs pages (fully SSR-prerendered)
  '/temi-vs-videotext',
  '/videotext-vs-rev',
  '/otter-vs-videotext',
  '/descript-vs-videotext',
  '/videotext-vs-turboscribe',
  '/best-otter-alternatives',
  '/best-descript-alternatives',
  // Cluster F — Journalist & Student pages - moved to Sitemap 2 via seoRegistry.ts
  // Cluster G — High-volume meeting platform alternatives - moved to Sitemap 2 via seoRegistry.ts
  // Cluster H — Voice-to-Text
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
  // Voice competitors - moved to Sitemap 2 via seoRegistry.ts
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
  '/tools/html-to-srt',
  '/subtitle-tools',
  '/subtitle-resources',
]

/** Programmatic-only paths (from targets × intents). Submit after core. */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}

/** Paths for sitemap 2: programmatic + remaining manual (not in core). No duplicates with core. */
export function getSitemap2Paths(): string[] {
  const coreSet = new Set(CORE_PATHS.map((p) => getCanonicalPathForRoute(p)))
  const registry = getIndexableSeoPathsFromRegistry()
  const programmatic = getProgrammaticPaths()
  const otherManual = registry.filter((p) => !coreSet.has(getCanonicalPathForRoute(p)))
  const otherProgrammatic = programmatic.filter((p) => !coreSet.has(getCanonicalPathForRoute(p)))
  const freeTools = FREE_TOOL_AND_HUB_PATHS.filter((p) => !coreSet.has(getCanonicalPathForRoute(p)))
  return [...new Set([...otherManual, ...otherProgrammatic, ...freeTools])]
    .map((p) => getCanonicalPathForRoute(p))
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i)
}

/** All routes (for validation). No duplicates. */
export function getIndexablePaths(): string[] {
  return [...new Set([...CORE_PATHS, ...getSitemap2Paths()])]
    .map((p) => getCanonicalPathForRoute(p))
    .filter(Boolean)
    .filter((p) => p !== '/site-index')
    .filter((p, i, arr) => arr.indexOf(p) === i)
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
