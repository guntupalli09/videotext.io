export const CITATION_HUB_VERIFIED_AT = '2026-09-13'

export type StatisticTier = 1 | 2 | 3

export type StatisticStatus = 'retained' | 'rejected'

export type StatisticCategory =
  | 'hearing-loss-and-caption-audience'
  | 'captioning-and-accessibility-practice'
  | 'broadcast-and-legal-captioning'
  | 'video-consumption'
  | 'podcasts-and-spoken-word'
  | 'ai-speech-recognition'
  | 'speech-datasets'
  | 'education'
  | 'workplace-and-live-video'
  | 'localization'
  | 'screen-readers-and-web-access'
  | 'rejected-unverified'

export interface StatisticCandidate {
  id: string
  status: StatisticStatus
  category: StatisticCategory
  claim: string
  value?: string
  context?: string
  sourceOrganization?: string
  sourceTitle?: string
  sourceUrl?: string
  publicationDate?: string
  publicationDateUnavailableReason?: string
  dataPeriod?: string
  geography?: string
  sampleSize?: string
  methodologyNote?: string
  caveat?: string
  verifiedAt?: string
  tier?: StatisticTier
  rejectReason?: string
}

export const CATEGORY_LABELS: Record<StatisticCategory, string> = {
  'hearing-loss-and-caption-audience': 'Hearing loss and the audience for captions',
  'captioning-and-accessibility-practice': 'Captioning and accessibility practice',
  'broadcast-and-legal-captioning': 'Broadcast rules and legal captioning requirements',
  'video-consumption': 'Video consumption',
  'podcasts-and-spoken-word': 'Podcasts and spoken-word media',
  'ai-speech-recognition': 'AI speech recognition accuracy',
  'speech-datasets': 'Speech datasets and research corpora',
  education: 'Education',
  'workplace-and-live-video': 'Workplace and live video',
  localization: 'Localization and translation',
  'screen-readers-and-web-access': 'Screen readers and web accessibility',
  'rejected-unverified': 'Rejected during verification',
}

export const CATEGORY_ORDER: StatisticCategory[] = [
  'hearing-loss-and-caption-audience',
  'captioning-and-accessibility-practice',
  'broadcast-and-legal-captioning',
  'video-consumption',
  'podcasts-and-spoken-word',
  'ai-speech-recognition',
  'speech-datasets',
  'education',
  'workplace-and-live-video',
  'localization',
  'screen-readers-and-web-access',
]
