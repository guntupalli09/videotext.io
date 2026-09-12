import type { GuidelinePresetKey } from '../pages/guidelineFormatPresetData'

/** Map a brand guideline SEO path to a Guideline Format preset key. */
export function presetForGuidelinePage(pathname: string): GuidelinePresetKey | null {
  const slug = pathname.replace(/^\//, '')
  if (slug.startsWith('gotranscript')) return 'gotranscript'
  if (slug.startsWith('rev-')) return 'rev'
  if (slug.startsWith('transcribeme')) return 'transcribeme'
  if (slug.startsWith('scribie')) return 'scribie'
  return null
}

export type GuidelineCtaSourcePage = '/' | '/gotranscript-guidelines' | '/gotranscript-test-guide' | string

/** In-app URL for the Guideline Format tool with preset + campaign UTMs. */
export function buildGuidelineFormatCtaUrl(options: {
  sourcePage: GuidelineCtaSourcePage
  preset?: GuidelinePresetKey | null
}): string {
  const params = new URLSearchParams()
  const preset = options.preset ?? presetForGuidelinePage(options.sourcePage)
  if (preset) params.set('preset', preset)
  params.set('utm_source', options.sourcePage === '/' ? 'home' : options.sourcePage.replace(/^\//, ''))
  params.set('utm_medium', 'guideline_cta')
  params.set('utm_campaign', 'guideline_format_tool')
  return `/guideline-format?${params.toString()}`
}
