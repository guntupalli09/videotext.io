/**
 * Programmatic SEO page template.
 * Renders the correct core tool for a given path using the SEO registry.
 * Includes registry-driven Related tools (4–6 links) for internal linking.
 */
import { lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { getSeoEntry, getRelatedSuggestionsForEntry } from '../lib/seoRegistry'
import type { SeoToolKey } from '../lib/seoRegistry'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import NotFound from './NotFound'
import { resolveInternalLinkPath } from '../lib/primaryUrls'

// Lazy-load core tools so only the needed one is loaded for each SEO URL
const VideoToTranscript = lazy(() => import('./VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./VideoToSubtitles'))
const TranslateSubtitles = lazy(() => import('./TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./FixSubtitles'))
const BurnSubtitles = lazy(() => import('./BurnSubtitles'))
const CompressVideo = lazy(() => import('./CompressVideo'))
const BatchProcess = lazy(() => import('./BatchProcess'))
const VoiceRecorder = lazy(() => import('./VoiceRecorder'))

const TOOL_MAP: Record<SeoToolKey, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'video-to-transcript': VideoToTranscript,
  'video-to-subtitles': VideoToSubtitles,
  'translate-subtitles': TranslateSubtitles,
  'fix-subtitles': FixSubtitles,
  'burn-subtitles': BurnSubtitles,
  'compress-video': CompressVideo,
  'batch-process': BatchProcess,
  'voice-to-text': VoiceRecorder,
}

const PRIMARY_CTA_BY_INTENT_CLASS = {
  converter: 'Upload file now',
  generator: 'Generate in X minutes',
  comparisonAlternative: 'See side-by-side + try free',
  howTo: 'Use the exact workflow now',
} as const

const PRIMARY_TOOL_PATH_BY_KEY: Record<SeoToolKey, string> = {
  'video-to-transcript': '/video-to-transcript',
  'video-to-subtitles': '/video-to-subtitles',
  'translate-subtitles': '/translate-subtitles',
  'fix-subtitles': '/fix-subtitles',
  'burn-subtitles': '/burn-subtitles',
  'compress-video': '/compress-video',
  'batch-process': '/batch-process',
  'voice-to-text': '/voice-recorder',
}

function getIntentClass(intentKey: string, toolKey: SeoToolKey): keyof typeof PRIMARY_CTA_BY_INTENT_CLASS {
  const normalizedIntent = intentKey.toLowerCase()
  if (/(comparison|compare|versus|\bvs\b|alternative|alternatives)/.test(normalizedIntent)) {
    return 'comparisonAlternative'
  }
  if (/(how-to|howto|tutorial|workflow|step-by-step|guide)/.test(normalizedIntent)) {
    return 'howTo'
  }
  if (/(generator|summarizer|creator)/.test(normalizedIntent)) {
    return 'generator'
  }
  if (/(converter|convert|to-|transcribe|transcript|subtitle|translation|compress|fix)/.test(normalizedIntent)) {
    return 'converter'
  }

  if (toolKey === 'video-to-transcript' || toolKey === 'video-to-subtitles') return 'generator'
  if (toolKey === 'voice-to-text' || toolKey === 'batch-process') return 'howTo'
  if (toolKey === 'translate-subtitles' || toolKey === 'fix-subtitles' || toolKey === 'burn-subtitles' || toolKey === 'compress-video') return 'converter'
  return 'converter'
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <p className="text-violet-600 font-medium">Loading…</p>
    </div>
  )
}

export default function SeoToolPage() {
  const { pathname } = useLocation()
  const entry = getSeoEntry(pathname)

  if (!entry) {
    return <NotFound />
  }

  const Tool = TOOL_MAP[entry.toolKey]
  if (!Tool) {
    return <NotFound />
  }

  const related = getRelatedSuggestionsForEntry(entry)
  const suggestions = related.map(({ path, title }) => ({
    icon: FileText,
    title,
    path,
  }))

  const toolProps: Record<string, unknown> = {
    seoH1: entry.h1,
    seoIntro: entry.intro,
    faq: entry.faq,
    seoDeepContent: entry.deepContent,
  }
  if (entry.toolKey === 'video-to-subtitles' && entry.tutorialContent) {
    toolProps.seoTutorial = entry.tutorialContent
  }
  if (entry.toolKey === 'video-to-transcript' && entry.defaultInputMode === 'youtube') {
    toolProps.defaultInputMode = 'youtube'
  }

  const intentClass = getIntentClass(entry.intentKey, entry.toolKey)
  const primaryCtaText = PRIMARY_CTA_BY_INTENT_CLASS[intentClass]
  const primaryCtaPath = resolveInternalLinkPath(PRIMARY_TOOL_PATH_BY_KEY[entry.toolKey])

  return (
    <div className="min-h-screen">
      <Suspense fallback={<RouteFallback />}>
        <Tool {...toolProps} />
      </Suspense>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-900">Ready to run this workflow?</p>
            <p className="text-xs text-violet-700">Primary CTA is mapped from intent class ({intentClass.replace('comparisonAlternative', 'comparison/alternative')}).</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              to={primaryCtaPath}
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {primaryCtaText}
            </Link>
            <Link
              to="/samples"
              className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            >
              View samples
            </Link>
          </div>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12">
          <CrossToolSuggestions suggestions={suggestions} />
        </div>
      )}
    </div>
  )
}
