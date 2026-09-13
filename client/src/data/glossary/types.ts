export type GlossaryCluster =
  | 'transcription-asr'
  | 'captions-subtitles'
  | 'formats'
  | 'speakers'
  | 'timing'
  | 'localization'
  | 'accessibility'
  | 'quality'
  | 'video-audio-workflow'

export type GlossaryStatus = 'published' | 'draft'

export const CLUSTER_LABELS: Record<GlossaryCluster, string> = {
  'transcription-asr': 'Transcription & ASR',
  'captions-subtitles': 'Captions & subtitles',
  formats: 'Formats',
  speakers: 'Speakers',
  timing: 'Timing',
  localization: 'Localization',
  accessibility: 'Accessibility',
  quality: 'Quality',
  'video-audio-workflow': 'Video & audio workflows',
}

export interface GlossaryInventoryRow {
  term: string
  slug: string
  cluster: GlossaryCluster
  definitionIntent: string
  searchDemandIfKnown: string
  commercialRelevance: number
  entityCentrality: number
  internalLinkValue: number
  sourceConfidence: number
  existingPageConflict: string
  priority: number
  status: GlossaryStatus
}

export interface GlossarySection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface GlossaryPublishedContent {
  slug: string
  h1: string
  definition: string
  metaTitle: string
  metaDescription: string
  takeaways: string[]
  sections: GlossarySection[]
  faqs?: { q: string; a: string }[]
  relatedTerms: string[]
  relatedTools: { path: string; label: string }[]
  sources: { organization: string; title: string; url: string }[]
  publishedAt: string
  updatedAt: string
}

export type GlossaryTerm = GlossaryInventoryRow & GlossaryPublishedContent
