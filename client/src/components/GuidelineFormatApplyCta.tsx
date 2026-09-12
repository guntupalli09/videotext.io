import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import { buildGuidelineFormatCtaUrl, presetForGuidelinePage } from '../lib/guidelineFormatCta'
import type { GuidelinePresetKey } from '../pages/guidelineFormatPresetData'
import { trackEvent } from '../lib/analytics'

type Props = {
  sourcePage: string
  brandName: string
  preset?: GuidelinePresetKey | null
  /** Short label for the platform preset, e.g. "GoTranscript" */
  presetLabel?: string
}

/**
 * Post-answer CTA: placed after the first substantive rule block on guideline pages.
 * Links to /guideline-format with preset pre-selected and campaign UTMs for attribution.
 */
export default function GuidelineFormatApplyCta({
  sourcePage,
  brandName,
  preset: presetProp,
  presetLabel,
}: Props) {
  const preset = presetProp ?? presetForGuidelinePage(sourcePage)
  const href = buildGuidelineFormatCtaUrl({ sourcePage, preset })
  const platform = presetLabel ?? brandName

  return (
    <aside
      className="rounded-2xl border-2 border-blue-400/80 bg-gradient-to-br from-blue-50 to-white p-5 dark:border-blue-600/60 dark:from-blue-950/30 dark:to-gray-950"
      aria-label={`Apply ${platform} rules with Guideline Format`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
        Apply this rule to your file
      </p>
      <p className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
        Format your transcript to {platform} guidelines in one pass
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {preset
          ? `${platform} preset loads automatically — paste or upload your transcript and run the formatter. Free: 3 imports/mo, no card.`
          : 'Open Guideline Format, pick your client preset, paste or upload your transcript. Free: 3 imports/mo, no card.'}
      </p>
      <Link
        to={href}
        onClick={() => {
          try {
            trackEvent('guideline_cta_clicked', {
              source_page: sourcePage,
              destination: href,
              preset: preset ?? undefined,
            })
          } catch {
            /* non-blocking */
          }
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl"
      >
        <Zap className="h-4 w-4" aria-hidden />
        {preset ? `Open Guideline Format — ${platform} preset` : 'Open Guideline Format'}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </aside>
  )
}
