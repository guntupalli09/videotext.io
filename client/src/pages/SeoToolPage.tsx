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
import MoneyPagesCta from '../components/MoneyPagesCta'
import NotFound from './NotFound'
import { resolveInternalLinkPath } from '../lib/primaryUrls'
import { getContextualCta, getRouteFamily, getWorkflowStageCtas } from '../lib/routeFamilyTemplates'

// Lazy-load core tools so only the needed one is loaded for each SEO URL
const VideoToTranscript = lazy(() => import('./VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./VideoToSubtitles'))
const TranslateSubtitles = lazy(() => import('./TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./FixSubtitles'))
const BurnSubtitles = lazy(() => import('./BurnSubtitles'))
const CompressVideo = lazy(() => import('./CompressVideo'))
const BatchProcess = lazy(() => import('./BatchProcess'))
const VoiceRecorder = lazy(() => import('./VoiceRecorder'))
const BrandGuidelinePage = lazy(() => import('./BrandGuidelinePage'))

const TOOL_MAP: Record<SeoToolKey, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'video-to-transcript': VideoToTranscript,
  'video-to-subtitles': VideoToSubtitles,
  'translate-subtitles': TranslateSubtitles,
  'fix-subtitles': FixSubtitles,
  'burn-subtitles': BurnSubtitles,
  'compress-video': CompressVideo,
  'batch-process': BatchProcess,
  'voice-to-text': VoiceRecorder,
  'brand-guideline': BrandGuidelinePage,
}

const PRIMARY_TOOL_PATH_BY_KEY: Record<SeoToolKey, string> = {
  'video-to-transcript': '/video-to-transcript',
  'video-to-subtitles': '/video-to-subtitles',
  'translate-subtitles': '/translate-subtitles',
  'fix-subtitles': '/fix-subtitles',
  'burn-subtitles': '/burn-subtitles',
  'compress-video': '/compress-video',
  'batch-process': '/batch-process',
  'voice-to-text': '/voice-recorder',
  'brand-guideline': '/guideline-format',
}

function getIntentClass(intentKey: string, toolKey: SeoToolKey): 'converter' | 'generator' | 'comparisonAlternative' | 'howTo' {
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
      <p className="text-blue-600 font-medium">Loading…</p>
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
  const routeFamily = getRouteFamily(pathname)
  const ctaIntent = intentClass === 'comparisonAlternative' ? 'switching' : intentClass === 'howTo' ? 'cleanup' : intentClass
  const contextualPrimaryCta = getContextualCta(routeFamily, pathname, 'hero', ctaIntent)
  const primaryCtaText = contextualPrimaryCta.text
  const primaryCtaPath = resolveInternalLinkPath(contextualPrimaryCta.path || PRIMARY_TOOL_PATH_BY_KEY[entry.toolKey])
  const stageCtas = getWorkflowStageCtas(routeFamily, pathname).slice(0, 2)

  return (
    <div className="min-h-screen">
      <Suspense fallback={<RouteFallback />}>
        <Tool {...toolProps} />
      </Suspense>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Workflow-native next step</p>
            <p className="text-xs text-blue-700">CTA selected from route family ({routeFamily}) and intent ({intentClass.replace('comparisonAlternative', 'comparison/alternative')}).</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Link
              to={primaryCtaPath}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {primaryCtaText}
            </Link>
            {stageCtas.map((cta) => (
              <Link
                key={`${cta.stage}-${cta.text}`}
                to={resolveInternalLinkPath(cta.path)}
                className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                {cta.text}
              </Link>
            ))}
          </div>
        </div>
        {intentClass === 'comparisonAlternative' && (
          <div className="mt-4">
            <MoneyPagesCta
              title="Best next step after this comparison"
              description="Jump straight into the core workflows used by customers to create transcript and subtitle outputs."
              className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 text-sm"
            />
          </div>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12">
          <CrossToolSuggestions suggestions={suggestions} />
        </div>
      )}
    </div>
  )
}
