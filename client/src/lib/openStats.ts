/** Keep in sync with Open page hero copy. */
export const OPEN_STATS_LAST_UPDATED = 'March 14, 2026'

/** Teaser line items for strips (subset of /open “At a glance”). */
export const OPEN_STATS_STRIP = [
  { value: '98.5%', label: 'Word accuracy', note: 'Clear audio, Whisper large-v3' },
  { value: '127,000+', label: 'Videos transcribed', note: 'Cumulative' },
  { value: '0', label: 'Files kept', note: 'Deleted after processing' },
] as const
