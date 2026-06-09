import { SITE_METRICS } from './siteMetrics'

/** Keep in sync with Open page hero copy. */
export const OPEN_STATS_LAST_UPDATED = SITE_METRICS.lastVerified

/** Teaser line items for strips (subset of /open “At a glance”). */
export const OPEN_STATS_STRIP = [
  { value: SITE_METRICS.wordAccuracy, label: 'Word accuracy', note: 'Clear audio, Whisper large-v3' },
  { value: SITE_METRICS.videosTranscribed, label: 'Videos transcribed', note: 'Cumulative' },
  { value: '0', label: 'Files kept', note: 'Deleted after processing' },
] as const
