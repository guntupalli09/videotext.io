import { getRetainedStatistics } from './statistics'

export const CITATION_HUB_PATH = '/transcription-statistics'
export const CITATION_HUB_PUBLISHED_AT = '2026-09-13'
export const CITATION_HUB_UPDATED_AT = '2026-09-13'
export const CITATION_HUB_AUTHOR = 'VideoText editorial team'

export function getCitationHubCount(): number {
  return getRetainedStatistics().length
}

export function getCitationHubTitle(): string {
  const n = getCitationHubCount()
  return `Transcription Statistics: ${n} Facts, Trends & Benchmarks for 2026`
}

export function getCitationHubMetaTitle(): string {
  const n = getCitationHubCount()
  return `Transcription Statistics: ${n} Facts (2026)`
}

export function getCitationHubDescription(): string {
  const n = getCitationHubCount()
  return `A sourced reference of ${n} transcription, caption, accessibility, podcast, and speech-recognition statistics. Each number links to the original organization or study.`
}

export function getCitationHubH1(): string {
  return getCitationHubTitle()
}
